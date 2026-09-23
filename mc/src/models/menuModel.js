const db = require("../config/db");

// =============================================================
// menuModel.js — CRUD สำหรับ menu_items
// Field mapping ตรงกับ wk07-schema.sql:
//   menu_id, category_id, name, price
// =============================================================

// ---------- CREATE ----------
exports.create = async (categoryId, name, price) => {
  const [result] = await db.query(
    `INSERT INTO menu_items (category_id, name, price)
     VALUES (?, ?, ?)`,
    [categoryId, name, price],
  );
  return result.insertId;
};

// ---------- READ ----------
// ดึงเมนูทั้งหมด (พร้อมชื่อ category)
exports.findAll = async () => {
  const [rows] = await db.query(
    `SELECT m.menu_id, m.category_id, c.name AS category_name,
            m.name, m.price
     FROM menu_items m
     JOIN categories c ON m.category_id = c.category_id`,
  );
  return rows;
};

// ดึงเมนูตาม menu_id
exports.findById = async (menuId) => {
  const [rows] = await db.query(
    `SELECT menu_id, category_id, name, price
     FROM menu_items
     WHERE menu_id = ?`,
    [menuId],
  );
  return rows[0] || null;
};

// ดึง ingredients ที่เมนูนี้ใช้ (ผ่าน menu_item_ingredients)
exports.findIngredientsByMenuId = async (menuId) => {
  const [rows] = await db.query(
    `SELECT mii.menu_id, mii.ingredient_id, mii.quantity_used,
            i.name AS ingredient_name, i.unit
     FROM menu_item_ingredients mii
     JOIN ingredients i ON mii.ingredient_id = i.ingredient_id
     WHERE mii.menu_id = ?`,
    [menuId],
  );
  return rows;
};

// ---------- UPDATE ----------
exports.update = async (menuId, categoryId, name, price) => {
  const [result] = await db.query(
    `UPDATE menu_items
     SET category_id = ?, name = ?, price = ?
     WHERE menu_id = ?`,
    [categoryId, name, price, menuId],
  );
  return result.affectedRows;
};

// ---------- DELETE ----------
exports.deleteMenu = async (menuId) => {
  const [result] = await db.query(
    "DELETE FROM menu_items WHERE menu_id = ?",
    [menuId],
  );
  return result.affectedRows;
};
