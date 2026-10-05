require("dotenv").config();

const mysql = require("mysql2/promise");

// pool = กลุ่มการเชื่อมต่อฐานข้อมูลที่ใช้ซ้ำได้ (ค่าเชื่อมต่ออ่านจากไฟล์ .env)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: "+07:00", // อ่าน/เขียน DATETIME เป็นเวลาไทย
  dateStrings: ["DATE"], // คอลัมน์ DATE (queue_date) คืนเป็น "YYYY-MM-DD" ไม่แปลงเป็น Date
});

// ให้ NOW() ใน SQL เป็นเวลาไทยด้วย (ไม่ขึ้นกับ timezone ของ MySQL server/Docker)
pool.pool.on("connection", (conn) => conn.query("SET time_zone = '+07:00'"));

module.exports = pool;