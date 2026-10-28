const db = require("../config/db");

// lookupModel.js — ข้อมูลอ้างอิงที่หน้าเว็บใช้ทำ dropdown (สาขา, หมวดหมู่)

// ดึงทุกสาขา (สำหรับเจ้าของ)
exports.findAllBranches = async () => {
  const [rows] = await db.query("SELECT branch_id, name, address FROM branches ORDER BY branch_id");
  return rows;
};

// ดึงสาขาเดียว (สำหรับแคชเชียร์ที่เห็นเฉพาะสาขาตัวเอง)
exports.findBranchById = async (branchId) => {
  const [rows] = await db.query(
    "SELECT branch_id, name, address FROM branches WHERE branch_id = ?",
    [branchId]
  );
  return rows;
};

exports.findAllCategories = async () => {
  const [rows] = await db.query("SELECT category_id, name FROM categories ORDER BY category_id");
  return rows;
};
