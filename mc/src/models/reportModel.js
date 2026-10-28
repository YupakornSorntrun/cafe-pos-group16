const db = require("../config/db");

// reportModel.js — คำสั่ง SQL สำหรับรายงาน

// สรุปยอดขายรวมต่อเมนู นับเฉพาะออเดอร์ที่ชำระแล้ว (payment_status = 'paid') ไม่นับที่ยกเลิก
// branchId, from, to เป็นตัวเลือก: ถ้าไม่ส่งมาจะไม่กรองตามเงื่อนไขนั้น
// เรียงเมนูที่ขายได้มากที่สุดขึ้นก่อน
exports.salesByMenu = async ({ branchId, from, to }) => {
  const conditions = ["o.payment_status = 'paid'"];
  const params = [];

  if (branchId) {
    conditions.push("o.branch_id = ?");
    params.push(branchId);
  }
  if (from) {
    conditions.push("o.created_at >= ?");
    params.push(from);
  }
  if (to) {
    conditions.push("o.created_at < DATE_ADD(?, INTERVAL 1 DAY)");
    params.push(to);
  }

  const [rows] = await db.query(
    `SELECT m.menu_id AS menuId,
            m.name AS menuName,
            SUM(oi.quantity) AS totalQuantity,
            SUM(oi.quantity * oi.unit_price) AS totalSales
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.order_id
     JOIN menu_items m ON oi.menu_id = m.menu_id
     WHERE ${conditions.join(" AND ")}
     GROUP BY m.menu_id, m.name
     ORDER BY totalSales DESC`,
    params
  );

  // SUM ของ MySQL ถูกส่งมาเป็นข้อความ (เช่น "125.00") จึงแปลงเป็นตัวเลขก่อนส่งให้หน้าเว็บ
  return rows.map((row) => ({
    menuId: row.menuId,
    menuName: row.menuName,
    totalQuantity: Number(row.totalQuantity),
    totalSales: Number(row.totalSales),
  }));
};
