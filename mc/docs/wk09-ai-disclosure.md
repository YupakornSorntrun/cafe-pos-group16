# AI Usage Declaration — Week 9 (Coding Sprint)

## การใช้ AI ในงานนี้ (AI Usage Declaration)

### 1. ใช้ AI หรือไม่?

- [ ] ไม่ได้ใช้ AI
- [x] ใช้ AI (กรุณาระบุรายละเอียด)

### 2. เครื่องมือ AI ที่ใช้:

- ChatGPT (ช่วยคิดและร่างเนื้อหา)
- Claude ผ่าน Antigravity IDE (ช่วยเขียนและแก้โค้ด)

### 3. งานส่วนไหนใช้ AI:

- [x] Requirement Analysis - ส่วน: วิเคราะห์ Business Rules และ Flow การสั่งซื้อ
- [x] Database Design - ส่วน: เพิ่ม `branch_id` ในตารางเมนู (กัน IDOR), เพิ่มสถานะ `voided` ในตาราง `orders`, เอาคอลัมน์ที่คำนวณได้ออกจากตาราง `orders`
- [x] System Architecture - ส่วน: ออกแบบ Sequence Diagram และ Flowchart, เขียน API เมนูและออเดอร์ให้ใช้ Transaction
- [ ] Document/Grammar Check
- [ ] อื่นๆ

### 4. Prompt ที่ใช้ (ตัวอย่าง):

#### ChatGPT

> "เตรียมเนื้อหา Sequence Diagram และ Business Rules + Flowchart สำหรับ Week 9 ช่วยวิเคราะห์โปรเจกต์ร้านกาแฟ (Cafe POS) โดยอ้างอิงจาก Use Case, Schema SQL และ Class Diagram เดิม"

#### Claude ผ่าน Antigravity IDE

> "สร้าง CRUD API สำหรับเมนู โดยบังคับเช็ค branchId ป้องกัน IDOR และปรับปรุง POST /api/orders ให้ตรงกับ Sequence Diagram ของ wk09 โดยใช้ Database Transaction รวบยอดรายการซ้ำ และเช็คสต็อกก่อนตัด"

### 5. ผลลัพธ์จาก AI:

**ด้านเอกสาร:** AI ช่วยร่าง Sequence Diagram, Business Rules (BR-01 ถึง BR-04) และ Flowchart ของ flow การสั่งซื้อ

**ด้านโค้ด** AI ช่วยเขียน 2 ส่วนหลัก:
- **API เมนู (CRUD):** ทุก method ต้องส่ง `branchId` และ backend เช็คสาขาก่อนเสมอ เพื่อไม่ให้ใครเข้าถึงเมนูของสาขาอื่น (กัน IDOR)
- **API ออเดอร์:** รื้อ `POST /api/orders` ใหม่ให้ตรงกับ Sequence Diagram คือ รวมเมนูที่สั่งซ้ำ → ตรวจสต็อกก่อน → ครอบการบันทึกด้วย Transaction (`BEGIN` / `COMMIT` / `ROLLBACK`) เพื่อให้บันทึกออเดอร์และตัดสต็อกสำเร็จพร้อมกันหรือไม่ก็ไม่ทำเลย และเพิ่มการยกเลิกบิลแบบเก็บประวัติไว้ (`DELETE /api/orders/:id` เปลี่ยนสถานะเป็น `voided` พร้อมคืนสต็อก)

### 6. การปรับแต่งของนิสิตเอง:


- ตรวจ Sequence Diagram และ Business Rules ว่าตรงกับ Use Case ของกลุ่มจริงไหม
- ตัดสินใจโครงสร้างโค้ดแบบ MVC (routes / controllers / models)
- อนุมัติการแก้ Schema (เพิ่ม `branch_id`, เพิ่ม `voided`, เอาคอลัมน์ที่คำนวณได้ออก)
- ทดสอบ flow ตามข้อ 4 ของโจทย์ด้วย Postman: **สต็อกไม่พอ**, **สั่งเมนูเดียวกันหลายบรรทัดในออเดอร์เดียว**, จ่ายเงินไม่พอ, ยกเลิกบิลซ้ำ, สั่งเมนูข้ามสาขา ผลคือระบบตอบ 400 พร้อมข้อความที่อ่านเข้าใจ

