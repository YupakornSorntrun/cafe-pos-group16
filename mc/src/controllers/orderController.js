const orderModel = require("../models/orderModel");
const menuModel = require("../models/menuModel");

const VALID_PAYMENT_METHODS = ["cash", "credit", "qr"];
const VALID_ORDER_TYPES = ["dine_in", "takeaway"];

exports.createOrder = async (req, res) => {
  // ดึงตัวแปรออกจาก req.body (Object Destructuring) 
  // เทียบเท่ากับ const branchId = req.body.branchId; 
  const { 
    branchId, 
    employeeId, 
    orderType, 
    tableNumber, 
    paymentMethod, 
    discountAmount = 0, // ถ้าไม่ได้ส่งส่วนลดมา ให้ค่าเริ่มต้นเป็น 0
    amountReceived, 
    items 
  } = req.body;

  // 1. Validate basic inputs
  if (!Number.isInteger(branchId) || branchId <= 0) return res.status(400).json({ error: "ต้องระบุ branchId" });
  if (!Number.isInteger(employeeId) || employeeId <= 0) return res.status(400).json({ error: "ต้องระบุ employeeId" });
  if (!VALID_ORDER_TYPES.includes(orderType)) return res.status(400).json({ error: "ต้องระบุ orderType (dine_in/takeaway)" });
  if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) return res.status(400).json({ error: "paymentMethod ไม่ถูกต้อง" });
  if (amountReceived == null || amountReceived < 0) return res.status(400).json({ error: "ต้องระบุ amountReceived" });
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "ต้องมีรายการสินค้าอย่างน้อย 1 รายการ" });

  // BR-02: การรวมเมนูที่สั่งซ้ำ (Group Items)
  // สร้าง Object ว่างๆ เพื่อเก็บเมนู โดยใช้ menuId เป็น Key
  const groupedItemsMap = {};
  for (const item of items) { // วนลูป (Loop) ดูรายการสินค้าทีละชิ้น
    if (!Number.isInteger(item.menuId) || item.menuId <= 0) return res.status(400).json({ error: "menuId ไม่ถูกต้อง" });
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) return res.status(400).json({ error: "quantity ต้องมากกว่า 0" });
    
    // ถ้าเคยเจอเมนูนี้แล้ว ให้เอาจำนวน (quantity) บวกเพิ่มเข้าไป
    if (groupedItemsMap[item.menuId]) {
      groupedItemsMap[item.menuId].quantity += item.quantity;
    } else {
      // ถ้าเพิ่งเคยเจอครั้งแรก ให้สร้างรายการใหม่
      groupedItemsMap[item.menuId] = { menuId: item.menuId, quantity: item.quantity };
    }
  }
  // แปลง Object กลับมาเป็น Array เพื่อเอาไปใช้งานต่อ
  const finalItems = Object.values(groupedItemsMap);

  try {
    let subtotalAmount = 0;
    const requiredIngredients = {};

    // 2. ตรวจสอบเมนู คำนวณราคาจาก DB โดยตรง และคำนวณวัตถุดิบทั้งหมดที่ต้องใช้
    for (const item of finalItems) {
      const menu = await menuModel.findByIdAndBranchId(item.menuId, branchId);
      if (!menu) {
        return res.status(400).json({ error: `ไม่พบเมนูรหัส ${item.menuId} ในสาขานี้` });
      }
      
      item.price = menu.price;
      subtotalAmount += menu.price * item.quantity;

      const ingredients = await menuModel.findIngredientsByMenuId(item.menuId);
      for (const ing of ingredients) {
        const totalNeeded = ing.quantity_used * item.quantity;
        if (requiredIngredients[ing.ingredient_id]) {
          requiredIngredients[ing.ingredient_id].needed += totalNeeded;
        } else {
          requiredIngredients[ing.ingredient_id] = {
            ingredientId: ing.ingredient_id,
            name: ing.ingredient_name,
            needed: totalNeeded,
            stock: ing.stock_quantity,
            threshold: ing.low_stock_threshold
          };
        }
      }
    }

    const totalAmount = subtotalAmount - discountAmount;
    if (amountReceived < totalAmount) {
      return res.status(400).json({ error: "จำนวนเงินที่รับมาไม่พอ" });
    }
    const changeAmount = amountReceived - totalAmount;

    // BR-01: ตรวจสอบสต็อกก่อนเปิด Transaction
    const missingIngredients = [];
    
    // Object.entries คือการวนลูปดึงทั้ง Key(id) และ Value(ing) ออกมาจาก Object
    for (const [id, ing] of Object.entries(requiredIngredients)) {
      if (ing.needed > ing.stock) {
        missingIngredients.push(ing.name); // ถ้าของไม่พอ ให้เอาชื่อวัตถุดิบใส่ลงใน Array
      }
    }

    if (missingIngredients.length > 0) {
      return res.status(400).json({ 
        error: `วัตถุดิบไม่เพียงพอ: ${missingIngredients.join(", ")}` 
      });
    }

    // BR-03: เปิด Database Transaction เพื่อความปลอดภัยของข้อมูล
    const conn = await orderModel.getConnection();
    await conn.beginTransaction();

    let orderId;
    let queueNo;
    let receipt;
    let lowStockWarnings = [];

    try {
      // 3. บันทึกออเดอร์ (ไม่เก็บค่า total_amount และอื่นๆ ที่เป็น Derived Value แล้ว)
      queueNo = await orderModel.nextQueueNo(conn, branchId);
      orderId = await orderModel.createOrder(
        conn, branchId, employeeId, orderType, tableNumber, paymentMethod,
        discountAmount, amountReceived, queueNo
      );

      // 4. บันทึกไอเทมของออเดอร์
      for (const item of finalItems) {
        await orderModel.createOrderItem(conn, orderId, item.menuId, item.quantity, item.price);
      }

      // 5. ตัดสต็อกและบันทึกความเคลื่อนไหว
      // วนลูปวัตถุดิบที่ต้องใช้ เพื่อตัดสต็อกทีละตัว
      for (const [id, ing] of Object.entries(requiredIngredients)) {
        await orderModel.updateStockAndRecordMovement(conn, ing.ingredientId, ing.needed, orderId);
        
        // BR-04: ตรวจสอบว่าหลังตัดสต็อกแล้วต่ำกว่าเกณฑ์แจ้งเตือนหรือไม่
        if (ing.stock - ing.needed <= ing.threshold) {
          lowStockWarnings.push(ing.name);
        }
      }

      // 6. ออกใบเสร็จ
      receipt = await orderModel.createReceipt(conn, orderId);

      // สำเร็จทั้งหมด -> COMMIT
      await conn.commit();
    } catch (txError) {
      // มีข้อผิดพลาด -> ROLLBACK
      await conn.rollback();
      throw txError;
    } finally {
      // คืน connection กลับสู่ pool
      conn.release();
    }

    // 7. ตอบกลับหน้าบ้าน
    res.status(201).json({
      status: "success",
      message: "Order successfully created",
      data: {
        orderId,
        queueNo,
        totalAmount,
        changeAmount,
        receiptId: receipt.receiptId,
        lowStockWarnings: lowStockWarnings.length > 0 ? lowStockWarnings : undefined
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกออเดอร์" });
  }
};

exports.getAllOrders = async (req, res) => {
  const branchId = parseInt(req.query.branchId, 10);
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const { from, to } = req.query;
  if ((from && !datePattern.test(from)) || (to && !datePattern.test(to))) {
    return res.status(400).json({ error: "รูปแบบวันที่ต้องเป็น YYYY-MM-DD" });
  }

  // แคชเชียร์เห็นเฉพาะออเดอร์ของวันนี้ (เวลาไทย) ในสาขาตัวเอง
  // เจ้าของกรองตามสาขา/วันที่ที่ส่งมา | แคชเชียร์ถูกบังคับเป็น "สาขาตัวเอง + วันนี้" เสมอ (กำหนดที่ server ไม่เชื่อค่าจากหน้าเว็บ)
  const filters = { branchId: branchId > 0 ? branchId : undefined, from, to };
  if (req.user.role === "cashier") {
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
    Object.assign(filters, { branchId: req.user.branchId, from: today, to: today });
  }

  try {
    const orders = await orderModel.findAll(filters);
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลออเดอร์" });
  }
};

exports.getOrderById = async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  if (Number.isNaN(orderId) || orderId <= 0) {
    return res.status(400).json({ error: "ID ของออเดอร์ไม่ถูกต้อง" });
  }
  try {
    const order = await orderModel.findDetail(orderId);
    if (!order || (req.user.role === "cashier" && order.branch_id !== req.user.branchId)) {
      return res.status(404).json({ error: "ไม่พบออเดอร์" });
    }
    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลออเดอร์" });
  }
};

// ยกเลิก (void) ออเดอร์
//  - เจ้าของ: ยกเลิกได้ทุกออเดอร์
//  - แคชเชียร์: เฉพาะออเดอร์สาขาตัวเองที่บาริสต้ายังไม่เริ่มทำ (pending)
//  - คืนสต็อกเฉพาะออเดอร์ที่ยังไม่เริ่มทำ (ถ้าทำไปแล้ว วัตถุดิบถูกใช้จริง)
exports.deleteOrder = async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  if (Number.isNaN(orderId) || orderId <= 0) {
    return res.status(400).json({ error: "ID ของออเดอร์ไม่ถูกต้อง" });
  }
  // isCashier: ใช้แยกกติกา — แคชเชียร์ถูกจำกัดสาขาและสถานะออเดอร์ที่ยกเลิกได้
  const isCashier = req.user.role === "cashier";

  try {
    const order = await orderModel.findById(orderId);
    if (!order || (isCashier && order.branch_id !== req.user.branchId)) {
      return res.status(404).json({ error: "ไม่พบออเดอร์ที่ต้องการยกเลิก" });
    }

    const orderItems = await orderModel.findOrderItems(orderId);
    const ingredientsToRestore = {};
    for (const item of orderItems) {
      const ingredients = await menuModel.findIngredientsByMenuId(item.menu_id);
      for (const ing of ingredients) {
        ingredientsToRestore[ing.ingredient_id] =
          (ingredientsToRestore[ing.ingredient_id] || 0) + ing.quantity_used * item.quantity;
      }
    }

    const conn = await orderModel.getConnection();
    await conn.beginTransaction();
    // restored = ครั้งนี้คืนวัตถุดิบเข้าสต็อกหรือไม่ (คืนเฉพาะออเดอร์ที่บาริสต้ายังไม่เริ่มทำ)
    let restored = false;
    try {
      // ล็อกแถวแล้วตรวจสถานะซ้ำ กัน race กับบาริสต้า/การยกเลิกซ้ำ
      const locked = await orderModel.lockStatus(conn, orderId);
      if (locked.payment_status === "voided") {
        await conn.rollback();
        return res.status(400).json({ error: "ออเดอร์นี้ถูกยกเลิกไปแล้ว (ไม่สามารถยกเลิกซ้ำได้)" });
      }
      if (isCashier && locked.barista_status !== "pending") {
        await conn.rollback();
        return res.status(409).json({ error: "บาริสต้าเริ่มทำออเดอร์นี้แล้ว แคชเชียร์ยกเลิกไม่ได้ — กรุณาแจ้งเจ้าของร้าน" });
      }
      restored = locked.barista_status === "pending";
      if (restored) {
        for (const [ingId, qty] of Object.entries(ingredientsToRestore)) {
          await orderModel.restoreStockAndRecordMovement(conn, ingId, qty, orderId);
        }
      }
      await orderModel.voidOrder(conn, orderId);
      await conn.commit();
    } catch (txError) {
      await conn.rollback();
      throw txError;
    } finally {
      conn.release();
    }

    res.status(200).json({
      message: restored
        ? "ยกเลิกออเดอร์และคืนสต็อกเรียบร้อยแล้ว"
        : "ยกเลิกออเดอร์แล้ว (เริ่มทำไปแล้ว จึงไม่คืนสต็อก)",
      stockRestored: restored,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการยกเลิกออเดอร์" });
  }
};
