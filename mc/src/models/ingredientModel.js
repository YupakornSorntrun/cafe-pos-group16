const db = require("../config/db");

// =============================================================
// ingredientModel.js — คำสั่ง SQL ของตาราง ingredients (วัตถุดิบ)
// และ stock_movements (ประวัติการเพิ่ม/ลดสต็อก)
// =============================================================

// ดึงวัตถุดิบทั้งหมด พร้อมจำนวนเมนูที่ใช้วัตถุดิบนี้
exports.findAll = async () => {
  const [rows] = await db.query(
    `SELECT i.ingredient_id, i.name, i.unit, i.stock_quantity, i.low_stock_threshold,
            COUNT(mii.menu_id) AS used_in_menus
     FROM ingredients i
     LEFT JOIN menu_item_ingredients mii ON mii.ingredient_id = i.ingredient_id
     GROUP BY i.ingredient_id
     ORDER BY i.name`
  );
  return rows;
};

// เพิ่มวัตถุดิบใหม่ ถ้ามีสต็อกเริ่มต้นมากกว่า 0 ให้บันทึกประวัติ restock ด้วย
// ใช้ transaction เพราะต้องบันทึก 2 ตารางพร้อมกัน ถ้าพลาดข้อใดข้อหนึ่งให้ยกเลิกทั้งคู่
exports.create = async (name, unit, stockQuantity, lowStockThreshold) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO ingredients (name, unit, stock_quantity, low_stock_threshold)
       VALUES (?, ?, ?, ?)`,
      [name, unit, stockQuantity, lowStockThreshold]
    );

    if (stockQuantity > 0) {
      await conn.query(
        `INSERT INTO stock_movements
           (ingredient_id, order_id, quantity_change, reason, moved_at)
         VALUES (?, NULL, ?, 'restock', NOW())`,
        [result.insertId, stockQuantity]
      );
    }

    await conn.commit();
    return result.insertId;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

// แก้ชื่อ/หน่วย/เกณฑ์แจ้งเตือน (ไม่แก้จำนวนคงเหลือ) คืน true ถ้าเจอวัตถุดิบนี้
exports.update = async (id, name, unit, lowStockThreshold) => {
  const [result] = await db.query(
    "UPDATE ingredients SET name = ?, unit = ?, low_stock_threshold = ? WHERE ingredient_id = ?",
    [name, unit, lowStockThreshold, id]
  );
  return result.affectedRows > 0;
};

// เติมสต็อก + บันทึกประวัติ ใน transaction เดียวกัน คืน true ถ้าเจอวัตถุดิบนี้
exports.restock = async (id, quantity) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      "UPDATE ingredients SET stock_quantity = stock_quantity + ? WHERE ingredient_id = ?",
      [quantity, id]
    );
    if (result.affectedRows === 0) {
      await conn.rollback();
      return false;
    }

    await conn.query(
      `INSERT INTO stock_movements
         (ingredient_id, order_id, quantity_change, reason, moved_at)
       VALUES (?, NULL, ?, 'restock', NOW())`,
      [id, quantity]
    );

    await conn.commit();
    return true;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

// ลบวัตถุดิบ คืน true ถ้าเจอและลบแล้ว
// ถ้าวัตถุดิบถูกใช้ในสูตรหรือมีประวัติสต็อก MySQL จะ throw error code ER_ROW_IS_REFERENCED_2
exports.remove = async (id) => {
  const [result] = await db.query("DELETE FROM ingredients WHERE ingredient_id = ?", [id]);
  return result.affectedRows > 0;
};
