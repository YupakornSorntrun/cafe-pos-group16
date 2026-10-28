const employeeModel = require("../models/employeeModel");
const { verifyPassword, generateToken } = require("../auth-helpers");

// =============================================================
// authController.js — ล็อกอิน และดูว่าใครล็อกอินอยู่
// =============================================================

// หน้าเว็บให้เข้าได้เฉพาะ owner / cashier
// ลำดับตรวจตอนล็อกอิน: กรอกครบไหม -> ล็อกอินผิดเกินกำหนดไหม -> หาผู้ใช้ -> ตรวจรหัสผ่าน -> ตรวจว่าบทบาทใช้หน้าเว็บได้ -> ออก token
// ข้อความ error ตอนไม่พบผู้ใช้กับรหัสผิดเหมือนกัน เพื่อไม่บอกใบ้ว่าชื่อผู้ใช้นั้นมีอยู่จริง
const WEB_ROLES = ["owner", "cashier"];

// กัน brute force แบบง่าย: ผิดเกิน 5 ครั้ง/10 นาที ต่อ (ip + username)
// attempts เก็บ { count: จำนวนครั้งที่ผิด, until: เวลาที่รอบนับสิ้นสุด } ไว้ในหน่วยความจำ
const attempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;

const isBlocked = (key) => {
  const record = attempts.get(key);
  return record && record.until > Date.now() && record.count >= 5;
};

const recordFailure = (key) => {
  const record = attempts.get(key);
  if (!record || record.until <= Date.now()) {
    attempts.set(key, { count: 1, until: Date.now() + WINDOW_MS });
  } else {
    record.count += 1;
  }
};

// POST /api/auth/login  body: { username, password }  ->  { token, user }
exports.login = async (req, res) => {
  const { username, password } = req.body || {};
  const hasUsername = typeof username === "string" && username.trim() !== "";
  const hasPassword = typeof password === "string" && password !== "";
  if (!hasUsername || !hasPassword) {
    return res.status(400).json({ error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" });
  }

  const key = `${req.ip}|${username.trim().toLowerCase()}`;
  if (isBlocked(key)) {
    return res.status(429).json({ error: "ลองผิดหลายครั้งเกินไป กรุณารอสักครู่" });
  }

  try {
    const employee = await employeeModel.findByUsername(username.trim());
    if (!employee || !(await verifyPassword(password, employee.password_hash))) {
      recordFailure(key);
      return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
    }
    if (!WEB_ROLES.includes(employee.role)) {
      return res.status(403).json({ error: "บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานระบบหน้าร้าน" });
    }

    attempts.delete(key);
    const user = {
      id: employee.employee_id,
      name: employee.name,
      role: employee.role,
      branchId: employee.branch_id,
    };
    res.json({ message: "เข้าสู่ระบบสำเร็จ", token: generateToken(employee), user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" });
  }
};

// GET /api/auth/me — หน้าเว็บเรียกตอนเปิดหน้า เพื่อรู้ว่าใครล็อกอินอยู่ (ใช้ตรวจ token ด้วย)
exports.getMe = (req, res) => {
  const { id, name, role, branchId } = req.user;
  res.json({ id, name, role, branchId });
};
