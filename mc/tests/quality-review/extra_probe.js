// สำรวจ input ผิดปกติเพิ่มเติมที่ endpoint ฝั่งเจ้าของ (ฐานข้อมูลทดสอบเท่านั้น) เพื่อดูว่าตอบ 4xx หรือ 500
const BASE = process.argv[2] || "http://localhost:3060";

async function call(method, path, token, body, raw) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = "Bearer " + token;
  const r = await fetch(BASE + path, { method, headers, body: raw !== undefined ? raw : body === undefined ? undefined : JSON.stringify(body) });
  let text = await r.text();
  return { status: r.status, text: text.replace(/\s+/g, " ").slice(0, 80) };
}

(async () => {
  const lr = await fetch(BASE + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "owner", password: "owner123" }) });
  const owner = (await lr.json()).token;
  const show = (label, r) => console.log(label.padEnd(52), "->", r.status, "|", r.text);

  show("เมนูชื่อยาว 200 ตัวอักษร", await call("POST", "/api/menu", owner, { branchId: 1, categoryId: 1, name: "ก".repeat(200), price: 10 }));
  show("เมนูราคา 1e20 (ใหญ่เกิน DECIMAL)", await call("POST", "/api/menu", owner, { branchId: 1, categoryId: 1, name: "ราคาใหญ่", price: 1e20 }));
  show("เมนู categoryId ที่ไม่มีอยู่ (999)", await call("POST", "/api/menu", owner, { branchId: 1, categoryId: 999, name: "หมวดไม่มี", price: 10 }));
  show("เมนู branchId ที่ไม่มีอยู่ (999)", await call("POST", "/api/menu", owner, { branchId: 999, categoryId: 1, name: "สาขาไม่มี", price: 10 }));
  show("ออเดอร์ from=2026-13-45 (รูปแบบถูก วันที่ไม่จริง)", await call("GET", "/api/orders?from=2026-13-45", owner));
  show("รายงาน from=2026-13-45", await call("GET", "/api/reports/sales?from=2026-13-45", owner));
  show("วัตถุดิบ restock จำนวนติดลบ", await call("POST", "/api/ingredients/1/restock", owner, { quantity: -5 }));
  show("วัตถุดิบ restock ตัวเลขใหญ่มาก 1e20", await call("POST", "/api/ingredients/1/restock", owner, { quantity: 1e20 }));
  const png = await fetch(BASE + "/api/uploads/menu-image", { method: "POST", headers: { "Content-Type": "text/html", Authorization: "Bearer " + owner }, body: "<script>alert(1)</script>" });
  console.log("อัปโหลดไฟล์ Content-Type: text/html".padEnd(52), "->", png.status);
  const big = await fetch(BASE + "/api/uploads/menu-image", { method: "POST", headers: { "Content-Type": "image/png", Authorization: "Bearer " + owner }, body: Buffer.alloc(3 * 1024 * 1024) });
  console.log("อัปโหลดรูป 3MB (เกิน 2MB)".padEnd(52), "->", big.status);
  const fake = await fetch(BASE + "/api/uploads/menu-image", { method: "POST", headers: { "Content-Type": "image/png", Authorization: "Bearer " + owner }, body: "<html><script>alert(1)</script></html>" });
  const fakeBody = await fake.json();
  console.log("อัปโหลด HTML ปลอมเป็น image/png".padEnd(52), "->", fake.status, JSON.stringify(fakeBody));
  // ล็อกอินผิดซ้ำ -> 429
  let last = 0;
  for (let i = 0; i < 7; i++) {
    const r = await fetch(BASE + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "cashier2", password: "wrong" + i }) });
    last = r.status;
  }
  console.log("ล็อกอินผิด 7 ครั้งติดกัน (สถานะครั้งสุดท้าย)".padEnd(52), "->", last);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
