# AI Usage Declaration — Week 9

## การใช้ AI ในงานนี้ (AI Usage Declaration)

### 1. ใช้ AI หรือไม่?

- [ ] ไม่ได้ใช้ AI
- [x] ใช้ AI (กรุณาระบุรายละเอียด)

### 2. เครื่องมือ AI ที่ใช้:

- ChatGPT
- Claude ผ่าน Antigravity IDE

### 3. งานส่วนไหนใช้ AI:

- [x] Requirement Analysis - ส่วน: วิเคราะห์ Business Rules และ Flow การสั่งซื้อ
- [x] Database Design - ส่วน: ปรับ Schema เพื่อรองรับ branch_id ป้องกัน IDOR
- [x] System Architecture - ส่วน: ออกแบบ Sequence Diagram และ Flowchart, อัปเดต API (Menu/Order) ให้ใช้ Transaction
- [ ] Document/Grammar Check
- [ ] อื่นๆ

### 4. Prompt ที่ใช้ (ตัวอย่าง):

#### ChatGPT

> "เตรียมเนื้อหา Sequence Diagram และ Business Rules + Flowchart สำหรับ Week 9 ช่วยวิเคราะห์โปรเจกต์ร้านกาแฟ (Cafe POS) โดยอ้างอิงจาก Use Case, Schema SQL และ Class Diagram เดิม"

#### Claude ผ่าน Antigravity IDE

> "สร้าง CRUD API สำหรับเมนู โดยบังคับเช็ค branchId ป้องกัน IDOR และปรับปรุง POST /api/orders ให้ตรงกับ Sequence Diagram ของ wk09 โดยใช้ Database Transaction รวบยอดรายการซ้ำ และเช็คสต็อกก่อนตัด"

### 5. ผลลัพธ์จาก AI:

AI ช่วยวิเคราะห์ Flow การทำงานของระบบ Cafe POS จนได้ข้อสรุปเป็น Sequence Diagram และ Flowchart ที่มีความครอบคลุม 

สำหรับด้าน Coding: AI ช่วยสร้างและปรับโครงสร้างของ Menu API (รองรับ `branch_id`) และรื้อโครงสร้าง Order API ให้รองรับการประมวลผลแบบ Database Transaction (`BEGIN`, `COMMIT`, `ROLLBACK`) ทำให้ระบบตัดสต็อกและบันทึกออเดอร์ได้อย่างปลอดภัย ไม่เสี่ยงข้อมูลผิดพลาด

### 6. การปรับแต่งของนิสิตเอง:

นิสิตเป็นผู้ตรวจสอบความสมเหตุสมผลของ Sequence Diagram ตรวจทานเงื่อนไข Business Rules และตัดสินใจเรื่องโครงสร้างโค้ด (MVC) ว่าทิศทางที่ AI เขียนมานั้นตอบโจทย์ Use Case จริงหรือไม่ รวมถึงเป็นผู้อนุมัติการปรับ Schema ฐานข้อมูลให้รองรับการตรวจสอบสาขา

### 7. เหตุผลในการใช้ AI:

ใช้เพื่อประหยัดเวลาในการร่าง Diagram (Mermaid) และเพื่อช่วยตรวจสอบ Logic ที่มีความซับซ้อน เช่น การเขียน Database Transaction ควบคู่กับการคำนวณสูตรอาหารเพื่อตัดสต็อก ซึ่งเป็นส่วนที่เกิดบั๊กได้ง่ายหากเขียนเองทั้งหมด

---

## 8. Diagram/เอกสารต้นทางของงานนี้:

- `wk04-user-stories.md` (Use Case)
- `schema.sql` (โครงสร้าง DB สัปดาห์ 7)
- โครงสร้าง Model และ Controller เดิมจากสัปดาห์ที่ 8

---

## 9. ส่วนที่ AI ช่วยเขียน/แก้ไข:

- `wk09.md` (สร้างเอกสาร Sequence Diagram และ Flowchart)
- `schema.sql` (เพิ่ม `branch_id` ให้ตารางเมนู)
- `src/models/menuModel.js`, `src/controllers/menuController.js`, `src/routes/menuRoutes.js` (สร้าง Menu API)
- `src/models/orderModel.js`, `src/controllers/orderController.js` (รื้อปรับ Order API รองรับ Transaction)
- `src/app.js` (เชื่อมต่อ Route ใหม่)

---

## 10. สมาชิกที่อธิบายโค้ดส่วนนี้ได้:

- สมาชิกที่รับผิดชอบส่วนนี้สามารถอธิบาย Flow ของ Sequence Diagram, การทำงานของ Database Transaction, และวิธีป้องกัน IDOR ด้วย `branch_id`

---

## 11. โค้ด/schema/สถาปัตยกรรมมีจุดใดต่างจาก diagram เดิมหรือไม่:

- [ ] ไม่ต่าง
- [x] ต่าง — เหตุผล: มีการเพิ่มคอลัมน์ `branch_id` ในตาราง `menu_items` ภายในไฟล์ `schema.sql` เพื่อให้สอดคล้องกับ Requirement ด้านความปลอดภัย (IDOR) ในการจัดการ API 

และได้ปรับปรุง diagram/เอกสารของสัปดาห์นี้ให้ตรงกับโครงสร้างล่าสุดแล้ว:

- [x] แล้ว
- [ ] ยังไม่ได้ปรับ

---

## Repository

[https://github.com/YupakornSorntrun/cafe-pos-group16.git](https://github.com/YupakornSorntrun/cafe-pos-group16.git)
