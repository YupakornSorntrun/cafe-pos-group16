# Week 7 — AI Work Summary

> เอกสารนี้สรุปสิ่งที่ AI ช่วยสร้าง แก้ไข และปรับปรุงในโปรเจกต์ Cafe POS Week 7
> อ้างอิงจากไฟล์จริงในโปรเจกต์และ git history (commit `8c5e4f3`)

---

## 1. สรุปภาพรวม

AI ช่วยงาน Week 7 ในด้านต่อไปนี้:

- **Database Design** — ออกแบบและเขียน `schema.sql` ใหม่ทั้งหมด ให้ตรงกับ ER Diagram ของ Week 7 และปรับปรุงโครงสร้างเพิ่มเติมให้สอดคล้องกับ **Use Case Description** 100% (เพิ่ม 7 ฟิลด์ใหม่และ 1 ตาราง)
- **ER Diagram** — สร้างและอัปเดต ER Diagram (`wk07-er-diagram.md`) ให้ตรงกับ Schema และ Use Case ล่าสุด
- **Seed Data** — สร้างไฟล์ `seed.sql` สำหรับข้อมูลจำลองเพื่อทดสอบ
- **Model / Controller / Route** — สร้าง/แก้ไข Model และ Controller เพื่อรองรับโครงสร้างใหม่
- **App Configuration** — เพิ่ม middleware (helmet, cors, morgan) และ 404 handler
- **เอกสาร** — ปรับปรุง `DATABASE_SETUP.md` และสร้าง `wk07-ai-disclosure.md`

---

## 2. ไฟล์ที่ AI สร้างใหม่

| ไฟล์ | หน้าที่ | AI ทำอะไร |
|---|---|---|
| `src/models/menuModel.js` | CRUD สำหรับตาราง `menu_items` | สร้างใหม่ทั้งไฟล์ — มี function: `create`, `findAll`, `findById`, `findIngredientsByMenuId`, `update`, `deleteMenu` |
| `seed.sql` | ข้อมูลจำลองสำหรับทดสอบ | สร้างใหม่ — มี seed data ครบทุกตาราง (branches, employees, categories, menu_items, ingredients, menu_item_ingredients) |
| `wk07-ai-disclosure.md` | เอกสารรายงานการใช้ AI | สร้างใหม่ — ระบุรายละเอียดการใช้ AI ในงาน Week 7 |

---

## 3. ไฟล์ที่ AI แก้ไข

| ไฟล์ | AI แก้อะไร | เหตุผล |
|---|---|---|
| `schema.sql` | เขียนใหม่ทั้งหมด (10 ตาราง) เพิ่ม `order_type`, `table_number`, ยอดเงินต่างๆ, สถานะบาริสต้า และตาราง `receipts` | ให้ตรงกับ ER Diagram และ **Use Case Description** ของ Week 7 |
| `wk07-er-diagram.md` | สร้างและอัปเดตความสัมพันธ์เพิ่ม `RECEIPTS` และฟิลด์ใหม่ใน `ORDERS` | สะท้อนความเปลี่ยนแปลงของ Database |
| `src/models/orderModel.js` | แก้ไขทั้งหมด — เพิ่ม `branchId`, `employeeId`, `payment_status` | ให้ field ตรงกับ `schema.sql` (รอกำลังอัปเดตฟิลด์ใหม่) |
| `src/controllers/orderController.js` | เพิ่ม validation และ feature ลบรายการสินค้าเฉพาะรายการ | รองรับโครงสร้าง schema ใหม่ |
| `src/routes/orderRoutes.js` | เพิ่ม route `DELETE /:orderId/items/:itemId` | รองรับ feature ลบรายการสินค้าเฉพาะรายการ |
| `DATABASE_SETUP.md` | เพิ่มหัวข้อ: Import Seed Data, ทดสอบ API ด้วย Postman | ให้สมาชิกทุกคนทดสอบระบบได้ง่าย |
| `package.json` | เพิ่ม dependencies: `helmet`, `cors`, `morgan` | รองรับ middleware ใหม่ |

---

## 4. Database Schema

AI ทำการ**เขียน `schema.sql` ใหม่ทั้งหมด** โดยอ้างอิงจาก ER Diagram ของ Week 7

### สิ่งที่เปลี่ยนจากเดิม

**ก่อนหน้า Week 7** — `schema.sql` มีแค่:
```sql
CREATE DATABASE IF NOT EXISTS cafe_pos;
USE cafe_pos;
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_method VARCHAR(20) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL
);
```

**หลัง Week 7** — `schema.sql` มี 10 ตาราง:

