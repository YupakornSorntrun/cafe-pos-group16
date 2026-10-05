const express = require("express");
const router = express.Router();
const db = require("../config/db");

// GET /api/branches — เจ้าของเห็นทุกสาขา, แคชเชียร์เห็นเฉพาะสาขาตัวเอง
router.get("/branches", async (req, res) => {
  try {
    const [rows] = req.user.role === "owner"
      ? await db.query("SELECT branch_id, name, address FROM branches ORDER BY branch_id")
      : await db.query("SELECT branch_id, name, address FROM branches WHERE branch_id = ?", [req.user.branchId]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลสาขา" });
  }
});

// GET /api/categories
router.get("/categories", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT category_id, name FROM categories ORDER BY category_id");
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลหมวดหมู่" });
  }
});

module.exports = router;
