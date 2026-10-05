const { verifyToken } = require("../auth-helpers");

// ตรวจ JWT จาก header "Authorization: Bearer <token>" แล้วใส่ payload ไว้ที่ req.user
exports.authenticateToken = (req, res, next) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "กรุณาเข้าสู่ระบบ" });
  }
  try {
    const { id, name, role, branchId } = verifyToken(token);
    req.user = { id, name, role, branchId };
    next();
  } catch (err) {
    const expired = err.name === "TokenExpiredError";
    res.status(401).json({ error: expired ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" : "Token ไม่ถูกต้อง" });
  }
};

// ตรวจสิทธิ์ตามบทบาท (ต้องอยู่หลัง authenticateToken)
exports.authorizeRoles = (...roles) => [
  exports.authenticateToken,
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "คุณไม่มีสิทธิ์ใช้งานส่วนนี้" });
    }
    next();
  },
];
