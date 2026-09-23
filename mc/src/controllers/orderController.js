const orderModel = require("../models/orderModel");

const VALID_PAYMENT_METHODS = ["cash", "credit", "qr"];

exports.createOrder = async (req, res) => {
  const { branchId, employeeId, items, paymentMethod } = req.body;

  // 1. ตรวจสอบ branchId และ employeeId
  if (!Number.isInteger(branchId) || branchId <= 0) {
    return res.status(400).json({ error: "branchId ต้องเป็นจำนวนเต็มที่มากกว่า 0" });
  }
  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    return res.status(400).json({ error: "employeeId ต้องเป็นจำนวนเต็มที่มากกว่า 0" });
  }

  // 2. ตรวจสอบว่ามีรายการสินค้าหรือไม่ (AC-01 ของ US-01)
  if (!Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({ error: "ต้องมีรายการสินค้าอย่างน้อย 1 รายการ" });
  }

  // 3. ตรวจสอบว่าแต่ละ item มี menuId ถูกต้อง
  const hasInvalidMenuId = items.some(
    (item) => !Number.isInteger(item.menuId) || item.menuId <= 0,
  );
  if (hasInvalidMenuId) {
    return res.status(400).json({ error: "ต้องระบุ menuId ที่ถูกต้องให้ครบทุกรายการ" });
  }

  // 4. ตรวจสอบราคาสินค้าว่าสมเหตุสมผลหรือไม่ (> 0) (AC-03 ของ US-01)
  const hasInvalidPrice = items.some(
    (item) => !Number.isFinite(item.price) || item.price <= 0,
  );
  if (hasInvalidPrice) {
    return res.status(400).json({ error: "ราคาสินค้า (price) ต้องมากกว่า 0" });
  }

  // 5. ตรวจสอบจำนวนสินค้าว่าเป็นจำนวนเต็มและ > 0 หรือไม่ (AC-04 ของ US-01)
  const hasInvalidQuantity = items.some(
    (item) => !Number.isInteger(item.quantity) || item.quantity <= 0,
  );
  if (hasInvalidQuantity) {
    return res
      .status(400)
      .json({ error: "จำนวนสินค้า (quantity) ต้องมากกว่า 0" });
  }

  // 6. ตรวจสอบช่องทางการชำระเงิน
  if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
    return res
      .status(400)
      .json({ error: "paymentMethod ไม่ถูกต้องหรือไม่ได้ระบุ" });
  }

  // 7. คำนวณยอดรวม (คำนวณฝั่ง Backend เสมอ) (AC-05 ของ US-01)
  const totalAmount = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  // 8. บันทึกข้อมูลลงฐานข้อมูล
  try {
    // สร้าง order พร้อม branchId และ employeeId ตาม schema
    const orderId = await orderModel.create(branchId, employeeId, paymentMethod, totalAmount);

    // สร้าง order_items — unit_price เป็น snapshot ราคา ณ เวลาสั่ง
    for (const item of items) {
      await orderModel.createOrderItem(orderId, item.menuId, item.quantity, item.price);
    }

    res
      .status(201)
      .json({ orderId, totalAmount, message: "สร้างออเดอร์สำเร็จ" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกออเดอร์" });
  }
};

exports.getAllOrders = async (req, res) => {
  const orders = await orderModel.findAll();
  res.json(orders);
};

exports.deleteOrder = async (req, res) => {
  const orderId = parseInt(req.params.id, 10);

  if (Number.isNaN(orderId) || orderId <= 0) {
    return res.status(400).json({ error: "ID ของออเดอร์ไม่ถูกต้อง" });
  }

  try {
    const affectedRows = await orderModel.deleteOrder(orderId);

    if (affectedRows === 0) {
      return res.status(404).json({ error: "ไม่พบออเดอร์ที่ต้องการลบ" });
    }

    res.status(200).json({ message: "ลบออเดอร์ออกจากระบบสำเร็จ" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบออเดอร์" });
  }
};

exports.deleteOrderItem = async (req, res) => {
  const orderId = parseInt(req.params.orderId, 10);
  const itemId = parseInt(req.params.itemId, 10);

  if (Number.isNaN(orderId) || orderId <= 0 || Number.isNaN(itemId) || itemId <= 0) {
    return res.status(400).json({ error: "ID ของออเดอร์หรือไอเทมไม่ถูกต้อง" });
  }

  try {
    const affectedRows = await orderModel.deleteOrderItem(orderId, itemId);
    
    if (affectedRows === 0) {
      return res.status(404).json({ error: "ไม่พบรายการสินค้าที่ต้องการลบในออเดอร์นี้" });
    }

    res.status(200).json({ message: "ลบรายการสินค้าออกจากออเดอร์สำเร็จ พร้อมอัปเดตยอดเงินแล้ว" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบรายการสินค้า" });
  }
};
