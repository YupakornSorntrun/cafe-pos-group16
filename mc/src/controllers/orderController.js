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
    let receipt;
    let lowStockWarnings = [];

    try {
      // 3. บันทึกออเดอร์ (ไม่เก็บค่า total_amount และอื่นๆ ที่เป็น Derived Value แล้ว)
      orderId = await orderModel.createOrder(
        conn, branchId, employeeId, orderType, tableNumber, paymentMethod,
        discountAmount, amountReceived
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
  try {
    const orders = await orderModel.findAll();
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลออเดอร์" });
  }
};

exports.deleteOrder = async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  if (Number.isNaN(orderId) || orderId <= 0) {
    return res.status(400).json({ error: "ID ของออเดอร์ไม่ถูกต้อง" });
  }

  try {
    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "ไม่พบออเดอร์ที่ต้องการยกเลิก" });
    }
    if (order.payment_status === 'voided') {
      return res.status(400).json({ error: "ออเดอร์นี้ถูกยกเลิกไปแล้ว (ไม่สามารถยกเลิกซ้ำได้)" });
    }

    // หาส่วนผสมที่ต้องคืน
    const orderItems = await orderModel.findOrderItems(orderId);
    const ingredientsToRestore = {};
    for (const item of orderItems) {
      const ingredients = await menuModel.findIngredientsByMenuId(item.menu_id);
      for (const ing of ingredients) {
        const totalRestored = ing.quantity_used * item.quantity;
        if (ingredientsToRestore[ing.ingredient_id]) {
          ingredientsToRestore[ing.ingredient_id] += totalRestored;
        } else {
          ingredientsToRestore[ing.ingredient_id] = totalRestored;
        }
      }
    }

    // เริ่ม Transaction ลบออเดอร์ + คืนสต็อก
    const conn = await orderModel.getConnection();
    await conn.beginTransaction();
    try {
      for (const [ingId, qty] of Object.entries(ingredientsToRestore)) {
        await orderModel.restoreStockAndRecordMovement(conn, ingId, qty, orderId);
      }
      await orderModel.voidOrder(conn, orderId);
      await conn.commit();
    } catch (txError) {
      await conn.rollback();
      throw txError;
    } finally {
      conn.release();
    }

    res.status(200).json({ message: "ยกเลิกออเดอร์ (Void) และคืนสต็อกเรียบร้อยแล้ว" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการยกเลิกออเดอร์" });
  }
};
