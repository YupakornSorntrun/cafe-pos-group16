const db = require("../config/db");

// ---------- TRANSACTION HELPERS ----------
exports.getConnection = async () => {
  return await db.getConnection();
};

// ---------- CREATE ----------
// BR-03: ใช้ connection ที่เปิด Transaction
exports.createOrder = async (
  conn,
  branchId,
  employeeId,
  orderType,
  tableNumber,
  paymentMethod,
  discountAmount,
  amountReceived
) => {
  // const [result] = ... คือการทำ Array Destructuring
  // ปกติ mysql2 จะคืนค่ามา 2 อย่างคือ [ผลลัพธ์, ข้อมูลฟิลด์] เราแค่เอาตัวแรก (result) มาใช้
  const [result] = await conn.query(
    `INSERT INTO orders (branch_id, employee_id, order_type, table_number, payment_method, payment_status, discount_amount, amount_received, barista_status, created_at)
     VALUES (?, ?, ?, ?, ?, 'paid', ?, ?, 'pending', NOW())`,
    [
      branchId,
      employeeId,
      orderType,
      tableNumber || null,
      paymentMethod,
      discountAmount,
      amountReceived
    ]
  );
  return result.insertId;
};

exports.createOrderItem = async (conn, orderId, menuId, quantity, unitPrice) => {
  const [result] = await conn.query(
    `INSERT INTO order_items (order_id, menu_id, quantity, unit_price)
     VALUES (?, ?, ?, ?)`,
    [orderId, menuId, quantity, unitPrice]
  );
  return result.insertId;
};

// อัปเดตสต็อกและบันทึกความเคลื่อนไหว (Transaction เดียวกัน)
exports.updateStockAndRecordMovement = async (conn, ingredientId, quantityUsed, orderId) => {
  await conn.query(
    `UPDATE ingredients SET stock_quantity = stock_quantity - ? WHERE ingredient_id = ?`,
    [quantityUsed, ingredientId]
  );

  await conn.query(
    `INSERT INTO stock_movements (ingredient_id, order_id, quantity_change, reason, moved_at)
     VALUES (?, ?, ?, 'sale', NOW())`,
    [ingredientId, orderId, -quantityUsed]
  );
};

// คืนสต็อกและบันทึกความเคลื่อนไหว (Transaction เดียวกัน)
exports.restoreStockAndRecordMovement = async (conn, ingredientId, quantityRestored, orderId) => {
  await conn.query(
    `UPDATE ingredients SET stock_quantity = stock_quantity + ? WHERE ingredient_id = ?`,
    [quantityRestored, ingredientId]
  );

  // orderId ใส่เป็น NULL หรือ orderId เดิมก็ได้เพื่อให้รู้ประวัติ (ในที่นี้ใส่ NULL ตาม Schema เพื่อหลีกเลี่ยง constraint)
  await conn.query(
    `INSERT INTO stock_movements (ingredient_id, order_id, quantity_change, reason, moved_at)
     VALUES (?, NULL, ?, 'adjustment', NOW())`,
    [ingredientId, quantityRestored]
  );
};

exports.createReceipt = async (conn, orderId) => {
  const receiptNumber = `REC-${Date.now()}-${orderId}`;
  const [result] = await conn.query(
    `INSERT INTO receipts (order_id, receipt_number, printed_at) VALUES (?, ?, NOW())`,
    [orderId, receiptNumber]
  );
  return { receiptId: result.insertId, receiptNumber };
};

// ---------- READ ----------
// คำนวณ subtotal_amount, total_amount และ change_amount สดๆ ผ่านการ JOIN กับ order_items (ป้องการ update anomaly ตามหัวข้อ 3.2)
// COALESCE(..., 0) คือฟังก์ชันของ SQL เอาไว้ดักว่า "ถ้าค่าเป็น NULL ให้เปลี่ยนเป็นเลข 0 แทน" (กันพังเวลารายการสินค้าว่างเปล่า)
const ORDER_SELECT_QUERY = `
  SELECT 
    o.*, 
    COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS subtotal_amount,
    (COALESCE(SUM(oi.quantity * oi.unit_price), 0) - o.discount_amount) AS total_amount,
    (o.amount_received - (COALESCE(SUM(oi.quantity * oi.unit_price), 0) - o.discount_amount)) AS change_amount
  FROM orders o 
  LEFT JOIN order_items oi ON o.order_id = oi.order_id 
`;

exports.findAll = async () => {
  const [rows] = await db.query(ORDER_SELECT_QUERY + `GROUP BY o.order_id`);
  return rows;
};

exports.findById = async (orderId) => {
  const [rows] = await db.query(ORDER_SELECT_QUERY + `WHERE o.order_id = ? GROUP BY o.order_id`, [orderId]);
  return rows[0] || null;
};

exports.updatePaymentStatus = async (orderId, paymentStatus) => {
  const [result] = await db.query(
    `UPDATE orders SET payment_status = ? WHERE order_id = ?`,
    [paymentStatus, orderId]
  );
  return result.affectedRows;
};

// ดึงรายการสั่งซื้อทั้งหมดของออเดอร์
exports.findOrderItems = async (orderId) => {
  const [rows] = await db.query(
    `SELECT order_item_id, order_id, menu_id, quantity, unit_price FROM order_items WHERE order_id = ?`,
    [orderId]
  );
  return rows;
};

// ---------- DELETE / VOID (Transaction) ----------
exports.voidOrder = async (conn, orderId) => {
  // Soft Delete: แค่เปลี่ยนสถานะเป็น voided เพื่อรักษาประวัติใบเสร็จและบัญชี
  const [result] = await conn.query(
    `UPDATE orders SET payment_status = 'voided' WHERE order_id = ?`, 
    [orderId]
  );
  return result.affectedRows;
};
