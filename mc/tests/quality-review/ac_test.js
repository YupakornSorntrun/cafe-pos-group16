// ทดสอบว่าพฤติกรรมปกติยังตรงกับ Acceptance Criteria สัปดาห์ 4 (US-01 ถึง US-06) หลังแก้โค้ด — ฐานข้อมูลทดสอบเท่านั้น
const ROOT = require("path").join(__dirname, "..", "..") + "/";
require(ROOT + "node_modules/dotenv").config({ path: ROOT + ".env" });
const mysql = require(ROOT + "node_modules/mysql2/promise");

const BASE = process.argv[2] || "http://localhost:3060";
const TEST_DB = "cafe_pos_review_test";
let pass = 0;
let fail = 0;

function check(name, ok, detail) {
  if (ok) pass++;
  else fail++;
  console.log((ok ? "PASS " : "FAIL ") + name + (detail ? "  [" + detail + "]" : ""));
}

async function login(username, password) {
  const r = await fetch(BASE + "/api/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }),
  });
  return (await r.json()).token;
}

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: TEST_DB,
  });
  const cashier = await login("cashier1", "cashier123");
  const owner = await login("owner", "owner123");
  const H = (t) => ({ "Content-Type": "application/json", Authorization: "Bearer " + t });
  const post = async (path, body, t) => {
    const r = await fetch(BASE + path, { method: "POST", headers: H(t), body: JSON.stringify(body) });
    return { status: r.status, body: await r.json() };
  };
  const get = async (path, t) => {
    const r = await fetch(BASE + path, { headers: H(t) });
    return { status: r.status, body: await r.json() };
  };
  const stock = async (name) => Number((await db.query("SELECT stock_quantity FROM ingredients WHERE name = ?", [name]))[0][0].stock_quantity);

  const base = { orderType: "takeaway", paymentMethod: "cash", amountReceived: 150, discountAmount: 0, items: [{ menuId: 5, quantity: 1 }, { menuId: 3, quantity: 1 }] };

  // ---- US-01
  let r = await post("/api/orders", { ...base, items: [] }, cashier);
  check("US-01 AC-01 ไม่มีรายการสินค้า -> 400 และไม่บันทึก", r.status === 400 && /อย่างน้อย 1 รายการ/.test(r.body.error), r.body.error);
  r = await post("/api/orders", { ...base, items: [{ menuId: 5, quantity: 0 }] }, cashier);
  check("US-01 AC-04 จำนวนต้องมากกว่า 0 -> 400", r.status === 400, r.body.error);
  r = await post("/api/menu", { branchId: 1, categoryId: 1, name: "ทดสอบราคา 0", price: 0 }, owner);
  check("US-01 AC-03 ราคาต้องมากกว่า 0 -> 400", r.status === 400 && /ราคา/.test(r.body.error), r.body.error);
  const [[cnt0]] = await db.query("SELECT COUNT(*) AS n FROM orders");
  check("US-01 ข้อมูลผิดไม่ถูกบันทึกเป็นออเดอร์", cnt0.n === 0, "orders=" + cnt0.n);

  // ---- US-02
  r = await post("/api/orders", { ...base, orderType: "dine_in" }, cashier);
  check("US-02 AC-01 ทานที่ร้านไม่ระบุเลขโต๊ะ -> 400 กรุณาระบุเลขโต๊ะ", r.status === 400 && r.body.error === "กรุณาระบุเลขโต๊ะ", r.body.error);
  r = await post("/api/orders", { ...base, orderType: "dine_in", tableNumber: "A1" }, cashier);
  check("US-02 ทานที่ร้านมีเลขโต๊ะ -> 201", r.status === 201, "status " + r.status);
  let id1 = r.body.data && r.body.data.orderId;

  // ---- US-01 AC-05 / US-03 / US-04 (ยอดรวม ส่วนลด เงินทอน)
  r = await post("/api/orders", { ...base, discountAmount: 10, amountReceived: 150 }, cashier);
  check("US-02 AC-02 กลับบ้านไม่ต้องมีเลขโต๊ะ -> 201", r.status === 201, "status " + r.status);
  check("US-01 AC-05 + US-03 ยอดสุทธิ = (65+45) - 10 = 100", r.body.data && r.body.data.totalAmount === 100, "total=" + (r.body.data && r.body.data.totalAmount));
  check("US-04 AC-03 เงินทอน = 150 - 100 = 50", r.body.data && r.body.data.changeAmount === 50, "change=" + (r.body.data && r.body.data.changeAmount));
  const id2 = r.body.data && r.body.data.orderId;
  r = await post("/api/orders", { ...base, amountReceived: 100 }, cashier);
  check("US-04 AC-02 เงินไม่พอ -> 400 และไม่บันทึก", r.status === 400 && /ไม่พอ/.test(r.body.error), r.body.error);

  // ---- US-06 ใบเสร็จ + สถานะ
  const detail = await get("/api/orders/" + id2, cashier);
  check("US-06 AC-01 บันทึกออเดอร์ สถานะ paid", detail.body.payment_status === "paid", detail.body.payment_status);
  check("US-06 AC-02 ส่งให้บาริสต้า (barista_status = pending)", detail.body.barista_status === "pending", detail.body.barista_status);
  check("US-06 AC-03 ออกใบเสร็จ", !!(detail.body.receipt && detail.body.receipt.receipt_number), detail.body.receipt && detail.body.receipt.receipt_number);

  // ---- US-05 สต็อก
  const croissantBefore = await stock("ครัวซองต์ (สำเร็จรูป)");
  r = await post("/api/orders", { ...base, items: [{ menuId: 5, quantity: 1 }], amountReceived: 100 }, cashier);
  const croissantAfter = await stock("ครัวซองต์ (สำเร็จรูป)");
  check("US-05 AC-01 วัตถุดิบพอ -> ยืนยันได้ และตัดสต็อก 1", r.status === 201 && croissantBefore - croissantAfter === 1, "ก่อน " + croissantBefore + " หลัง " + croissantAfter);
  const id3 = r.body.data && r.body.data.orderId;

  await db.query("UPDATE ingredients SET stock_quantity = 0 WHERE name = 'ครัวซองต์ (สำเร็จรูป)'");
  r = await post("/api/orders", { ...base, items: [{ menuId: 5, quantity: 1 }], amountReceived: 100 }, cashier);
  check("US-05 AC-02 วัตถุดิบไม่พอ -> 400 วัตถุดิบไม่เพียงพอ", r.status === 400 && /วัตถุดิบไม่เพียงพอ/.test(r.body.error), r.body.error);
  const [[cnt1]] = await db.query("SELECT COUNT(*) AS n FROM orders");
  const [[mv]] = await db.query("SELECT COUNT(*) AS n FROM stock_movements sm JOIN ingredients i ON i.ingredient_id = sm.ingredient_id WHERE i.name = 'ครัวซองต์ (สำเร็จรูป)' AND sm.reason = 'sale'");
  check("US-05 สต็อกไม่พอ: ไม่มีออเดอร์ค้างเพิ่ม (มีเฉพาะ 3 ใบที่สำเร็จก่อนหน้า)", cnt1.n === 3, "orders=" + cnt1.n);

  // ---- ยกเลิกออเดอร์ (คืนสต็อก) ยังทำงาน
  await db.query("UPDATE ingredients SET stock_quantity = 10 WHERE name = 'ครัวซองต์ (สำเร็จรูป)'");
  const before = await stock("ครัวซองต์ (สำเร็จรูป)");
  const del = await fetch(BASE + "/api/orders/" + id3, { method: "DELETE", headers: H(cashier) });
  const delBody = await del.json();
  const after = await stock("ครัวซองต์ (สำเร็จรูป)");
  check("ยกเลิกออเดอร์ที่ยังไม่เริ่มทำ -> 200 และคืนสต็อก", del.status === 200 && after - before === 1, delBody.message + " | ก่อน " + before + " หลัง " + after);

  // ---- ออเดอร์หลายรายการ (วัตถุดิบหลายตัว) ผ่านเงื่อนไขตัดสต็อกใหม่ได้
  const cupBefore = await stock("แก้วพลาสติก");
  r = await post("/api/orders", { ...base, items: [{ menuId: 1, quantity: 2 }], amountReceived: 200 }, cashier);
  const cupAfter = await stock("แก้วพลาสติก");
  check("ออเดอร์ชาไทยเย็น 2 แก้ว (6 วัตถุดิบ) -> 201 ตัดแก้วพลาสติก 2", r.status === 201 && cupBefore - cupAfter === 2, "status " + r.status + " แก้ว " + cupBefore + "->" + cupAfter);

  console.log("\nสรุป: ผ่าน " + pass + " | ไม่ผ่าน " + fail);
  await db.end();
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
