// middleware = ฟังก์ชันที่คั่นกลางก่อนถึงโค้ดของ route ถ้าไม่ผ่านจะตอบ error เลย (ไม่ไปต่อ)
// ใช้แบบ: router.post("/", authorizeRoles("owner"), controller.createMenu)  -> เฉพาะเจ้าของเท่านั้น
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
// authorizeRoles("owner", "cashier") = ต้องล็อกอินและบทบาทต้องอยู่ในรายการ (ไม่ใช่ -> 403 ไม่มีสิทธิ์)
// คืนเป็นอาร์เรย์ [ตรวจ token, ตรวจบทบาท] ซึ่ง Express ใช้ต่อกันเป็นลำดับให้
exports.authorizeRoles = (...roles) => [
  exports.authenticateToken,
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "คุณไม่มีสิทธิ์ใช้งานส่วนนี้" });
    }
    next();
  },
];
