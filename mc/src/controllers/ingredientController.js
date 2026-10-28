const ingredientModel = require("../models/ingredientModel");

// =============================================================
// ingredientController.js — ตรวจข้อมูลที่ส่งมา แล้วเรียก ingredientModel
// =============================================================

// หน่วยที่ schema อนุญาต: g (กรัม), ml (มิลลิลิตร), pcs (ชิ้น)
const UNITS = ["g", "ml", "pcs"];

// คืนค่าเป็นตัวเลขถ้าเป็นชนิด number ไม่งั้นคืน NaN (NaN เทียบแล้วเป็น false เสมอ)
const toNumber = (value) => (typeof value === "number" ? value : NaN);

// ตรวจข้อมูลวัตถุดิบ คืนข้อความ error ถ้าไม่ผ่าน หรือ null ถ้าผ่าน
// withStock = true ให้ตรวจจำนวนคงเหลือด้วย (ใช้ตอนสร้างใหม่)
const validateIngredient = (body, withStock) => {
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return "ต้องระบุชื่อวัตถุดิบ";
  }
  if (body.name.trim().length > 100) {
    return "ชื่อวัตถุดิบยาวเกิน 100 ตัวอักษร";
  }
  if (!UNITS.includes(body.unit)) {
    return "หน่วยต้องเป็น g, ml หรือ pcs";
  }
  if (!(toNumber(body.lowStockThreshold) >= 0)) {
    return "เกณฑ์แจ้งเตือนต้องไม่ติดลบ";
  }
  if (withStock && !(toNumber(body.stockQuantity) >= 0)) {
    return "จำนวนคงเหลือต้องไม่ติดลบ";
  }
  return null;
};

// GET /api/ingredients
exports.getIngredients = async (req, res) => {
  try {
    const ingredients = await ingredientModel.findAll();
    res.json(ingredients);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลวัตถุดิบ" });
  }
};

// POST /api/ingredients
exports.createIngredient = async (req, res) => {
  const message = validateIngredient(req.body, true);
  if (message) {
    return res.status(400).json({ error: message });
  }

  const { name, unit, stockQuantity, lowStockThreshold } = req.body;
  try {
    const ingredientId = await ingredientModel.create(
      name.trim(),
      unit,
      stockQuantity,
      lowStockThreshold
    );
    res.status(201).json({ message: "เพิ่มวัตถุดิบสำเร็จ", ingredientId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
  }
};

// PUT /api/ingredients/:id (ปรับจำนวนสต็อกให้ใช้ /restock)
exports.updateIngredient = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const message = validateIngredient(req.body, false);
  if (message) {
    return res.status(400).json({ error: message });
  }

  const { name, unit, lowStockThreshold } = req.body;
  try {
    const found = await ingredientModel.update(id, name.trim(), unit, lowStockThreshold);
    if (!found) {
      return res.status(404).json({ error: "ไม่พบวัตถุดิบ" });
    }
    res.json({ message: "แก้ไขวัตถุดิบสำเร็จ" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการแก้ไขข้อมูล" });
  }
};

// POST /api/ingredients/:id/restock  body: { quantity }
exports.restockIngredient = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { quantity } = req.body;
  if (!(toNumber(quantity) > 0)) {
    return res.status(400).json({ error: "จำนวนที่เติมต้องมากกว่า 0" });
  }

  try {
    const found = await ingredientModel.restock(id, quantity);
    if (!found) {
      return res.status(404).json({ error: "ไม่พบวัตถุดิบ" });
    }
    res.json({ message: "เติมสต็อกสำเร็จ" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการเติมสต็อก" });
  }
};

// DELETE /api/ingredients/:id (ลบไม่ได้ถ้าถูกใช้ในสูตรหรือมีประวัติสต็อก)
exports.deleteIngredient = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const found = await ingredientModel.remove(id);
    if (!found) {
      return res.status(404).json({ error: "ไม่พบวัตถุดิบ" });
    }
    res.json({ message: "ลบวัตถุดิบสำเร็จ" });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        error: "วัตถุดิบนี้ถูกใช้ในสูตรเมนูหรือมีประวัติสต็อกแล้ว ไม่สามารถลบได้",
      });
    }
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบข้อมูล" });
  }
};