| ตาราง | Primary Key | Foreign Key | หมายเหตุ |
|---|---|---|---|
| `branches` | `branch_id` | — | ข้อมูลสาขา |
| `employees` | `employee_id` | `branch_id` → `branches` | พนักงาน มี role เป็น ENUM('barista', 'cashier') |
| `categories` | `category_id` | — | หมวดหมู่เมนู |
| `menu_items` | `menu_id` | `category_id` → `categories` | เมนูสินค้า |
| `ingredients` | `ingredient_id` | — | วัตถุดิบ มี `stock_quantity` (cached) และ `low_stock_threshold` |
| `menu_item_ingredients` | (`menu_id`, `ingredient_id`) | `menu_id` → `menu_items`, `ingredient_id` → `ingredients` | Junction table (M:N) |
| `orders` | `order_id` | `branch_id`, `employee_id` | เพิ่มฟิลด์ให้ตรงกับ Use Case: `order_type`, `table_number`, `subtotal_amount`, `discount_amount`, `amount_received`, `change_amount`, `barista_status` |
| `order_items` | `order_item_id` | `order_id` → `orders`, `menu_id` → `menu_items` | แยกรายการสินค้าออกจาก orders |
| `stock_movements` | `movement_id` | `ingredient_id`, `order_id` | บันทึกการเคลื่อนไหวสต็อก |
| `receipts` | `receipt_id` | `order_id` → `orders` | ตารางใหม่ — เก็บประวัติการออกใบเสร็จ |

### สิ่งที่เพิ่ม/ปรับล่าสุดเพื่อเชื่อม Use Case:
- เพิ่มตาราง **receipts**
- เพิ่มฟิลด์เกี่ยวกับประเภทการทาน (dine_in/takeaway) และเลขโต๊ะ (`orders.order_type`, `orders.table_number`)
- เพิ่มฟิลด์เกี่ยวกับการเงิน: ยอดก่อนลด, ส่วนลด, เงินที่รับ, เงินทอน (`subtotal_amount`, `discount_amount`, `amount_received`, `change_amount`)
- เพิ่มคิวบาริสต้า (`orders.barista_status`)

---

## 5. Model

### menuModel.js (สร้างใหม่)

- **ใช้จัดการข้อมูล:** เมนูสินค้า (ตาราง `menu_items`)
- **Field สำคัญ:** `menu_id`, `category_id`, `name`, `price`
- **Table ที่เกี่ยวข้อง:** `menu_items`, `categories`, `menu_item_ingredients`, `ingredients`
- **Function ที่มี:**
  - `create(categoryId, name, price)` — เพิ่มเมนูใหม่
  - `findAll()` — ดึงเมนูทั้งหมด พร้อม JOIN ชื่อ category
  - `findById(menuId)` — ดึงเมนูตาม ID
  - `findIngredientsByMenuId(menuId)` — ดึงวัตถุดิบที่เมนูนี้ใช้ (ผ่าน junction table `menu_item_ingredients`)
  - `update(menuId, categoryId, name, price)` — แก้ไขเมนู
  - `deleteMenu(menuId)` — ลบเมนู

### orderModel.js (แก้ไข)

- **ใช้จัดการข้อมูล:** ออเดอร์และรายการสินค้าในออเดอร์ (ตาราง `orders` + `order_items`)
- **Field สำคัญ:**
  - orders: `order_id`, `branch_id`, `employee_id`, `payment_method`, `payment_status`, `total_amount`, `created_at`
  - order_items: `order_item_id`, `order_id`, `menu_id`, `quantity`, `unit_price`
- **Table ที่เกี่ยวข้อง:** `orders`, `order_items`, `stock_movements`

**สิ่งที่ AI แก้ไข:**

| เดิม (ก่อน Week 7) | ใหม่ (หลัง Week 7) |
|---|---|
| `create(paymentMethod, totalAmount)` | `create(branchId, employeeId, paymentMethod, totalAmount)` — เพิ่ม branchId, employeeId, payment_status |
| `findAll()` ใช้ `SELECT *` | `findAll()` ระบุ column ชัดเจนทั้งหมด |
| `deleteOrder()` ใช้ `WHERE id = ?` | `deleteOrder()` ใช้ `WHERE order_id = ?` และจัดการ FK ก่อนลบ (set NULL ใน stock_movements, ลบ order_items) |
| ไม่มี findById | เพิ่ม `findById(orderId)` |
| ไม่มี updatePaymentStatus | เพิ่ม `updatePaymentStatus(orderId, paymentStatus)` |
| ไม่มี createOrderItem | เพิ่ม `createOrderItem(orderId, menuId, quantity, unitPrice)` |
| ไม่มี findOrderItems | เพิ่ม `findOrderItems(orderId)` |
| ไม่มี deleteOrderItem | เพิ่ม `deleteOrderItem(orderId, orderItemId)` — ลบพร้อมหักยอดเงิน |

