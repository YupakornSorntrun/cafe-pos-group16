const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { verifyPassword, generateToken } = require("../auth-helpers");
const { authenticateToken } = require("../middlewares/auth");

// หน้าเว็บให้เข้าได้เฉพาะ owner / cashier
const WEB_ROLES = ["owner", "cashier"];

// กัน brute force แบบง่าย: ผิดเกิน 5 ครั้ง/10 นาที ต่อ (ip + username)
const attempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const tooMany = (key) => {
  const rec = attempts.get(key);
  return rec && rec.until > Date.now() && rec.count >= 5;
};
const fail = (key) => {
  const rec = attempts.get(key);
  if (!rec || rec.until <= Date.now()) attempts.set(key, { count: 1, until: Date.now() + WINDOW_MS });
  else rec.count += 1;
};

router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== "string" || typeof password !== "string" || !username.trim() || !password) {
    return res.status(400).json({ error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" });
  }
  const key = `${req.ip}|${username.trim().toLowerCase()}`;
  if (tooMany(key)) return res.status(429).json({ error: "ลองผิดหลายครั้งเกินไป กรุณารอสักครู่" });

  try {
    const [rows] = await db.query(
      "SELECT employee_id, branch_id, name, role, password_hash FROM employees WHERE username = ?",
      [username.trim()]
    );
    const emp = rows[0];
    if (!emp || !(await verifyPassword(password, emp.password_hash))) {
      fail(key);
      return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
    }
    if (!WEB_ROLES.includes(emp.role)) {
      return res.status(403).json({ error: "บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานระบบหน้าร้าน" });
    }
    attempts.delete(key);
    const user = { id: emp.employee_id, name: emp.name, role: emp.role, branchId: emp.branch_id };
    res.json({ message: "เข้าสู่ระบบสำเร็จ", token: generateToken(emp), user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" });
  }
});

router.get("/me", authenticateToken, (req, res) => {
  const { id, name, role, branchId } = req.user;
  res.json({ id, name, role, branchId });
});

module.exports = router;
