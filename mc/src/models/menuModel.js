const db = require("../config/db");

// =============================================================
// menuModel.js — CRUD สำหรับ menu_items
// Field mapping ตรงกับ schema.sql (อัปเดตใหม่):
//   menu_id, branch_id, category_id, name, price
// =============================================================

// ---------- CREATE ----------
// recipe = [{ ingredientId, quantityUsed }] — บันทึกพร้อมเมนูใน transaction เดียวกัน
const setRecipe = async (conn, menuId, recipe) => {
  await conn.query("DELETE FROM menu_item_ingredients WHERE menu_id = ?", [menuId]);
  for (const r of recipe) {
    await conn.query(
      "INSERT INTO menu_item_ingredients (menu_id, ingredient_id, quantity_used) VALUES (?, ?, ?)",
      [menuId, r.ingredientId, r.quantityUsed]
    );
  }
};

const inTransaction = async (fn) => {
  const conn = await db.getConnection();
  await conn.beginTransaction();
  try {
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

exports.create = (branchId, categoryId, name, price, imageUrl, recipe = []) =>
  inTransaction(async (conn) => {
    const [result] = await conn.query(
      `INSERT INTO menu_items (branch_id, category_id, name, price, image_url)
       VALUES (?, ?, ?, ?, ?)`,
      [branchId, categoryId, name, price, imageUrl || null]
    );
    await setRecipe(conn, result.insertId, recipe);
    return result.insertId;
  });

// ---------- READ ----------
// ดึงเมนูทั้งหมดของสาขา (พร้อมชื่อ category)
exports.findByBranchId = async (branchId) => {
  const [rows] = await db.query(
    `SELECT m.menu_id, m.branch_id, m.category_id, c.name AS category_name,
            m.name, m.price, m.image_url,
            (SELECT COUNT(*) FROM menu_item_ingredients mii WHERE mii.menu_id = m.menu_id) AS ingredient_count
     FROM menu_items m
     JOIN categories c ON m.category_id = c.category_id
     WHERE m.branch_id = ?
     ORDER BY m.category_id, m.menu_id`,
    [branchId]
  );
  return rows;
};

// ดึงเมนูตาม menu_id และ branch_id
exports.findByIdAndBranchId = async (menuId, branchId) => {
  const [rows] = await db.query(
    `SELECT menu_id, branch_id, category_id, name, price, image_url
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
// recipe = undefined → ไม่แตะสูตรเดิม ; เป็น array → แทนที่ทั้งชุด
exports.update = (menuId, branchId, categoryId, name, price, imageUrl, recipe) =>
  inTransaction(async (conn) => {
    const [result] = await conn.query(
      `UPDATE menu_items
       SET category_id = ?, name = ?, price = ?, image_url = ?
       WHERE menu_id = ? AND branch_id = ?`,
      [categoryId, name, price, imageUrl || null, menuId, branchId]
    );
    if (result.affectedRows > 0 && recipe) await setRecipe(conn, menuId, recipe);
    return result.affectedRows;
  });

// ---------- DELETE ----------
// ลบสูตรก่อนแล้วค่อยลบเมนู; ถ้าเมนูเคยอยู่ในออเดอร์ FK จะ error → rollback ทั้งหมด
exports.deleteMenu = (menuId, branchId) =>
  inTransaction(async (conn) => {
    const [owned] = await conn.query("SELECT menu_id FROM menu_items WHERE menu_id = ? AND branch_id = ?", [menuId, branchId]);
    if (owned.length === 0) return 0;
    await conn.query("DELETE FROM menu_item_ingredients WHERE menu_id = ?", [menuId]);
    const [result] = await conn.query("DELETE FROM menu_items WHERE menu_id = ? AND branch_id = ?", [menuId, branchId]);
    return result.affectedRows;
  });
