const db = require("../config/db");

// ---------- CREATE ----------
// สร้าง order ใหม่ พร้อม branch, employee, payment info
exports.create = async (branchId, employeeId, paymentMethod, totalAmount) => {
  const [result] = await db.query(
    `INSERT INTO orders (branch_id, employee_id, payment_method, payment_status, total_amount, created_at)
     VALUES (?, ?, ?, 'unpaid', ?, NOW())`,
    [branchId, employeeId, paymentMethod, totalAmount],
  );
  return result.insertId;
};

// ---------- READ ----------
// ดึง order ทั้งหมด
exports.findAll = async () => {
  const [rows] = await db.query(
    `SELECT order_id, branch_id, employee_id, payment_method,
            payment_status, total_amount, created_at
     FROM orders`,
  );
  return rows;
};

// ดึง order ตาม order_id
exports.findById = async (orderId) => {
  const [rows] = await db.query(
    `SELECT order_id, branch_id, employee_id, payment_method,
            payment_status, total_amount, created_at
     FROM orders
     WHERE order_id = ?`,
    [orderId],
  );
  return rows[0] || null;
};

// ---------- UPDATE ----------
// อัปเดตสถานะการชำระเงิน
exports.updatePaymentStatus = async (orderId, paymentStatus) => {
  const [result] = await db.query(
    `UPDATE orders SET payment_status = ? WHERE order_id = ?`,
    [paymentStatus, orderId],
  );
  return result.affectedRows;
};

// =============================================================
// ORDER_ITEMS — จัดการรายการสินค้าในออเดอร์
// Field mapping ตรงกับ wk07-schema.sql:
//   order_item_id, order_id, menu_id, quantity, unit_price
// =============================================================

// สร้าง order_item (unit_price = snapshot ราคา ณ เวลาสั่งซื้อ)
exports.createOrderItem = async (orderId, menuId, quantity, unitPrice) => {
  const [result] = await db.query(
    `INSERT INTO order_items (order_id, menu_id, quantity, unit_price)
     VALUES (?, ?, ?, ?)`,
    [orderId, menuId, quantity, unitPrice],
  );
  return result.insertId;
};

// ดึง order_items ทั้งหมดของ order
exports.findOrderItems = async (orderId) => {
  const [rows] = await db.query(
    `SELECT order_item_id, order_id, menu_id, quantity, unit_price
     FROM order_items
     WHERE order_id = ?`,
    [orderId],
  );
  return rows;
};

// ลบรายการสินค้า 1 รายการออกจาก order (พร้อมหักลบยอดเงิน)
exports.deleteOrderItem = async (orderId, orderItemId) => {
  // 1. ดึงราคารวมของ item นี้ก่อนลบ
  const [items] = await db.query(
    "SELECT quantity, unit_price FROM order_items WHERE order_id = ? AND order_item_id = ?",
    [orderId, orderItemId]
  );
  
  if (items.length === 0) return 0; // ไม่พบรายการ

  const itemTotal = items[0].quantity * items[0].unit_price;

  // 2. ลบ item ออกจาก order_items
  await db.query(
    "DELETE FROM order_items WHERE order_id = ? AND order_item_id = ?",
    [orderId, orderItemId]
  );

  // 3. หักยอดเงินออกจากตาราง orders
  await db.query(
    "UPDATE orders SET total_amount = total_amount - ? WHERE order_id = ?",
    [itemTotal, orderId]
  );

  return 1; // ลบสำเร็จ
};

// ---------- DELETE ----------
// ลบ order ตาม order_id
// ต้องจัดการ FK ทั้งหมดที่ชี้มาที่ orders:
//   1. stock_movements.order_id → set NULL (เก็บประวัติการเคลื่อนไหวสต็อกไว้)
//   2. order_items.order_id → ลบทิ้ง
//   3. orders → ลบ
exports.deleteOrder = async (orderId) => {
  // ตัดความสัมพันธ์กับ stock_movements (set NULL เพราะ column เป็น nullable)
  await db.query(
    "UPDATE stock_movements SET order_id = NULL WHERE order_id = ?",
    [orderId],
  );
  // ลบ order_items
  await db.query("DELETE FROM order_items WHERE order_id = ?", [orderId]);
  // ลบ order
  const [result] = await db.query(
    "DELETE FROM orders WHERE order_id = ?",
    [orderId],
  );
  return result.affectedRows;
};
