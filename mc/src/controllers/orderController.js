const orderModel = require("../models/orderModel");

const VALID_PAYMENT_METHODS = ["cash", "credit", "qr"];

exports.createOrder = async (req, res) => {
  const { items, paymentMethod } = req.body;

  // 1. ตรวจสอบว่ามีรายการสินค้าหรือไม่ (AC-01)
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "ต้องมีรายการสินค้าอย่างน้อย 1 รายการ" });
  }

  // 2. ตรวจสอบชื่อสินค้าว่าครบถ้วนและถูกต้องหรือไม่ (AC-02)
  const hasInvalidName = items.some(
    (item) => typeof item.name !== "string" || item.name.trim() === "",
  );
  if (hasInvalidName) {
    return res.status(400).json({ error: "ต้องระบุชื่อสินค้าให้ครบทุกรายการ" });
  }

  // 3. ตรวจสอบราคาสินค้าว่าสมเหตุสมผลหรือไม่ (> 0) (AC-03)
  const hasInvalidPrice = items.some(
    (item) => !Number.isFinite(item.price) || item.price <= 0,
  );
  if (hasInvalidPrice) {
    return res.status(400).json({ error: "ราคาสินค้า (price) ต้องมากกว่า 0" });
  }

  // 4. ตรวจสอบจำนวนสินค้าว่าเป็นจำนวนเต็มและ > 0 หรือไม่ (AC-04)
  const hasInvalidQuantity = items.some(
    (item) => !Number.isInteger(item.quantity) || item.quantity <= 0,
  );
  if (hasInvalidQuantity) {
    return res.status(400).json({ error: "จำนวนสินค้า (quantity) ต้องมากกว่า 0" });
  }

  // 5. ตรวจสอบช่องทางการชำระเงิน
  if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
    return res.status(400).json({ error: "paymentMethod ไม่ถูกต้องหรือไม่ได้ระบุ" });
  }

  // 6. คำนวณยอดรวม (คำนวณฝั่ง Backend เสมอ) (AC-05)
  const totalAmount = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  // 7. บันทึกข้อมูลลงฐานข้อมูล
  try {
    const orderId = await orderModel.create(paymentMethod, totalAmount);
    res.status(201).json({ orderId, totalAmount, message: "สร้างออเดอร์สำเร็จ" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกออเดอร์" });
  }
};

