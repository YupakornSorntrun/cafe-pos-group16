const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { authorizeRoles } = require("../middlewares/auth");

// แคชเชียร์: รับออเดอร์ (ระบบใช้ employeeId/branchId จาก session ไม่เชื่อค่าจาก body)
router.post(
  "/",
  authorizeRoles("cashier"),
  (req, res, next) => {
    req.body = { ...req.body, employeeId: req.user.id, branchId: req.user.branchId };
    next();
  },
  orderController.createOrder
);
// รายการออเดอร์: เจ้าของดูได้ทั้งหมด, แคชเชียร์เห็นเฉพาะวันนี้ของสาขาตัวเอง ; ใบเสร็จดูได้ทั้งเจ้าของและแคชเชียร์ (จำกัดสาขาใน controller)
router.get("/", authorizeRoles("owner", "cashier"), orderController.getAllOrders);
router.get("/:id", authorizeRoles("owner", "cashier"), orderController.getOrderById);
// แคชเชียร์ยกเลิกได้เฉพาะออเดอร์ที่ยังไม่เริ่มทำ (ตรวจใน controller)
router.delete("/:id", authorizeRoles("owner", "cashier"), orderController.deleteOrder);

module.exports = router;
