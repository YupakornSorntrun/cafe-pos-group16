// ฟังก์ชันช่วยเรื่องรหัสผ่านและ JWT
//   hashPassword / verifyPassword : เข้ารหัสและตรวจรหัสผ่าน (ไม่เก็บรหัสจริงในฐานข้อมูล)
//   generateToken / verifyToken   : สร้างและตรวจ JWT (บัตรผ่านที่เซิร์ฟเวอร์เซ็นชื่อไว้)
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

// JWT_SECRET ควรตั้งใน .env; ถ้าไม่ตั้งจะสุ่มใหม่ทุกครั้งที่รันเซิร์ฟเวอร์ (token เก่าใช้ไม่ได้)
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
const JWT_EXPIRES_IN = "12h";

// รหัสผ่านเก็บแบบ scrypt รูปแบบ "salt:hash"
// เก็บเป็น "salt:hash" — salt สุ่มใหม่ทุกครั้งเพื่อให้รหัสผ่านเดียวกันได้ hash ไม่เหมือนกัน
exports.hashPassword = async (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await new Promise((resolve, reject) =>
    crypto.scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key)))
  );
  return `${salt}:${hash.toString("hex")}`;
};

// verifyPassword(): hash รหัสที่ผู้ใช้พิมพ์ด้วย salt เดิม แล้วเทียบกับที่เก็บไว้ (timingSafeEqual กันการเดาจากเวลาตอบ)
exports.verifyPassword = async (password, stored) => {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const real = Buffer.from(hash, "hex");
  const test = await new Promise((resolve, reject) =>
    crypto.scrypt(password, salt, real.length, (err, key) => (err ? reject(err) : resolve(key)))
  );
  return crypto.timingSafeEqual(real, test);
};

// generateToken(): ใส่ id/ชื่อ/บทบาท/สาขา ลงใน token (หมดอายุ 12 ชม.) — ฝั่ง server เชื่อข้อมูลนี้เพราะมีลายเซ็นกันแก้
exports.generateToken = (user) =>
  jwt.sign(
    { id: user.employee_id, name: user.name, role: user.role, branchId: user.branch_id },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

// verifyToken(): ตรวจลายเซ็นและวันหมดอายุ ถ้าไม่ผ่านจะ throw error
exports.verifyToken = (token) => jwt.verify(token, JWT_SECRET);
