// ทดสอบ IDOR / SQL Injection / Error Handling ของ endpoint หลัก (ฐานข้อมูลทดสอบเท่านั้น)
const BASE = process.argv[2] || "http://localhost:3060";
let pass = 0;
let fail = 0;

function check(name, ok, detail) {
  if (ok) pass++;
  else fail++;
  console.log((ok ? "PASS " : "FAIL ") + name + (detail ? "  [" + detail + "]" : ""));
}

async function call(method, path, token, body) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = "Bearer " + token;
  const r = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  let json = null;
  try { json = await r.json(); } catch (e) { json = null; }
  return { status: r.status, body: json };
}

(async () => {
  const login = async (u, p) => (await call("POST", "/api/auth/login", null, { username: u, password: p })).body.token;
  const c1 = await login("cashier1", "cashier123"); // สาขา 1
  const c2 = await login("cashier2", "cashier123"); // สาขา 2
  const owner = await login("owner", "owner123");

  const order = { orderType: "takeaway", paymentMethod: "cash", amountReceived: 500, discountAmount: 0 };
  // ออเดอร์ของสาขา 2 (เมนู 7 = ชาไทยเย็น สาขา 2)
  const o2 = await call("POST", "/api/orders", c2, { ...order, items: [{ menuId: 7, quantity: 1 }] });
  const o2id = o2.body.data.orderId;

  // ---------------- IDOR
  let r = await call("GET", "/api/orders/" + o2id, c1);
  check("IDOR แคชเชียร์สาขา 1 ดูใบเสร็จของสาขา 2 -> 404", r.status === 404, "status " + r.status);
  r = await call("DELETE", "/api/orders/" + o2id, c1);
  check("IDOR แคชเชียร์สาขา 1 ยกเลิกออเดอร์สาขา 2 -> 404", r.status === 404, "status " + r.status);
  r = await call("GET", "/api/menu?branchId=2", c1);
  check("IDOR แคชเชียร์สาขา 1 ดูเมนูสาขา 2 -> 403", r.status === 403, "status " + r.status);
  r = await call("GET", "/api/menu/7?branchId=2", c1);
  check("IDOR แคชเชียร์สาขา 1 ดูเมนูรายตัวของสาขา 2 -> 403", r.status === 403, "status " + r.status);
  r = await call("POST", "/api/orders", c1, { ...order, items: [{ menuId: 7, quantity: 1 }] });
  check("IDOR แคชเชียร์สาขา 1 สั่งเมนูของสาขา 2 -> 400", r.status === 400, r.body.error);
  r = await call("POST", "/api/orders", c1, { ...order, branchId: 2, employeeId: 999, items: [{ menuId: 3, quantity: 1 }] });
  const forgedId = r.body.data && r.body.data.orderId;
  const forged = await call("GET", "/api/orders/" + forgedId, owner);
  check("ปลอม branchId/employeeId ใน body -> ถูกทับด้วยค่าจาก token (สาขา 1)", r.status === 201 && forged.body.branch_id === 1 && forged.body.employee_id !== 999, "branch_id=" + forged.body.branch_id + " employee_id=" + forged.body.employee_id);
  r = await call("GET", "/api/orders?branchId=2&from=2000-01-01&to=2099-12-31", c1);
  check("แคชเชียร์ขอออเดอร์สาขา 2 ผ่าน query -> ได้เฉพาะสาขาตัวเอง", r.status === 200 && r.body.every((o) => o.branch_id === 1), "orders=" + r.body.length);
  r = await call("GET", "/api/reports/sales", c1);
  check("แคชเชียร์เรียกรายงาน -> 403", r.status === 403, "status " + r.status);
  r = await call("GET", "/api/ingredients", c1);
  check("แคชเชียร์เรียกวัตถุดิบ (เฉพาะเจ้าของ) -> 403", r.status === 403, "status " + r.status);
  r = await call("POST", "/api/menu", c1, { branchId: 1, categoryId: 1, name: "แฮก", price: 1 });
  check("แคชเชียร์เพิ่มเมนู (เฉพาะเจ้าของ) -> 403", r.status === 403, "status " + r.status);
  r = await call("GET", "/api/orders/" + o2id, null);
  check("ไม่มี token -> 401", r.status === 401, "status " + r.status);

  // ---------------- SQL Injection
  r = await call("POST", "/api/auth/login", null, { username: "' OR '1'='1", password: "x" });
  check("SQLi login ด้วย ' OR '1'='1 -> 401 (ไม่ผ่าน)", r.status === 401, "status " + r.status);
  r = await call("GET", "/api/orders?from=2026-01-01' OR '1'='1", owner);
  check("SQLi query from -> 400 (ตรวจรูปแบบวันที่)", r.status === 400, "status " + r.status);
  const sales1 = await call("GET", "/api/reports/sales?branchId=1", owner);
  r = await call("GET", "/api/reports/sales?branchId=1%20OR%201=1", owner);
  check("SQLi branchId=1 OR 1=1 ที่รายงาน -> ถูกแปลงเป็นเลข 1 ผลเท่ากับ branchId=1 (ไม่ได้ข้อมูลเพิ่ม)", r.status === 200 && JSON.stringify(r.body) === JSON.stringify(sales1.body), "status " + r.status);
  r = await call("GET", "/api/orders?branchId=1%20OR%201=1&from=2000-01-01&to=2099-12-31", owner);
  const onlyBranch1 = r.status === 200 && r.body.every((o) => o.branch_id === 1);
  check("SQLi branchId=1 OR 1=1 ที่ออเดอร์ -> ถูกแปลงเป็นเลข 1 ได้เฉพาะสาขา 1", onlyBranch1, "status " + r.status + " orders=" + (r.body.length || 0));
  const evil = "x'); DROP TABLE orders;-- ";
  r = await call("POST", "/api/menu", owner, { branchId: 1, categoryId: 1, name: evil, price: 10 });
  const check1 = await call("GET", "/api/orders?from=2000-01-01&to=2099-12-31", owner);
  const menus = await call("GET", "/api/menu?branchId=1", owner);
  check("SQLi ชื่อเมนูมี DROP TABLE -> เก็บเป็นข้อความธรรมดา ตาราง orders ยังอยู่", r.status === 201 && check1.status === 200 && menus.body.some((m) => m.name === evil.trim()), "create " + r.status);
  if (r.body && r.body.menuId) await call("DELETE", "/api/menu/" + r.body.menuId + "?branchId=1", owner);

  // ---------------- Error Handling
  r = await call("GET", "/api/orders/abc", owner);
  check("id ไม่ใช่ตัวเลข -> 400 (ไม่ใช่ 500)", r.status === 400, "status " + r.status);
  r = await call("GET", "/api/orders/99999", owner);
  check("ไม่พบออเดอร์ -> 404", r.status === 404, "status " + r.status);
  r = await call("GET", "/api/ไม่มีเส้นทางนี้", owner);
  check("เส้นทางที่ไม่มี -> 404 JSON", r.status === 404 && r.body && r.body.error, "status " + r.status);
  const bad = await fetch(BASE + "/api/orders", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + c1 }, body: "{bad json" });
  const badText = await bad.text();
  check("JSON พัง -> 400 JSON ไม่มี stack trace", bad.status === 400 && !/at .*:\d+:\d+/.test(badText), "status " + bad.status);

  console.log("\nสรุป: ผ่าน " + pass + " | ไม่ผ่าน " + fail);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
