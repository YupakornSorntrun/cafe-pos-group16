const express = require("express");
const router = express.Router();
const menuController = require("../controllers/menuController");
const { authorizeRoles } = require("../middlewares/auth");

// แคชเชียร์ดูเมนูได้เฉพาะสาขาตัวเอง
const ownBranchOnly = (req, res, next) => {
  if (req.user.role === "cashier" && parseInt(req.query.branchId, 10) !== req.user.branchId) {
    return res.status(403).json({ error: "คุณไม่มีสิทธิ์ดูเมนูของสาขาอื่น" });
  }
  next();
};

router.get("/", authorizeRoles("owner", "cashier"), ownBranchOnly, menuController.getMenus);
router.get("/:id", authorizeRoles("owner", "cashier"), ownBranchOnly, menuController.getMenuById);
// เฉพาะเจ้าของเท่านั้นที่เพิ่ม/แก้ไข/ลบเมนูได้
router.post("/", authorizeRoles("owner"), menuController.createMenu);
router.put("/:id", authorizeRoles("owner"), menuController.updateMenu);
router.delete("/:id", authorizeRoles("owner"), menuController.deleteMenu);

module.exports = router;
