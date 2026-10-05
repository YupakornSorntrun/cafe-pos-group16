const crypto = require("crypto");
const jwt = require("jsonwebtoken");

// JWT_SECRET ควรตั้งใน .env; ถ้าไม่ตั้งจะสุ่มใหม่ทุกครั้งที่รันเซิร์ฟเวอร์ (token เก่าใช้ไม่ได้)
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
const JWT_EXPIRES_IN = "12h";

// รหัสผ่านเก็บแบบ scrypt รูปแบบ "salt:hash"
exports.hashPassword = async (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await new Promise((resolve, reject) =>
    crypto.scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key)))
  );
  return `${salt}:${hash.toString("hex")}`;
};

exports.verifyPassword = async (password, stored) => {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const real = Buffer.from(hash, "hex");
  const test = await new Promise((resolve, reject) =>
    crypto.scrypt(password, salt, real.length, (err, key) => (err ? reject(err) : resolve(key)))
  );
  return crypto.timingSafeEqual(real, test);
};

exports.generateToken = (user) =>
  jwt.sign(
    { id: user.employee_id, name: user.name, role: user.role, branchId: user.branch_id },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

exports.verifyToken = (token) => jwt.verify(token, JWT_SECRET);
