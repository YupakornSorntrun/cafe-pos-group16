// =====================================================================
// common/format.js — ฟังก์ชันแปลงข้อความ/วันที่/เงิน และคำแปลสถานะต่าง ๆ
//   esc()         กัน XSS ก่อนใส่ข้อความลงใน HTML
//   baht()        จัดรูปเงิน เช่น ฿1,234.50
//   queueLabel()  เลขคิว เช่น A001
//   fmtDateTime() / ymdThai()  วันที่เวลาไทย
// ไม่ต้องพึ่งไฟล์อื่น (โหลดเป็นไฟล์แรก)
// =====================================================================
(function () {
  // ---------- ฟังก์ชันช่วยทั่วไป ----------

  // esc(): แปลงอักขระพิเศษเป็น HTML entity ก่อนใส่ใน HTML (กัน XSS)
  // ข้อความจากฐานข้อมูลหรือที่ผู้ใช้พิมพ์ต้องผ่านฟังก์ชันนี้ทุกครั้ง
  function esc(text) {
    if (text === null || text === undefined) text = "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // baht(1234.5) -> "฿1,234.50"
  function baht(n) {
    const num = Number(n || 0);
    return "฿" + num.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // แสดงเวลาเป็นเวลาไทยเสมอ
  const TZ = "Asia/Bangkok";

  // เลขคิว: A001, A002, ...
  function queueLabel(order) {
    return "A" + String(order.queue_no).padStart(3, "0");
  }

  function fmtDateTime(date) {
    return new Date(date).toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: TZ
    });
  }

  // "YYYY-MM-DD" ตามวันที่ในเวลาไทย
  function ymdThai(date) {
    return new Date(date).toLocaleDateString("en-CA", { timeZone: TZ });
  }

  // ---------- คำแปลที่ใช้แสดงบนหน้าจอ ----------
  const UNIT_LABEL = { g: "กรัม", ml: "มล.", pcs: "ชิ้น" };
  const BARISTA_LABEL = { pending: "รอทำ", preparing: "กำลังทำ", completed: "เสร็จแล้ว" };
  const PAY_LABEL = { cash: "เงินสด", credit: "บัตรเครดิต", qr: "QR Code" };
  const TYPE_LABEL = { dine_in: "ทานที่ร้าน", takeaway: "กลับบ้าน" };

  // ส่งออกให้ไฟล์อื่นเรียกใช้ผ่าน App
  window.App = window.App || {};
  Object.assign(window.App, {
    esc: esc,
    baht: baht,
    queueLabel: queueLabel,
    fmtDateTime: fmtDateTime,
    ymdThai: ymdThai,
    UNIT_LABEL: UNIT_LABEL,
    BARISTA_LABEL: BARISTA_LABEL,
    PAY_LABEL: PAY_LABEL,
    TYPE_LABEL: TYPE_LABEL
  });
})();
