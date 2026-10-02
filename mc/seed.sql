-- ข้อมูลจำลองสำหรับทดสอบ API (รันหลังจากรัน schema.sql แล้ว)

USE cafe_pos;
SET NAMES utf8mb4;

-- ล้างข้อมูลเก่า
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE order_items;
TRUNCATE TABLE receipts;
TRUNCATE TABLE stock_movements;
TRUNCATE TABLE orders;
TRUNCATE TABLE menu_item_ingredients;
TRUNCATE TABLE ingredients;
TRUNCATE TABLE menu_items;
TRUNCATE TABLE categories;
TRUNCATE TABLE employees;
TRUNCATE TABLE branches;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. สาขา
INSERT INTO branches (name, address) VALUES ('สาขาสยาม', 'Bangkok');

-- 2. พนักงาน
INSERT INTO employees (branch_id, name, role) VALUES (1, 'สมชาย (Cashier)', 'cashier');

-- 3. หมวดหมู่
INSERT INTO categories (name) VALUES ('เครื่องดื่มเย็น');

-- 4. เมนู (อัปเดตใหม่ต้องมี branch_id)
INSERT INTO menu_items (branch_id, category_id, name, price) VALUES 
(1, 1, 'ชาไทยเย็น', 50.00),
(1, 1, 'ลาเต้เย็น', 60.00);

-- 5. วัตถุดิบ
INSERT INTO ingredients (name, unit, stock_quantity, low_stock_threshold) VALUES 
('ใบชาไทย', 'g', 1000.00, 200.00),
('เมล็ดกาแฟ', 'g', 1000.00, 200.00),
('นมข้นหวาน', 'ml', 2000.00, 500.00),
('แก้วพลาสติก', 'pcs', 100.00, 20.00);

-- 6. สูตรส่วนผสม
-- ชาไทยเย็น ใช้ ใบชา 20g, นมข้น 30ml, แก้ว 1 ใบ
INSERT INTO menu_item_ingredients (menu_id, ingredient_id, quantity_used) VALUES 
(1, 1, 20.00),
(1, 3, 30.00),
(1, 4, 1.00);

-- ลาเต้เย็น ใช้ กาแฟ 18g, นมข้น 20ml, แก้ว 1 ใบ
INSERT INTO menu_item_ingredients (menu_id, ingredient_id, quantity_used) VALUES 
(2, 2, 18.00),
(2, 3, 20.00),
(2, 4, 1.00);
