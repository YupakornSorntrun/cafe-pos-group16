// ทดสอบ race condition: ครัวซองต์เหลือพอทำ 1 ชิ้น แต่ยิงออเดอร์ 6 ใบพร้อมกัน (ทำกับฐานข้อมูลทดสอบเท่านั้น)
const ROOT = require("path").join(__dirname, "..", "..") + "/";
require(ROOT + "node_modules/dotenv").config({ path: ROOT + ".env" });
const mysql = require(ROOT + "node_modules/mysql2/promise");

const BASE = process.argv[2] || "http://localhost:3060";
const TEST_DB = "cafe_pos_review_test";
const PARALLEL = Number(process.argv[3] || 6);

async function login(username, password) {
  const r = await fetch(BASE + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return (await r.json()).token;
}

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: TEST_DB,
  });

  // เหลือครัวซองต์ 1 ชิ้น (กล่องกระดาษเบเกอรี่ยังมีเยอะ)
  await db.query("UPDATE ingredients SET stock_quantity = 1 WHERE name = 'ครัวซองต์ (สำเร็จรูป)'");
  const [[before]] = await db.query("SELECT stock_quantity FROM ingredients WHERE name = 'ครัวซองต์ (สำเร็จรูป)'");

  const token = await login("cashier1", "cashier123");
  const body = {
    orderType: "takeaway", paymentMethod: "cash", amountReceived: 100, discountAmount: 0,
    items: [{ menuId: 5, quantity: 1 }], // ครัวซองต์เนย สาขา 1
  };

  const results = await Promise.all(
    Array.from({ length: PARALLEL }, () =>
      fetch(BASE + "/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify(body),
      }).then(async (r) => ({ status: r.status, body: await r.json() }))
    )
  );

  const [[after]] = await db.query("SELECT stock_quantity FROM ingredients WHERE name = 'ครัวซองต์ (สำเร็จรูป)'");
  const [[orders]] = await db.query("SELECT COUNT(*) AS n FROM orders");
  const [[sold]] = await db.query(
    "SELECT COALESCE(SUM(quantity_change), 0) AS q FROM stock_movements sm JOIN ingredients i ON i.ingredient_id = sm.ingredient_id WHERE i.name = 'ครัวซองต์ (สำเร็จรูป)' AND sm.reason = 'sale'"
  );

  const byStatus = {};
  for (const r of results) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  console.log("ยิงพร้อมกัน", PARALLEL, "ออเดอร์ | สต็อกก่อน:", Number(before.stock_quantity), "| สต็อกหลัง:", Number(after.stock_quantity));
  console.log("สถานะที่ตอบ:", JSON.stringify(byStatus));
  console.log("จำนวนออเดอร์ที่บันทึก:", orders.n, "| ผลรวมการตัดสต็อกใน stock_movements:", Number(sold.q));
  console.log("ข้อความ error ที่เจอ:", [...new Set(results.filter((r) => r.status !== 201).map((r) => r.status + " " + (r.body.error || JSON.stringify(r.body))))]);
  console.log(Number(after.stock_quantity) < 0 ? "RESULT: สต็อกติดลบ (race condition เกิดขึ้นจริง)" : "RESULT: สต็อกไม่ติดลบ");
  await db.end();
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
