# AI Usage Declaration — Week 7

## การใช้ AI ในงานนี้ (AI Usage Declaration)

### 1. ใช้ AI หรือไม่?

- [ ] ไม่ได้ใช้ AI
- [x] ใช้ AI (กรุณาระบุรายละเอียด)

### 2. เครื่องมือ AI ที่ใช้:

- ChatGPT
- Claude ผ่าน Antigravity IDE

### 3. งานส่วนไหนใช้ AI:

- [x] Requirement Analysis - ส่วน: สอบทาน Use Case เทียบกับ ER Diagram เพื่อหาช่องโหว่ (Gap Analysis)
- [x] Database Design - ส่วน: ER Diagram, Entity/Relationship, Cardinality และการตรวจสอบ 3NF
- [x] System Architecture - ส่วน: `schema.sql` และ Model ที่เกี่ยวข้องกับฐานข้อมูล
- [ ] Document/Grammar Check
- [ ] อื่นๆ

### 4. Prompt ที่ใช้ (ตัวอย่าง):

#### ChatGPT

> "จาก requirement ของระบบร้านกาแฟและ ER Diagram ที่กำหนด ช่วยวิเคราะห์โครงสร้างฐานข้อมูล ตรวจสอบ entity, attribute, primary key, foreign key, cardinality และ 3NF รวมถึงช่วยเขียน prompt สำหรับสั่ง AI Coding Agent ให้สร้าง schema.sql และ Model ให้สอดคล้องกับ ER Diagram"

#### Claude ผ่าน Antigravity IDE

> "ช่วยตรวจสอบและปรับปรุง ER Diagram + `schema.sql` ของระบบ Cafe POS โดยให้สอดคล้องกับ Use Case Description ของกลุ่ม โดยต้องวิเคราะห์ช่องโหว่ (Gap Analysis) และเชื่อมโยงทุกส่วนเข้าด้วยกันแบบ Top-Down (Use Case → ER → Schema)"

### 5. ผลลัพธ์จาก AI:

AI ช่วยวิเคราะห์และตรวจสอบโครงสร้างฐานข้อมูลของระบบ Cafe POS โดยแนะนำให้มี entity ได้แก่ Branches, Employees, Categories, Menu Items, Ingredients, Menu Item Ingredients, Orders, Order Items, Stock Movements และ Receipts พร้อมระบุ primary key, foreign key และ cardinality ของแต่ละความสัมพันธ์

นอกจากนี้ AI ช่วยสอบทาน `wk04-user-stories.md` (Use Case) เทียบกับ ER Diagram และพบช่องโหว่ของข้อมูล (เช่น ขาดประเภทการทาน, เลขโต๊ะ, ส่วนลด, เงินที่รับ, เงินทอน, สถานะบาริสต้า, ใบเสร็จ) จึงได้ช่วยปรับแก้ `schema.sql` และ `wk07-er-diagram.md` ให้เชื่อมโยงกันอย่างสมบูรณ์แบบ 100%

สำหรับส่วน Coding AI ถูกใช้เป็นผู้ช่วยในการตรวจสอบและปรับโค้ด Model และ Controller ให้รองรับฟิลด์ใหม่ทั้งหมด

### 6. การปรับแต่งของนิสิตเอง:

นิสิตเป็นผู้กำหนดโครงสร้างฐานข้อมูลและตรวจสอบความถูกต้องของข้อมูลก่อนนำไปใช้จริง โดยเลือกและปรับ entity, attribute, relationship และ cardinality ให้สอดคล้องกับ requirement ของระบบร้านกาแฟและ Class Diagram จากสัปดาห์ที่ 6

นอกจากนี้ นิสิตตรวจสอบ field ของ Model และ column ใน `schema.sql` ด้วยตนเอง และปรับแก้โครงสร้างในส่วนที่ไม่ตรงกับ ER Diagram

กรณีที่ AI เสนอแนวทางเพิ่มเติม นิสิตเป็นผู้ตัดสินใจว่าจะนำมาใช้หรือไม่ และตรวจสอบผลลัพธ์ก่อนนำไปใช้ใน repository

### 7. เหตุผลในการใช้ AI:

ใช้ AI เพื่อช่วยตรวจสอบความถูกต้องและความสอดคล้องของ ER Diagram, Database Schema และ Model รวมถึงช่วยลดข้อผิดพลาดในการเขียน SQL และโค้ด Model

AI ถูกใช้เป็นเครื่องมือช่วยวิเคราะห์และตรวจสอบ ไม่ได้ใช้แทนการตัดสินใจเกี่ยวกับการออกแบบระบบของนิสิต

---

## 8. Diagram/เอกสารต้นทางของงานนี้:

- `CASE-STUDY-COFFEE-SHOP-STD.md`
- Class Diagram จากสัปดาห์ที่ 6
- `wk04-user-stories.md` (Use Case Description)
- ER Diagram ของระบบ Cafe POS Week 7
- Requirement ของงาน Week 7
- โครงสร้าง Model และ Controller ที่มีอยู่จาก Sprint ก่อนหน้า

---

## 9. ส่วนที่ AI ช่วยเขียน/แก้ไข:

AI ช่วยตรวจสอบและปรับปรุงส่วนที่เกี่ยวข้องกับ Requirement, Database, และ Model ได้แก่

- `schema.sql` (ปรับโครงสร้างใหม่เป็น 10 ตาราง)
- `wk07-er-diagram.md` (เพิ่มความสัมพันธ์ Receipts)
- `src/models/menuModel.js`
- `src/models/orderModel.js`
- `src/controllers/orderController.js`

รวมถึงช่วยตรวจสอบความสอดคล้องระหว่างเอกสารทุกขั้นตอน (Top-Down)

> หมายเหตุ: รายการไฟล์ด้านบนให้ปรับตามไฟล์ที่ AI ได้แก้จริงใน repository ก่อนส่งงาน

---

## 10. สมาชิกที่อธิบายโค้ดส่วนนี้ได้:

- สมาชิกที่รับผิดชอบส่วนนี้สามารถอธิบายโครงสร้าง ER Diagram, ความสัมพันธ์ระหว่างตาราง, Primary Key, Foreign Key และการ mapping ระหว่าง Model กับ Database ได้

---

## 11. โค้ด/schema/สถาปัตยกรรมมีจุดใดต่างจาก diagram เดิมหรือไม่:

- [ ] ไม่ต่าง
- [x] ต่าง — เหตุผล: มีการวิเคราะห์ Use Case เพิ่มเติมร่วมกับ ER Diagram (Gap Analysis) จึงมีการปรับโครงสร้างให้สอดคล้องกันแบบ Top-Down โดยเพิ่มตาราง `receipts` และเพิ่ม 7 ฟิลด์ใน `orders` (`order_type`, `table_number`, `subtotal_amount`, `discount_amount`, `amount_received`, `change_amount`, `barista_status`) เพื่อให้รองรับการทำงานได้จริงตาม Use Case

และได้ปรับปรุง diagram/เอกสารของสัปดาห์นี้ให้ตรงกับโครงสร้างล่าสุดแล้ว:

- [x] แล้ว
- [ ] ยังไม่ได้ปรับ

---

## Repository

[https://github.com/YupakornSorntrun/cafe-pos-group16.git](https://github.com/YupakornSorntrun/cafe-pos-group16.git)