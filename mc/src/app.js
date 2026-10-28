require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

// ไฟล์เริ่มต้นของเซิร์ฟเวอร์: ตั้งค่า middleware -> เสิร์ฟหน้าเว็บ (public/) -> ต่อ route ของ API -> เปิดพอร์ต
const app = express();

// helmet ใส่ header ความปลอดภัย; ปรับ Content-Security-Policy ให้โหลดรูปจาก https และฟอนต์ Google ได้
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "img-src": ["'self'", "data:", "https:"],
        "style-src": ["'self'", "https:", "'unsafe-inline'"],
        "font-src": ["'self'", "https:", "data:"],
      },
    },
  })
);
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
// เสิร์ฟไฟล์หน้าเว็บในโฟลเดอร์ public/ (login.html, index.html, ...) และรูปที่อัปโหลดใน public/uploads/
app.use(express.static(path.join(__dirname, "..", "public")));

// หมายเหตุสิทธิ์: /api/auth เปิดให้ทุกคน (ล็อกอิน) ส่วน route อื่นตรวจ JWT และบทบาทในไฟล์ route ของตัวเอง
const { authenticateToken, authorizeRoles } = require("./middlewares/auth");
app.use("/api/auth", require("./routes/authRoutes"));

const orderRoutes = require("./routes/orderRoutes");
app.use("/api/orders", orderRoutes);

const menuRoutes = require("./routes/menuRoutes");
app.use("/api/menu", menuRoutes);

// รายงานยอดขาย (เฉพาะเจ้าของ — ตรวจในไฟล์ route)
app.use("/api/reports", require("./routes/reportRoutes"));

// วัตถุดิบ (เฉพาะเจ้าของ — ตรวจในไฟล์ route)
app.use("/api/ingredients", require("./routes/ingredientRoutes"));
// สาขา/หมวดหมู่: ต้องล็อกอิน (ทั้งเจ้าของและแคชเชียร์) | อัปโหลดรูป: เฉพาะเจ้าของ
app.use("/api", authenticateToken, require("./routes/lookupRoutes"));
app.use("/api/uploads", authorizeRoles("owner"), require("./routes/uploadRoutes"));

// 404 handler — ถ้าไม่ match route ไหนเลย
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: "ROUTE_NOT_FOUND",
      message: "ไม่พบเส้นทางที่ร้องขอ",
    },
  });
});

// ตัวจัดการ error กลาง: ตอบเป็น JSON เสมอ และไม่ส่ง stack trace ออกไปให้ผู้ใช้เห็น
// (ต้องวางหลัง route ทั้งหมด) เช่น ผู้ใช้ส่ง JSON ที่พัง/ไม่ครบมา
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "รูปแบบข้อมูลที่ส่งมาไม่ถูกต้อง (JSON)" });
  }
  if (err.status && err.status < 500) {
    return res.status(err.status).json({ error: "คำขอไม่ถูกต้อง" });
  }
  console.error(err);
  res.status(500).json({ error: "เกิดข้อผิดพลาดภายในระบบ" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Cafe POS server running on port ${PORT}`);
});
