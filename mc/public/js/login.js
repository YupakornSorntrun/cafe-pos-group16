(function () {
  const $ = (id) => document.getElementById(id);
  $("logo").innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z"/><path d="M16 10h2a2 2 0 0 1 0 4h-2"/><path d="M8 3v2M12 3v2"/></svg>';
  const HOME = { cashier: "/index.html", owner: "/report.html" };

  // ล็อกอินอยู่แล้ว → ไปหน้าของบทบาทตัวเอง
  fetch("/api/auth/me", { headers: { Authorization: `Bearer ${localStorage.getItem("cafe.token")}` } }).then((r) => (r.ok ? r.json() : null)).then((u) => { if (u) location.replace(HOME[u.role] || "/index.html"); });

  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = $("username").value.trim();
    const password = $("password").value;
    $("err").textContent = "";
    if (!username || !password) { $("err").textContent = "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน"; return; }
    $("go").disabled = true;
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "เข้าสู่ระบบไม่สำเร็จ");
      localStorage.setItem("cafe.token", data.token);
      location.href = HOME[data.user.role] || "/index.html";
    } catch (err) {
      $("err").textContent = err.message;
      $("password").value = "";
      $("go").disabled = false;
    }
  });
})();
