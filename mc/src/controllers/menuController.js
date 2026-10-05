const menuModel = require("../models/menuModel");

exports.getMenus = async (req, res) => {
  const branchId = parseInt(req.query.branchId, 10);
  if (Number.isNaN(branchId) || branchId <= 0) {
    return res.status(400).json({ error: "ต้องระบุ branchId" });
  }

  try {
    const menus = await menuModel.findByBranchId(branchId);
    res.json(menus);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลเมนู" });
  }
};

exports.getMenuById = async (req, res) => {
  const menuId = parseInt(req.params.id, 10);
  const branchId = parseInt(req.query.branchId, 10);

  if (Number.isNaN(branchId) || branchId <= 0) {
    return res.status(400).json({ error: "ต้องระบุ branchId" });
  }

  try {
    const menu = await menuModel.findByIdAndBranchId(menuId, branchId);
    if (!menu) {
      return res.status(404).json({ error: "ไม่พบเมนูในสาขานี้" });
    }
    const recipe = await menuModel.findIngredientsByMenuId(menuId);
    res.json({
      ...menu,
      ingredients: recipe.map((r) => ({
        ingredientId: r.ingredient_id,
        name: r.ingredient_name,
        unit: r.unit,
        quantityUsed: Number(r.quantity_used),
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลเมนู" });
  }
};

// ตรวจ recipe: undefined = ไม่ส่งมา (ผ่าน), ต้องเป็น array ของ {ingredientId, quantityUsed>0} ไม่ซ้ำ
const parseRecipe = (raw) => {
  if (raw === undefined) return { recipe: undefined };
  if (!Array.isArray(raw)) return { error: "รูปแบบสูตรวัตถุดิบไม่ถูกต้อง" };
  const seen = new Set();
  for (const r of raw) {
    if (!r || !Number.isInteger(r.ingredientId) || r.ingredientId <= 0) return { error: "ต้องเลือกวัตถุดิบให้ครบทุกแถว" };
    if (!Number.isFinite(r.quantityUsed) || r.quantityUsed <= 0) return { error: "ปริมาณวัตถุดิบต้องมากกว่า 0" };
    if (seen.has(r.ingredientId)) return { error: "เลือกวัตถุดิบซ้ำในสูตรเดียวกันไม่ได้" };
    seen.add(r.ingredientId);
  }
  return { recipe: raw.map((r) => ({ ingredientId: r.ingredientId, quantityUsed: r.quantityUsed })) };
};

const recipeErrorResponse = (error, res) => {
  if (error.code === "ER_NO_REFERENCED_ROW_2") return res.status(400).json({ error: "ไม่พบวัตถุดิบที่เลือก" });
  console.error(error);
  return res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
};

exports.createMenu = async (req, res) => {
  const { branchId, categoryId, name, price, imageUrl, ingredients } = req.body;

  if (!Number.isInteger(branchId) || branchId <= 0) {
    return res.status(400).json({ error: "ต้องระบุ branchId" });
  }
  if (!name || typeof name !== 'string' || name.trim() === "") {
    return res.status(400).json({ error: "ต้องระบุชื่อเมนู" });
  }
  if (!Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ error: "ราคาสินค้าต้องมากกว่า 0" });
  }

  const catId = Number.isInteger(categoryId) ? categoryId : 1;
  const parsed = parseRecipe(ingredients);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  try {
    const menuId = await menuModel.create(branchId, catId, name.trim(), price, imageUrl, parsed.recipe);
    res.status(201).json({ message: "สร้างเมนูสำเร็จ", menuId });
  } catch (error) {
    recipeErrorResponse(error, res);
  }
};

exports.updateMenu = async (req, res) => {
  const menuId = parseInt(req.params.id, 10);
  const { branchId, categoryId, name, price, imageUrl, ingredients } = req.body;

  if (!Number.isInteger(branchId) || branchId <= 0) {
    return res.status(400).json({ error: "ต้องระบุ branchId" });
  }
  if (!name || typeof name !== 'string' || name.trim() === "") {
    return res.status(400).json({ error: "ต้องระบุชื่อเมนู" });
  }
  if (!Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ error: "ราคาสินค้าต้องมากกว่า 0" });
  }

  const catId = Number.isInteger(categoryId) ? categoryId : 1;
  const parsed = parseRecipe(ingredients);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  try {
    const affectedRows = await menuModel.update(menuId, branchId, catId, name.trim(), price, imageUrl, parsed.recipe);
    if (affectedRows === 0) {
      return res.status(404).json({ error: "ไม่พบเมนูในสาขานี้" });
    }
    res.json({ message: "แก้ไขเมนูสำเร็จ" });
  } catch (error) {
    recipeErrorResponse(error, res);
  }
};

exports.deleteMenu = async (req, res) => {
  const menuId = parseInt(req.params.id, 10);
  
  // รองรับ branchId จาก query string
  const branchId = parseInt(req.query.branchId, 10);

  if (Number.isNaN(branchId) || branchId <= 0) {
    return res.status(400).json({ error: "ต้องระบุ branchId" });
  }

  try {
    const affectedRows = await menuModel.deleteMenu(menuId, branchId);
    if (affectedRows === 0) {
      return res.status(404).json({ error: "ไม่พบเมนูในสาขานี้" });
    }
    res.json({ message: "ลบเมนูสำเร็จ" });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({ error: "เมนูนี้เคยถูกใช้ในออเดอร์แล้ว ไม่สามารถลบได้" });
    }
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบข้อมูล" });
  }
};
