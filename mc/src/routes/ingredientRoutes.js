const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authorizeRoles } = require("../middlewares/auth");

// วัตถุดิบใช้ร่วมกันทุกสาขา (ตาม schema) — จัดการได้เฉพาะเจ้าของ
router.use(authorizeRoles("owner"));

// หน่วยที่ schema อนุญาต: g (กรัม), ml (มิลลิลิตร), pcs (ชิ้น)
const UNITS = ["g", "ml", "pcs"];
const num = (v) => (typeof v === "number" ? v : NaN);

// validate(): ตรวจข้อมูลที่ส่งมา คืนข้อความ error หรือ null ถ้าผ่าน (withStock = ตรวจจำนวนคงเหลือด้วย)
const validate = (b, { withStock }) => {
  if (!b.name || typeof b.name !== "string" || !b.name.trim()) return "ต้องระบุชื่อวัตถุดิบ";
  if (b.name.trim().length > 100) return "ชื่อวัตถุดิบยาวเกิน 100 ตัวอักษร";
  if (!UNITS.includes(b.unit)) return "หน่วยต้องเป็น g, ml หรือ pcs";
  if (!(num(b.lowStockThreshold) >= 0)) return "เกณฑ์แจ้งเตือนต้องไม่ติดลบ";
  if (withStock && !(num(b.stockQuantity) >= 0)) return "จำนวนคงเหลือต้องไม่ติดลบ";
  return null;
};

// GET /api/ingredients — พร้อมจำนวนเมนูที่ใช้วัตถุดิบนี้
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT i.ingredient_id, i.name, i.unit, i.stock_quantity, i.low_stock_threshold,
              COUNT(mii.menu_id) AS used_in_menus
       FROM ingredients i
       LEFT JOIN menu_item_ingredients mii ON mii.ingredient_id = i.ingredient_id
       GROUP BY i.ingredient_id
       ORDER BY i.name`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลวัตถุดิบ" });
  }
});

// POST /api/ingredients — สร้างวัตถุดิบ (ถ้ามีสต็อกเริ่มต้น > 0 บันทึกเป็น restock)
router.post("/", async (req, res) => {
  const msg = validate(req.body, { withStock: true });
  if (msg) return res.status(400).json({ error: msg });
  const { name, unit, stockQuantity, lowStockThreshold } = req.body;

  // เปิด transaction: ต้องบันทึก "ตัววัตถุดิบ" และ "ประวัติเติมสต็อก" พร้อมกัน ถ้าพลาดข้อใดข้อหนึ่งให้ยกเลิกทั้งคู่
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      "INSERT INTO ingredients (name, unit, stock_quantity, low_stock_threshold) VALUES (?, ?, ?, ?)",
      [name.trim(), unit, stockQuantity, lowStockThreshold]
    );
    if (stockQuantity > 0) {
      await conn.query(
        "INSERT INTO stock_movements (ingredient_id, order_id, quantity_change, reason, moved_at) VALUES (?, NULL, ?, 'restock', NOW())",
        [r.insertId, stockQuantity]
      );
    }
    await conn.commit();
    res.status(201).json({ message: "เพิ่มวัตถุดิบสำเร็จ", ingredientId: r.insertId });
  } catch (error) {
    await conn.rollback();
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
  } finally {
    conn.release();
  }
});

// PUT /api/ingredients/:id — แก้ชื่อ/หน่วย/เกณฑ์แจ้งเตือน (ปรับสต็อกใช้ /restock)
router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const msg = validate(req.body, { withStock: false });
  if (msg) return res.status(400).json({ error: msg });
  try {
    const [r] = await db.query(
      "UPDATE ingredients SET name = ?, unit = ?, low_stock_threshold = ? WHERE ingredient_id = ?",
      [req.body.name.trim(), req.body.unit, req.body.lowStockThreshold, id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: "ไม่พบวัตถุดิบ" });
    res.json({ message: "แก้ไขวัตถุดิบสำเร็จ" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการแก้ไขข้อมูล" });
  }
});

// POST /api/ingredients/:id/restock { quantity } — เติมสต็อก (บันทึก stock_movements)
router.post("/:id/restock", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { quantity } = req.body;
  if (!(num(quantity) > 0)) return res.status(400).json({ error: "จำนวนที่เติมต้องมากกว่า 0" });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query("UPDATE ingredients SET stock_quantity = stock_quantity + ? WHERE ingredient_id = ?", [quantity, id]);
    if (r.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "ไม่พบวัตถุดิบ" });
    }
    await conn.query(
      "INSERT INTO stock_movements (ingredient_id, order_id, quantity_change, reason, moved_at) VALUES (?, NULL, ?, 'restock', NOW())",
      [id, quantity]
    );
    await conn.commit();
    res.json({ message: "เติมสต็อกสำเร็จ" });
  } catch (error) {
    await conn.rollback();
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการเติมสต็อก" });
  } finally {
    conn.release();
  }
});

// DELETE /api/ingredients/:id — ลบไม่ได้ถ้าถูกใช้ในสูตรหรือมีประวัติสต็อก
router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const [r] = await db.query("DELETE FROM ingredients WHERE ingredient_id = ?", [id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: "ไม่พบวัตถุดิบ" });
    res.json({ message: "ลบวัตถุดิบสำเร็จ" });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({ error: "วัตถุดิบนี้ถูกใช้ในสูตรเมนูหรือมีประวัติสต็อกแล้ว ไม่สามารถลบได้" });
    }
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบข้อมูล" });
  }
});

module.exports = router;
