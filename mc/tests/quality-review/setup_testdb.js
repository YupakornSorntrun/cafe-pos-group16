// สร้างฐานข้อมูลทดสอบชั่วคราว (cafe_pos_review_test) จาก schema.sql + seed.sql ของโปรเจกต์
// ไม่แตะฐานข้อมูลจริง (cafe_pos): แทนชื่อฐานข้อมูลในไฟล์ SQL ก่อนรัน
const fs = require("fs");
const ROOT = require("path").join(__dirname, "..", "..") + "/";
require(ROOT + "node_modules/dotenv").config({ path: ROOT + ".env" });
const mysql = require(ROOT + "node_modules/mysql2/promise");

const TEST_DB = "cafe_pos_review_test";
const action = process.argv[2] || "create";

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });

  await conn.query("DROP DATABASE IF EXISTS `" + TEST_DB + "`");
  if (action === "drop") {
    console.log("dropped", TEST_DB);
    await conn.end();
    return;
  }

  for (const file of ["schema.sql", "seed.sql"]) {
    let sql = fs.readFileSync(ROOT + file, "utf8");
    const count = sql.split("cafe_pos").length - 1;
    sql = sql.split("cafe_pos").join(TEST_DB);
    if (sql.includes("USE cafe_pos;") || sql.includes("cafe_pos;")) throw new Error("ยังเหลือชื่อฐานข้อมูลจริงในไฟล์ " + file);
    await conn.query(sql);
    console.log("loaded", file, "(แทนชื่อฐานข้อมูล " + count + " จุด)");
  }
  await conn.end();
  console.log("test database ready:", TEST_DB);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
