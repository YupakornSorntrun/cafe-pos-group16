const db = require("../config/db");

// =============================================================
// menuModel.js — CRUD สำหรับ menu_items
// Field mapping ตรงกับ schema.sql (อัปเดตใหม่):
//   menu_id, branch_id, category_id, name, price
// =============================================================

// ---------- CREATE ----------
exports.create = async (branchId, categoryId, name, price) => {
  const [result] = await db.query(
    `INSERT INTO menu_items (branch_id, category_id, name, price)
     VALUES (?, ?, ?, ?)`,
    [branchId, categoryId, name, price]
  );
  return result.insertId;
};

// ---------- READ ----------
// ดึงเมนูทั้งหมดของสาขา (พร้อมชื่อ category)
exports.findByBranchId = async (branchId) => {
  const [rows] = await db.query(
    `SELECT m.menu_id, m.branch_id, m.category_id, c.name AS category_name,
            m.name, m.price
     FROM menu_items m
     JOIN categories c ON m.category_id = c.category_id
     WHERE m.branch_id = ?`,
    [branchId]
  );
  return rows;
};

// ดึงเมนูตาม menu_id และ branch_id
exports.findByIdAndBranchId = async (menuId, branchId) => {
  const [rows] = await db.query(
    `SELECT menu_id, branch_id, category_id, name, price
     FROM menu_items
     WHERE menu_id = ? AND branch_id = ?`,
    [menuId, branchId]
  );
  return rows[0] || null;
};

// ดึง ingredients ที่เมนูนี้ใช้ (ผ่าน menu_item_ingredients)
// (ไม่เกี่ยวกับสาขาเพราะสูตรเป็นสูตรกลาง)
exports.findIngredientsByMenuId = async (menuId) => {
  const [rows] = await db.query(
    `SELECT mii.menu_id, mii.ingredient_id, mii.quantity_used,
            i.name AS ingredient_name, i.unit, i.stock_quantity, i.low_stock_threshold
     FROM menu_item_ingredients mii
     JOIN ingredients i ON mii.ingredient_id = i.ingredient_id
     WHERE mii.menu_id = ?`,
    [menuId]
  );
  return rows;
};

// ---------- UPDATE ----------
exports.update = async (menuId, branchId, categoryId, name, price) => {
  const [result] = await db.query(
    `UPDATE menu_items
     SET category_id = ?, name = ?, price = ?
     WHERE menu_id = ? AND branch_id = ?`,
    [categoryId, name, price, menuId, branchId]
  );
  return result.affectedRows;
};

// ---------- DELETE ----------
exports.deleteMenu = async (menuId, branchId) => {
  const [result] = await db.query(
    "DELETE FROM menu_items WHERE menu_id = ? AND branch_id = ?",
    [menuId, branchId]
  );
  return result.affectedRows;
};