---

## 6. ความสัมพันธ์ระหว่าง ER Diagram, schema.sql และ Model

```
ER Diagram (Week 7 Requirement)
       ↓
  schema.sql  ← Source of Truth ของโครงสร้างฐานข้อมูล
       ↓
     Model    ← SQL query ใช้ชื่อ table/column ตรงกับ schema.sql
       ↓
  Controller  ← เรียกใช้ Model / ทำ validation
       ↓
    Route     ← กำหนด HTTP endpoint
```

### ตัวอย่างความสอดคล้อง (จากโค้ดจริง)

| ER Diagram Entity | Table ใน `schema.sql` | Field ที่ Model ใช้ |
|---|---|---|
| Menu Item | `menu_items` | `menu_id`, `category_id`, `name`, `price` (ใน `menuModel.js`) |
| Category | `categories` | `category_id`, `name` (JOIN ใน `menuModel.findAll`) |
| Menu Item ↔ Ingredient | `menu_item_ingredients` | `menu_id`, `ingredient_id`, `quantity_used` (ใน `menuModel.findIngredientsByMenuId`) |
| Order | `orders` | `order_id`, `branch_id`, `employee_id`, `payment_method`, `payment_status`, `total_amount`, `created_at` (ใน `orderModel.js`) |
| Order Item | `order_items` | `order_item_id`, `order_id`, `menu_id`, `quantity`, `unit_price` (ใน `orderModel.js`) |
| Stock Movement | `stock_movements` | `order_id` (ใน `orderModel.deleteOrder` — set NULL ก่อนลบ order) |

### FK ที่ Model ต้องจัดการ

- `orderModel.create()` — ต้องรับ `branchId` และ `employeeId` เพราะ `orders` มี FK ไปที่ `branches` และ `employees`
- `orderModel.createOrderItem()` — ต้องรับ `menuId` เพราะ `order_items` มี FK ไปที่ `menu_items`
- `orderModel.deleteOrder()` — ต้อง set `stock_movements.order_id = NULL` ก่อนลบ order เพราะมี FK
- `menuModel.findAll()` — JOIN กับ `categories` เพราะ `menu_items.category_id` เป็น FK

---

## 7. การตรวจสอบความถูกต้อง

| รายการตรวจสอบ | สถานะ |
|---|---|
| Entity ตรงกับ ER Diagram (10 entity) | ✅ ตรง |
| Table ใน `schema.sql` ครบ 10 ตาราง | ✅ ครบ |
| Primary Key ถูกต้องทุกตาราง | ✅ ถูกต้อง |
| Foreign Key ถูกต้องและมี constraint ครบ | ✅ ถูกต้อง |
| Column ตรงกับ ER Diagram | ✅ ตรง |
| Model field ตรงกับ `schema.sql` | ✅ ตรง — `menuModel.js` ใช้ field ตรงกับ `menu_items`, `orderModel.js` ใช้ field ตรงกับ `orders` และ `order_items` |
| SQL query ใช้ชื่อ column ถูกต้อง | ✅ ถูกต้อง — ไม่มี `SELECT *`, ระบุ column ชัดเจน |
| ไม่มี field ที่ไม่จำเป็น | ✅ ไม่มี |
| ไม่มี field สำคัญที่ขาด | ✅ ไม่ขาด |
| Relationship ตรงกัน (1:M, M:N) | ✅ ตรง — `menu_item_ingredients` เป็น junction table สำหรับ M:N ระหว่าง `menu_items` กับ `ingredients` |

> **หมายเหตุ:** ในโค้ด comment ของ `menuModel.js` (บรรทัด 5) และ `orderModel.js` (บรรทัด 49) ยังเขียนว่า "ตรงกับ wk07-schema.sql" — เนื่องจาก schema ของ Week 7 ถูก merge เข้ากับ `schema.sql` หลักแล้ว ข้อความนี้ควรเข้าใจว่าหมายถึง `schema.sql` ปัจจุบัน

---

## 8. อธิบายแบบภาษาคน

### AI ทำอะไร?

AI ช่วยออกแบบและเขียนฐานข้อมูลใหม่ทั้งหมดใน `schema.sql` และช่วยปรับ **ER Diagram** ให้ตรงกับ **Use Case Description** 100% จากเดิมที่มีแค่ตาราง `orders` อย่างเดียว เพิ่มเป็น 10 ตาราง ครบทุก Entity ที่ระบบ Cafe POS ต้องการ จากนั้นปรับ Model ให้ใช้ชื่อ column ตรงกับ schema ใหม่ สร้าง `menuModel.js` ใหม่ทั้งไฟล์ ปรับ Controller ให้รองรับ field ใหม่

