const db = require("../config/db");

// employeeModel.js — คำสั่ง SQL ของตาราง employees (พนักงาน)

// หาพนักงานจาก username (ใช้ตอนล็อกอิน) ถ้าไม่เจอคืน undefined
exports.findByUsername = async (username) => {
  const [rows] = await db.query(
    "SELECT employee_id, branch_id, name, role, password_hash FROM employees WHERE username = ?",
    [username]
  );
  return rows[0];
};
