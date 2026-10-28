// =====================================================================
// common/api.js — api(): เรียก backend พร้อมแนบ token ล็อกอิน
// ต้องโหลดหลัง storage.js
// =====================================================================
(function () {
  const store = App.store;

  // ---------- เรียก backend ----------
  // api("/api/menu?branchId=1")                  -> GET
  // api("/api/orders", { json: {...} })          -> POST พร้อมส่ง JSON
  // api("/api/menu/3", { method: "PUT", json: {...} })
  // ถ้า server ตอบ error จะ throw Error ที่มีข้อความภาษาไทย (นำไปใช้ toast(e.message) ได้)
  async function api(path, opts) {
    const init = Object.assign({}, opts || {});

    // ถ้าส่ง { json: ... } มา -> แปลงเป็น JSON ใน body และตั้ง method เป็น POST ให้อัตโนมัติ
    if (init.json !== undefined) {
      init.method = init.method || "POST";
      init.headers = Object.assign({ "Content-Type": "application/json" }, init.headers || {});
      init.body = JSON.stringify(init.json);
      delete init.json;
    }

    // แนบ token ไปกับทุกคำขอ เพื่อให้ server รู้ว่าใครเรียก
    const token = store.get("cafe.token");
    if (token) {
      init.headers = Object.assign({}, init.headers || {}, { Authorization: "Bearer " + token });
    }

    let res;
    try {
      res = await fetch(path, init);
    } catch (err) {
      throw new Error("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    }

    let data = {};
    try {
      data = await res.json();
    } catch (err) {
      data = {};
    }

    // 401 = ยังไม่ล็อกอิน หรือ token หมดอายุ -> ล้าง token แล้วไปหน้า login
    // (ยกเว้นตอนกดล็อกอินเอง ที่ต้องแสดงข้อความ "รหัสผ่านไม่ถูกต้อง")
    if (res.status === 401 && path.indexOf("/api/auth/login") !== 0) {
      store.remove("cafe.token");
      location.href = "/login.html";
      throw new Error(data.error || "กรุณาเข้าสู่ระบบ");
    }

    if (!res.ok) {
      let msg = "เกิดข้อผิดพลาด";
      if (typeof data.error === "string") {
        msg = data.error;
      } else if (data.error && data.error.message) {
        msg = data.error.message;
      }
      throw new Error(msg);
    }

    return data;
  }

  // ส่งออกให้ไฟล์อื่นเรียกใช้ผ่าน App
  window.App = window.App || {};
  Object.assign(window.App, {
    api: api
  });
})();
