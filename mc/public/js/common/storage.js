// =====================================================================
// common/storage.js — เก็บข้อมูลในเบราว์เซอร์ (localStorage)
// เก็บ token ล็อกอิน (cafe.token) และสาขาที่เลือกล่าสุด (cafe.branchId)
// =====================================================================
(function () {
  // ---------- เก็บข้อมูลในเบราว์เซอร์ (localStorage) ----------
  // ใช้ try/catch กันกรณีเบราว์เซอร์ไม่อนุญาต จะได้ไม่ทำให้หน้าเว็บพัง
  // เก็บ token ล็อกอิน (cafe.token) และสาขาที่เลือกล่าสุด (cafe.branchId)
  const store = {
    get: function (key) {
      try {
        return localStorage.getItem(key);
      } catch (err) {
        return null;
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (err) {
        // ไม่ต้องทำอะไร
      }
    },
    remove: function (key) {
      try {
        localStorage.removeItem(key);
      } catch (err) {
        // ไม่ต้องทำอะไร
      }
    }
  };

  // ส่งออกให้ไฟล์อื่นเรียกใช้ผ่าน App
  window.App = window.App || {};
  Object.assign(window.App, {
    store: store
  });
})();
