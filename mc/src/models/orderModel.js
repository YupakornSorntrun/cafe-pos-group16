const db = require("../config/db");

// ---------- TRANSACTION HELPERS ----------
exports.getConnection = async () => {
  return await db.getConnection();
};

// ---------- CREATE ----------
// BR-03: ใช้ connection ที่เปิด Transaction
// ออกเลขคิวถัดไปของสาขาสำหรับ "วันนี้" (เวลาไทย) — ต้องเรียกใน transaction เดียวกับ createOrder
// LAST_INSERT_ID(expr) ทำให้ได้ค่าใหม่แบบ atomic และล็อกแถวนับจนกว่าจะ COMMIT/ROLLBACK
exports.nextQueueNo = async (conn, branchId) => {
  await conn.query(
    `INSERT INTO branch_daily_counters (branch_id, queue_date, last_no)
     VALUES (?, CURDATE(), LAST_INSERT_ID(1))
     ON DUPLICATE KEY UPDATE last_no = LAST_INSERT_ID(last_no + 1)`,
    [branchId]
  );
  const [rows] = await conn.query("SELECT LAST_INSERT_ID() AS queueNo");
  return Number(rows[0].queueNo);
};

exports.createOrder = async (
  conn,
  branchId,
  employeeId,
  orderType,
  tableNumber,
  paymentMethod,
  discountAmount,
  amountReceived,
  queueNo
) => {
  // const [result] = ... คือการทำ Array Destructuring
  // ปกติ mysql2 จะคืนค่ามา 2 อย่างคือ [ผลลัพธ์, ข้อมูลฟิลด์] เราแค่เอาตัวแรก (result) มาใช้
  const [result] = await conn.query(
    `INSERT INTO orders (branch_id, employee_id, order_type, table_number, payment_method, payment_status, discount_amount, amount_received, barista_status, created_at, queue_date, queue_no)
     VALUES (?, ?, ?, ?, ?, 'paid', ?, ?, 'pending', NOW(), CURDATE(), ?)`,
    [
      branchId,
      employeeId,
      orderType,
      tableNumber || null,
      paymentMethod,
      discountAmount,
      amountReceived,
      queueNo
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

// filters: { branchId, from, to } — from/to เป็น 'YYYY-MM-DD' (นับทั้งวันของ to)
exports.findAll = async ({ branchId, from, to } = {}) => {
  const where = [];
  const params = [];
  if (branchId) { where.push("o.branch_id = ?"); params.push(branchId); }
  if (from) { where.push("o.created_at >= ?"); params.push(from); }
  if (to) { where.push("o.created_at < DATE_ADD(?, INTERVAL 1 DAY)"); params.push(to); }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")} ` : "";
  const [rows] = await db.query(
    ORDER_SELECT_QUERY + whereSql + `GROUP BY o.order_id ORDER BY o.created_at DESC, o.order_id DESC`,
    params
  );
  return rows;
};

// ออเดอร์ + รายการสินค้า (มีชื่อเมนู) + เลขที่ใบเสร็จ สำหรับแสดงใบเสร็จ
// findDetail(): รวมข้อมูลที่ใบเสร็จต้องใช้จากหลายตารางเป็นก้อนเดียว (ออเดอร์ + รายการ + ใบเสร็จ + สาขา + ชื่อแคชเชียร์)
exports.findDetail = async (orderId) => {
  const order = await exports.findById(orderId);
  if (!order) return null;
  const [items] = await db.query(
    `SELECT oi.menu_id, m.name, oi.quantity, oi.unit_price,
            (oi.quantity * oi.unit_price) AS line_total
     FROM order_items oi
     JOIN menu_items m ON oi.menu_id = m.menu_id
     WHERE oi.order_id = ?
     ORDER BY oi.order_item_id`,
    [orderId]
  );
  const [receipts] = await db.query(
    `SELECT receipt_id, receipt_number, printed_at FROM receipts WHERE order_id = ? LIMIT 1`,
    [orderId]
  );
  const [branches] = await db.query(
    `SELECT name, address FROM branches WHERE branch_id = ?`, [order.branch_id]
  );
  const [employees] = await db.query(
    `SELECT name FROM employees WHERE employee_id = ?`, [order.employee_id]
  );
  return {
    ...order,
    items,
    receipt: receipts[0] || null,
    branch: branches[0] || null,
    employee_name: employees[0] ? employees[0].name : null,
  };
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
// ล็อกแถวออเดอร์ (FOR UPDATE) แล้วคืนสถานะล่าสุด ใช้ใน transaction ยกเลิก
exports.lockStatus = async (conn, orderId) => {
  const [rows] = await conn.query(
    "SELECT payment_status, barista_status FROM orders WHERE order_id = ? FOR UPDATE",
    [orderId]
  );
  return rows[0];
};

exports.voidOrder = async (conn, orderId) => {
  // Soft Delete: แค่เปลี่ยนสถานะเป็น voided เพื่อรักษาประวัติใบเสร็จและบัญชี
  const [result] = await conn.query(
    `UPDATE orders SET payment_status = 'voided' WHERE order_id = ?`, 
    [orderId]
  );
  return result.affectedRows;
};
