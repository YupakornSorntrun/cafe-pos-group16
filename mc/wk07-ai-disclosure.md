# AI Usage Declaration — Week 7

## การใช้ AI ในงานนี้ (AI Usage Declaration)

### 1. ใช้ AI หรือไม่?

- [ ] ไม่ได้ใช้ AI
- [x] ใช้ AI (กรุณาระบุรายละเอียด)

### 2. เครื่องมือ AI ที่ใช้:

- ChatGPT
- Claude ผ่าน Antigravity IDE

### 3. งานส่วนไหนใช้ AI:

- [ ] Requirement Analysis
- [x] Database Design - ส่วน: ER Diagram, Entity/Relationship, Cardinality และการตรวจสอบ 3NF
- [x] System Architecture - ส่วน: `schema.sql` และ Model ที่เกี่ยวข้องกับฐานข้อมูล
- [ ] Document/Grammar Check
- [ ] อื่นๆ

### 4. Prompt ที่ใช้ (ตัวอย่าง):

#### ChatGPT

> "จาก requirement ของระบบร้านกาแฟและ ER Diagram ที่กำหนด ช่วยวิเคราะห์โครงสร้างฐานข้อมูล ตรวจสอบ entity, attribute, primary key, foreign key, cardinality และ 3NF รวมถึงช่วยเขียน prompt สำหรับสั่ง AI Coding Agent ให้สร้าง schema.sql และ Model ให้สอดคล้องกับ ER Diagram"

#### Claude ผ่าน Antigravity IDE

> "วิเคราะห์โครงสร้างโปรเจกต์ปัจจุบันและเปรียบเทียบกับ ER Diagram ของระบบ Cafe POS Week 7 จากนั้นตรวจสอบและปรับ schema.sql และ Model ให้สอดคล้องกับ ER Diagram โดยตรวจสอบ field, primary key, foreign key, relationship และ 3NF โดยไม่เปลี่ยน architecture ของโปรเจกต์โดยไม่จำเป็น"

### 5. ผลลัพธ์จาก AI:

AI ช่วยวิเคราะห์และตรวจสอบโครงสร้างฐานข้อมูลของระบบ Cafe POS โดยแนะนำให้มี entity ได้แก่ Branches, Employees, Categories, Menu Items, Ingredients, Menu Item Ingredients, Orders, Order Items และ Stock Movements พร้อมระบุ primary key, foreign key และ cardinality ของแต่ละความสัมพันธ์

AI ยังช่วยตรวจสอบความสอดคล้องระหว่าง ER Diagram, `schema.sql` และ Model เช่น `MenuModel`, `OrderModel`, `OrderItemModel` และ `EmployeeModel` รวมถึงตรวจสอบเรื่อง normalization และ 3NF

สำหรับส่วน Coding AI ถูกใช้เป็นผู้ช่วยในการตรวจสอบและปรับโค้ดให้ field และ column สอดคล้องกับโครงสร้างฐานข้อมูลที่ออกแบบไว้

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
- ER Diagram ของระบบ Cafe POS Week 7
- Requirement ของงาน Week 7
- โครงสร้าง Model และ Controller ที่มีอยู่จาก Sprint ก่อนหน้า

---

## 9. ส่วนที่ AI ช่วยเขียนโค้ด:

AI ช่วยตรวจสอบและปรับปรุงส่วนที่เกี่ยวข้องกับ Database และ Model ได้แก่

- `wk07-schema.sql`
- `MenuModel`
- `OrderModel`
- `OrderItemModel`
- `EmployeeModel`

รวมถึงช่วยตรวจสอบความสอดคล้องระหว่างชื่อ field ใน Model กับ column ในฐานข้อมูล

> หมายเหตุ: รายการไฟล์ด้านบนให้ปรับตามไฟล์ที่ AI ได้แก้จริงใน repository ก่อนส่งงาน

---

## 10. สมาชิกที่อธิบายโค้ดส่วนนี้ได้:

- สมาชิกที่รับผิดชอบส่วนนี้สามารถอธิบายโครงสร้าง ER Diagram, ความสัมพันธ์ระหว่างตาราง, Primary Key, Foreign Key และการ mapping ระหว่าง Model กับ Database ได้

---

## 11. โค้ด/schema/สถาปัตยกรรมมีจุดใดต่างจาก diagram เดิมหรือไม่:

- [ ] ไม่ต่าง
- [x] ต่าง — เหตุผล: มีการปรับโครงสร้าง Database และ Model ให้สอดคล้องกับ ER Diagram ของ Week 7 ซึ่งมีการเพิ่ม/ปรับ entity เช่น `branches`, `categories`, `ingredients`, `menu_item_ingredients` และ `stock_movements` รวมถึงเพิ่ม `payment_status` ใน `orders`

และได้ปรับปรุง diagram/เอกสารของสัปดาห์นี้ให้ตรงกับโครงสร้างล่าสุดแล้ว:

- [x] แล้ว
- [ ] ยังไม่ได้ปรับ

---

## Repository

[https://github.com/YupakornSorntrun/cafe-pos-group16.git](https://github.com/YupakornSorntrun/cafe-pos-group16.git)