### ทำไปเพื่ออะไร?

- ให้โครงสร้างฐานข้อมูลตรงกับ ER Diagram ที่ออกแบบไว้ใน Week 7
- ให้ Model ใช้ชื่อ field/column ถูกต้องตรงกับ `schema.sql` ไม่มีปัญหา query ผิด column
- ให้ระบบรองรับข้อมูลจริง เช่น สาขา พนักงาน หมวดหมู่เมนู วัตถุดิบ และการเคลื่อนไหวสต็อก
- ให้สมาชิกทดสอบ API ได้ทันทีด้วย seed data และคู่มือ Postman

### ถ้าต้องอธิบายให้อาจารย์ฟัง

> "สัปดาห์ที่ 7 กลุ่มเราได้นำ Use Case Description มาสอบทานกับ ER Diagram และพบช่องโหว่ จึงใช้ AI ช่วยแปลงและปรับปรุง ER Diagram และ SQL Schema ให้ครบถ้วนสมบูรณ์ (10 ตาราง) จากนั้นปรับ Model ที่มีอยู่ให้ตรงกับฐานข้อมูลใหม่ โดยทุกส่วนผ่านการตรวจสอบให้สอดคล้องกันแบบ Top-Down (Use Case → ER → Schema → Code)"

---

## 9. สิ่งที่สมาชิกควรเข้าใจก่อนส่งงาน

- [ ] เข้าใจหน้าที่ของแต่ละตาราง (10 ตาราง) — ทำไมถึงต้องมีตารางนี้
- [ ] เข้าใจ Primary Key ของแต่ละตาราง — เช่น `branch_id`, `employee_id`, `menu_id`, `order_id`
- [ ] เข้าใจ Foreign Key — ตาราง A ชี้ไปหาตาราง B อย่างไร เช่น `employees.branch_id` → `branches.branch_id`
- [ ] เข้าใจ Order กับ Order Item — ทำไมต้องแยกเป็น 2 ตาราง (1 order มีหลาย item)
- [ ] เข้าใจ Menu Item กับ Category — เมนูแต่ละรายการอยู่ในหมวดหมู่ใด
- [ ] เข้าใจ Ingredient กับ Menu Item Ingredients — Junction table สำหรับ M:N (1 เมนูใช้หลายวัตถุดิบ, 1 วัตถุดิบใช้ในหลายเมนู)
- [ ] เข้าใจ Stock Movement — ทำไมต้องมีตารางนี้ (บันทึกการเคลื่อนไหวสต็อก: sale, restock, adjustment)
- [ ] เข้าใจว่า `ingredients.stock_quantity` เป็น cached value (denormalization) ที่ต้อง sync กับ `stock_movements`
- [ ] เข้าใจว่า Model เชื่อมกับ Database อย่างไร — Model เรียก SQL query ที่ใช้ชื่อ column ตรงกับ `schema.sql`
- [ ] สามารถอธิบายสิ่งที่ AI แก้ไขได้ — เช่น ทำไม `orders` ถึงเพิ่ม `branch_id` และ `employee_id`

---

## 10. สรุปสั้น ๆ

**AI ช่วยอะไรใน Week 7:**
- นำ Use Case, ER Diagram, และ schema.sql มา **Sync ให้ตรงกัน 100%**
- เขียน `schema.sql` ใหม่ทั้งหมด (10 ตาราง + FK + Index) เพื่ออุดรอยรั่วของ Use Case
- สร้าง `menuModel.js` (CRUD สำหรับเมนู) และ `seed.sql` (ข้อมูลจำลอง)
- แก้ไข `orderModel.js`, `orderController.js` ให้รองรับ schema เบื้องต้น (เตรียมอัปเดตต่อให้สมบูรณ์)
- จัดทำสรุปความสัมพันธ์ของเอกสารทั้งหมด

**สมาชิกต้องเข้าใจอะไร:**
- โครงสร้างตาราง 10 ตาราง และความสัมพันธ์ระหว่างกัน (PK, FK, Junction Table)
- ทำไม Model ต้องใช้ชื่อ column ตรงกับ `schema.sql`
- Flow การทำงาน: ER Diagram → schema.sql → Model → Controller → Route
- สามารถอธิบายให้อาจารย์ฟังได้ว่าแต่ละตารางมีไว้ทำอะไร และ AI ช่วยในส่วนไหน
