// ทดสอบ input validation / error handling ของ POST /api/orders (ฐานข้อมูลทดสอบเท่านั้น)
const BASE = process.argv[2] || "http://localhost:3060";

async function login(username, password) {
  const r = await fetch(BASE + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return (await r.json()).token;
}

(async () => {
  const token = await login("cashier1", "cashier123");
  const auth = { "Content-Type": "application/json", Authorization: "Bearer " + token };
  const base = { orderType: "takeaway", paymentMethod: "cash", amountReceived: 500, discountAmount: 0, items: [{ menuId: 3, quantity: 1 }] };

  async function send(label, body, raw) {
    const r = await fetch(BASE + "/api/orders", { method: "POST", headers: auth, body: raw !== undefined ? raw : JSON.stringify(body) });
    const text = await r.text();
    let shown = text.replace(/\s+/g, " ");
    const hasStack = /at .*\(.*:\d+:\d+\)/.test(text);
    console.log(label.padEnd(46), "->", r.status, r.headers.get("content-type").split(";")[0], hasStack ? "[มี stack trace]" : "", "|", shown.slice(0, 90));
  }

  await send("ทานที่ร้าน ไม่ระบุเลขโต๊ะ", { ...base, orderType: "dine_in" });
  await send("ทานที่ร้าน เลขโต๊ะยาว 30 ตัวอักษร", { ...base, orderType: "dine_in", tableNumber: "X".repeat(30) });
  await send("amountReceived เป็นข้อความ \"abc\"", { ...base, amountReceived: "abc" });
  await send("amountReceived เป็นข้อความ \"500\"", { ...base, amountReceived: "500" });
  await send("JSON พัง (body ไม่ครบ)", null, '{"orderType": "takeaway", ');
  await send("ปกติ: กลับบ้าน ไม่มีเลขโต๊ะ", base);
  await send("ปกติ: ทานที่ร้าน โต๊ะ A1", { ...base, orderType: "dine_in", tableNumber: "A1" });
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