### 7. เหตุผลในการใช้ AI:

ใช้เพื่อประหยัดเวลาร่าง Diagram (เป็นโค้ด Mermaid) และช่วยตรวจ Logic ที่ซับซ้อน เช่น การเขียน Database Transaction ควบคู่กับการคำนวณสูตรอาหารเพื่อตัดสต็อก ซึ่งเป็นส่วนที่เกิดบั๊กได้ง่ายถ้าเขียนเองทั้งหมด

---

## 8. Diagram/เอกสารต้นทางของงานนี้:

- `wk04-user-stories.md` (Use Case)
- `schema.sql` (โครงสร้าง DB จากสัปดาห์ที่ 7)
- โครงสร้าง Model และ Controller เดิมจากสัปดาห์ที่ 8

---

## 9. ส่วนที่ AI ช่วยเขียน/แก้ไข:

**เอกสาร**
- docs/images/wk09-sequence-diagram.png`
- `wk09-ai-disclosure.md`

**ฐานข้อมูล**
- `schema.sql` (เพิ่ม `branch_id`, เพิ่มสถานะ `voided`, เอาคอลัมน์ที่คำนวณได้ออก)
- `seed.sql` (ข้อมูลทดสอบและสูตรวัตถุดิบ)

**โค้ด API**
- เมนู: `src/models/menuModel.js`, `src/controllers/menuController.js`, `src/routes/menuRoutes.js`
- ออเดอร์: `src/models/orderModel.js`, `src/controllers/orderController.js`, `src/routes/orderRoutes.js`
- `src/app.js` (เชื่อม route ใหม่)

---

## 10. สมาชิกที่อธิบายโค้ดส่วนนี้ได้:

- สมาชิกที่รับผิดชอบส่วนนี้อธิบายได้ว่า: Sequence Diagram ทำงานตามลำดับอะไร, Transaction ทำงานอย่างไรและทำไมต้องใช้, และวิธีกัน IDOR ด้วย `branch_id`

---

## 11. โค้ด/schema/สถาปัตยกรรมมีจุดใดต่างจาก diagram เดิมหรือไม่:

- [ ] ไม่ต่าง
- [x] ต่าง

**สิ่งที่ต่างหรือเพิ่มขึ้นหลังจากออกแบบ diagram:**

| ส่วน | ต่างจากเดิมอย่างไร | เหตุผล |
| :--- | :--- | :--- |
| ตาราง `menu_items` | เพิ่มคอลัมน์ `branch_id` | กัน IDOR ให้เมนูผูกกับสาขา (ตาม Requirement ด้านความปลอดภัย) |
| ตาราง `orders` | เพิ่มสถานะ `voided` ใน `payment_status` | ยกเลิกบิลแบบเก็บประวัติ ไม่ลบข้อมูลจริง |
| ตาราง `orders` | เอาคอลัมน์ `subtotal_amount`, `total_amount`, `change_amount` ออก | เป็นค่าที่คำนวณได้ เก็บซ้ำทำให้ข้อมูลไม่ตรงกัน (Update Anomaly) จึงคำนวณตอนดึงข้อมูลแทน |
| Sequence Diagram | ไม่ได้วาด BR-04 (แจ้งเตือนสต็อกต่ำ) และเส้นทาง ROLLBACK | ย่อ diagram ให้อ่านง่าย แต่โค้ดจริงทำทั้งสองอย่างแล้ว |

---

## Repository

[https://github.com/YupakornSorntrun/cafe-pos-group16.git](https://github.com/YupakornSorntrun/cafe-pos-group16.git)
