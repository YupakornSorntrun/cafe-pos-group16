// =====================================================================
// login.js — หน้าเข้าสู่ระบบ (login.html)
//
// API ที่หน้านี้เรียก
//   GET  /api/auth/me      ตอนเปิดหน้า: ถ้าล็อกอินค้างอยู่ ให้ข้ามไปหน้าของตัวเอง
//   POST /api/auth/login   ตอนกดปุ่มเข้าสู่ระบบ -> ได้ token กลับมา
//
// ล็อกอินสำเร็จ -> เก็บ token ใน localStorage (cafe.token) แล้วไปหน้าตามบทบาท
//   แคชเชียร์ -> /index.html (POS)    เจ้าของ -> /report.html (รายงาน)
// (หน้านี้ไม่ใช้ไฟล์ใน common/ จึงเรียก fetch เอง)
// =====================================================================
(function () {
  // หา element ในหน้าเว็บจาก id (ย่อมาจาก document.getElementById)
  function byId(id) {
    return document.getElementById(id);
  }

  // ไอคอนโลโก้
  byId("logo").innerHTML =
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M4 8h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z"/><path d="M16 10h2a2 2 0 0 1 0 4h-2"/><path d="M8 3v2M12 3v2"/></svg>';

  // หน้าแรกของแต่ละบทบาท
  const HOME = { cashier: "/index.html", owner: "/report.html" };

  // ถ้าล็อกอินอยู่แล้ว ให้ไปหน้าของบทบาทตัวเองเลย
  // เรียก API: GET /api/auth/me  (backend: routes/authRoutes.js)
  async function checkAlreadyLoggedIn() {
    try {
      const token = localStorage.getItem("cafe.token");
      if (!token) return;
      const res = await fetch("/api/auth/me", { headers: { Authorization: "Bearer " + token } });
      if (!res.ok) return; // token ใช้ไม่ได้ ให้อยู่หน้านี้ต่อ
      const user = await res.json();
      location.replace(HOME[user.role] || "/index.html");
    } catch (err) {
      // เชื่อมต่อไม่ได้ ให้อยู่หน้านี้ต่อ
    }
  }
  checkAlreadyLoggedIn();

  // กดปุ่มเข้าสู่ระบบ
  byId("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault(); // กันไม่ให้ฟอร์มโหลดหน้าใหม่

    const username = byId("username").value.trim();
    const password = byId("password").value;
    byId("err").textContent = "";

    if (!username || !password) {
      byId("err").textContent = "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน";
      return;
    }

    byId("go").disabled = true;
    try {
      // เรียก API: POST /api/auth/login  (backend: routes/authRoutes.js — ตรวจรหัสผ่านด้วย scrypt แล้วออก JWT)
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username, password: password })
      });

      let data = {};
      try {
        data = await res.json();
      } catch (err) {
        data = {};
      }
      if (!res.ok) throw new Error(data.error || "เข้าสู่ระบบไม่สำเร็จ");

      localStorage.setItem("cafe.token", data.token);
      location.href = HOME[data.user.role] || "/index.html";
    } catch (err) {
      byId("err").textContent = err.message;
      byId("password").value = "";
      byId("go").disabled = false;
    }
  });
})();
