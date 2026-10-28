# AI Usage Declaration — Week 13

## การใช้ AI ในงานนี้ (AI Usage Declaration)

### 1. ใช้ AI หรือไม่?

- [ ] ไม่ได้ใช้ AI
- [x] ใช้ AI (กรุณาระบุรายละเอียด)

### 2. เครื่องมือ AI ที่ใช้:

- Claude Code (Claude Sonnet 5.5) ผ่านแอป Claude Desktop

### 3. งานส่วนไหนใช้ AI:

- [x] Coding - ส่วน: implement `GET /api/reports/sales` (สรุปยอดขายรวมต่อเมนู กรองตาม `branch_id` ฟิลด์ camelCase แปลงผลลัพธ์ `SUM` เป็นตัวเลข นับเฉพาะออเดอร์ที่ `payment_status = 'paid'`) และจัดโครงสร้างโค้ดเพิ่มเติม: แยก routes ออกเป็น controller + model (`authController`, `ingredientController`, `lookupController`, `reportController`, `employeeModel`, `ingredientModel`, `lookupModel`, `reportModel`) และแยกโค้ดหน้าเว็บที่ใช้ร่วมกันไว้ใน `public/js/common/` (7 ไฟล์ แทน `common.js` เดิม) และแก้ปัญหา usability จากสัปดาห์ 12 ในหน้า POS (แสดงจำนวนที่ขายได้ + เตือนสต็อกตอนเลือกสินค้า, หน้าใหม่ "ประวัติออเดอร์" (`orders.html`) ที่แถบเมนูซ้าย, ปรับสีช่องรับเงิน)
- [x] Testing - ส่วน: ช่วยร่าง test case End-to-End ของ flow order → payment → report, ช่วยหาสาเหตุ bug ที่พบ และรันการตรวจสอบ API/หน้าเว็บเพิ่มเติมหลังแก้โค้ดแต่ละรอบ (ดูหัวข้อ 11.2)
- [x] Document/Grammar Check - ส่วน: ปรับปรุง `wk11-architecture.md` ให้ตรงกับโครงสร้าง route → controller → model ปัจจุบัน, ร่าง `frontend-api-review.md` (คู่มือ review ว่าหน้าเว็บเรียก API ใด), ช่วยจัดรูปแบบ `wk12-usability-testing.md`, จัดทำไฟล์ Word `SAD-Cafe-สรุป-อธิบายโค้ด.docx` (อธิบายโค้ดตามภาพหน้าจอ พร้อมคำถามที่อาจารย์น่าจะถาม) และร่างไฟล์นี้
- [x] Requirement Analysis - ส่วน: ปรับปรุง `wk03-requirements.md` ตามผล usability testing สัปดาห์ 12 (เพิ่ม FR-09, FR-10, FR-11, NFR-06) และเขียนบันทึกการเปลี่ยนแปลง requirement (Change Log) ท้ายเอกสาร
- [ ] Database Design
- [ ] System Architecture
- [ ] อื่นๆ

### 4. Prompt ที่ใช้ (ตัวอย่าง):

#### Claude Code

> "ช่วย implement endpoint `GET /api/reports/sales` ตาม Sequence Diagram ที่ร่างไว้ในสัปดาห์ที่ 10 ให้สรุปยอดขายรวมต่อเมนูภายในสาขาที่เลือก กรองตาม `branch_id` และระวังชนิดข้อมูลของ `SUM`"

### 5. ผลลัพธ์จาก AI:

AI ช่วยเขียน endpoint รายงานยอดขายต่อเมนู (`reportRoutes` → `reportController` → `reportModel`) โดย:

- ใช้ `SUM(quantity * unit_price)` นับเฉพาะออเดอร์ที่ชำระแล้ว ไม่นับที่ยกเลิก เรียงเมนูขายดีขึ้นก่อน
- แปลงผล `SUM` ที่ MySQL ส่งมาเป็นข้อความ (เช่น `"125.00"`) ให้เป็น `Number` ก่อนส่งให้หน้าเว็บ
- ตรวจ query (`branchId` ต้องเป็นจำนวนเต็มบวก, `from`/`to` ต้องเป็น `YYYY-MM-DD`) และจำกัดสิทธิ์เฉพาะ `owner`
- ไม่ส่ง `branchId` = ทุกสาขา (query parameter ชื่อ `branchId` ส่วนในฐานข้อมูลกรองที่คอลัมน์ `branch_id`)

ในหน้ารายงาน `report.js` เรียก endpoint นี้แล้วแสดงตาราง "ยอดขายแยกตามเมนู" เพิ่ม (หน้าตาใช้ class เดิม ไม่แก้ CSS)

นอกจากนี้ AI ช่วยแยก route ที่เคยมี SQL อยู่ในไฟล์เดียวให้เป็น 3 ชั้น (route → controller → model) ให้ตรงกับ Development View ใน `wk11-architecture.md` และช่วยร่าง test case ของ flow ตั้งแต่สั่งออเดอร์ ชำระเงิน จนถึงดูรายงาน

### 6. การปรับแต่งของนิสิตเอง:

นิสิตรวมโค้ดเข้า `main` ผ่าน Pull Request แก้ conflict รัน test End-to-End ด้วยตนเอง บันทึกผลผ่าน/ไม่ผ่าน และตัดสินใจแก้ bug หรือปรับ requirement เอง

นิสิตเป็นผู้กำหนดทิศทางและตัดสินใจเอง เช่น ยังคงใช้ HTML/CSS/JavaScript เดิม ไม่เปลี่ยนเป็น React, ให้โค้ดเขียนแบบพื้นฐานอ่านง่าย และตรวจว่าเอกสาร Word ตรงกับภาพหน้าจอที่ตนแคปไว้

### 7. เหตุผลในการใช้ AI:

ช่วยเขียนโค้ด endpoint และร่าง test case ได้เร็วขึ้น เหลือเวลาไปตรวจว่าผลตรงกับ API contract และ Sequence Diagram การตัดสินใจและการนำไปใช้ใน repository เป็นของนิสิต

---

## 8. Diagram/เอกสารต้นทางของงานนี้:

- Sequence Diagram ของ `GET /api/reports/sales` ใน `wk10-input-output-design.docx`
- `wk11-architecture.md`
- `wk03-requirements.md` และ `wk04-user-stories.md`
- `schema.sql`

---

## 9. ส่วนที่ AI ช่วยเขียน/แก้ไข:

- `src/routes/reportRoutes.js` / `src/controllers/reportController.js` / `src/models/reportModel.js` ของ `GET /api/reports/sales` และการเชื่อมใน `src/app.js`
- การแยกชั้น: `authController.js`, `ingredientController.js`, `lookupController.js`, `employeeModel.js`, `ingredientModel.js`, `lookupModel.js` และการแก้ `authRoutes.js`, `ingredientRoutes.js`, `lookupRoutes.js`, `menuController.js`, `orderController.js`
- โค้ดหน้าเว็บ `public/js/common/*.js` (`format.js`, `storage.js`, `api.js`, `icons.js`, `ui.js`, `shell.js`, `receipt.js`) แทน `common.js` เดิม
- หน้าใหม่ `public/orders.html` + `public/js/orders.js` (ประวัติออเดอร์ของแคชเชียร์) และการปรับ `pos.js`, `index.html`, `menuModel.js` (จำนวนที่ขายได้ต่อเมนู)
- `docs/wk03-requirements.md` (requirement ใหม่ 4 ข้อ และ Change Log)
- เอกสาร `docs/frontend-api-review.md`, `docs/wk11-architecture.md` (ส่วนที่เกี่ยวกับ controller/model), `docs/SAD-Cafe-สรุป-อธิบายโค้ด.docx` และเอกสารนี้ (`docs/wk13-ai-disclosure.md`)

---

## 10. สมาชิกที่อธิบายโค้ดส่วนนี้ได้:

- สมาชิกที่รับผิดชอบส่วนนี้สามารถอธิบายการทำงานของ `GET /api/reports/sales` และ flow order → payment → report ตั้งแต่กดปุ่มในหน้าเว็บ → `api()` → route → controller → model → ตาราง โดยใช้เอกสาร `SAD-Cafe-สรุป-อธิบายโค้ด.docx` และ `frontend-api-review.md` เป็นตัวช่วย

---

## 11. โค้ด/schema/สถาปัตยกรรมมีจุดใดต่างจาก diagram เดิมหรือไม่:

- [ ] ไม่ต่าง
- [x] ต่าง — เหตุผล:
  - Development View ของสัปดาห์ 11 ระบุว่า route ของ auth / ingredient / lookup เรียก `db.query` ตรง สัปดาห์นี้แยกเป็น controller + model แล้ว และเพิ่ม `reportRoutes` / `reportController` / `reportModel` จึงมี controllers 6 ไฟล์ models 7 ไฟล์ routes 7 ไฟล์ (ข้อความใน `wk11-architecture.md` ปรับให้ตรงแล้ว **แต่รูป Development View ยังไม่ได้วาดใหม่**)
  - ไม่ได้เปลี่ยน schema ฐานข้อมูลในสัปดาห์นี้

ER Diagram (`wk07-er-diagram.md`) ยังไม่ได้ปรับให้ตรงกับโครงสร้างล่าสุด (ค้างจากสัปดาห์ 10: คอลัมน์ `menu_items.image_url`, `employees.username` / `password_hash`, `orders.queue_date` / `queue_no` และตาราง `branch_daily_counters`):

- [ ] แล้ว
- [x] ยัง — ต้องปรับก่อนส่งเอกสารรวมเล่ม

---

## 11.1 ผลการทดสอบ End-to-End (นิสิตกรอกเองหลังรันจริง)

> ผลในตารางนี้มาจากการที่นิสิตทดสอบผ่าน UI จริงด้วยตนเอง ทุกแถวนิสิตทดสอบเองแล้ว (AI รันการตรวจสอบ API/หน้าเว็บเพิ่มเติมแยกต่างหาก ดูหัวข้อ 11.2 ซึ่งไม่ได้ทดแทนการทดสอบของนิสิต)

| ขั้นตอน | ผลที่คาดหวัง | ผ่าน/ไม่ผ่าน | Bug ที่พบ / วิธีแก้ |
|---|---|---|---|
| ล็อกอินแคชเชียร์ สาขา A | เข้า POS ได้ | ผ่าน | ไม่พบ bug |
| สั่งออเดอร์ + ชำระเงิน | ได้เลขคิว ตัดสต็อก ออกใบเสร็จ | ผ่าน | ไม่พบ bug |
| ล็อกอินเจ้าของ ดู `GET /api/reports/sales?branchId=` | ยอดตรงกับออเดอร์ที่ชำระ `totalSales` เป็นตัวเลข | ผ่าน | ไม่พบ bug |
| ทดสอบข้ามสาขา (ออเดอร์สาขา B ไม่ปนในรายงานสาขา A) | ยอดแยกตามสาขา | ผ่าน | ไม่พบ bug |
| แคชเชียร์เรียกรายงาน | ถูกปฏิเสธ (403) | ผ่าน | ล็อกอินเป็นแคชเชียร์แล้วเรียก `GET /api/reports/sales` ผ่าน Console ของเบราว์เซอร์ ได้ 403 (Forbidden) ตามที่ออกแบบ ไม่พบ bug |
| ทดสอบซ้ำทั้ง flow หลังแก้ bug | ผ่านครบ | ผ่าน | ไม่พบ bug ในการทดสอบรอบแรก จึงไม่ได้แก้ bug แต่รันซ้ำทั้ง flow อีกครั้งหลังปรับโค้ดสัปดาห์นี้ แล้วผ่านครบ |

---

## 11.2 การตรวจสอบที่ AI รันเองระหว่างแก้โค้ด

AI รันเซิร์ฟเวอร์ต่อ MySQL จริงด้วยบัญชีทดลองจาก `seed.sql` และเรียก API ด้วย `curl` / เปิดหน้าเว็บในเบราว์เซอร์ของแอป เพื่อตรวจว่าการแยกไฟล์ไม่ทำให้พฤติกรรมเปลี่ยน:

| สิ่งที่ตรวจ | ผล |
|---|---|
| `GET /api/reports/sales` (เจ้าของ ทุกสาขา และ `branchId=1`) | ได้รายการยอดขายต่อเมนู ตัวเลขเป็น number |
| `branchId=abc` / `from=bad` | ตอบ 400 พร้อมข้อความที่ถูกต้อง |
| แคชเชียร์เรียก `GET /api/reports/sales` | ตอบ 403 (ยืนยันระดับ API แล้ว ส่วนการทดสอบผ่าน UI ยังเป็นของนิสิต) |
| `/api/ingredients`: สร้าง แก้ไข ลบ, ข้อมูลผิด (400), restock id ที่ไม่มี (404), ลบตัวที่ถูกใช้ในสูตร (409) | ผ่าน (ข้อมูลทดสอบที่สร้างถูกลบกลับแล้ว) |
| `POST /api/orders` ด้วยข้อมูลผิด (`orderType`, `quantity`, ส่วนลดติดลบ) | ตอบ 400 ตามข้อความเดิม |
| หน้า report / menu / stock / POS หลังแยก `common.js` | โหลดได้ ไม่มี error ใน console |
| `GET /api/menu?branchId=1` หลังเพิ่ม `available_qty` | ได้ตัวเลขจำนวนที่ขายได้ของทุกเมนู |
| หน้า POS: กดเพิ่มเมนูเกินจำนวนที่ขายได้ และกดปุ่ม + ในตะกร้า | หยุดที่จำนวนสูงสุด (39) ขึ้นข้อความเตือน การ์ดแสดง "ครบจำนวนที่มี" |
| เมนู "ประวัติออเดอร์" ที่แถบซ้าย (หน้า `orders.html`) | แคชเชียร์เห็นออเดอร์วันนี้ เปิดใบเสร็จได้ ไม่มี error ใน console ส่วนเจ้าของเปิดหน้านี้จะถูกพากลับหน้ารายงาน |

**ยังไม่ได้ตรวจโดย AI:** การกดปุ่มบันทึก/ลบเมนูจริง การเติมสต็อกสำเร็จ (จะทิ้งประวัติใน `stock_movements`) การสั่งออเดอร์และยกเลิกออเดอร์จริง และการพิมพ์ใบเสร็จ

---

## 12. ข้อจำกัดที่ทราบ (ยังไม่ได้แก้):

- วัตถุดิบใช้ร่วมกันทุกสาขา (สต็อกก้อนเดียว) ตาม schema สัปดาห์ที่ 7
- ยังไม่มีหน้าจอฝั่งบาริสต้า (FR-03) สถานะ "กำลังทำ" ต้องแก้ในฐานข้อมูลเอง
- การเช็กสต็อกของ `createOrder` ทำก่อนเปิด transaction และไม่ล็อกแถว ถ้ามี 2 ออเดอร์พร้อมกันสต็อกอาจติดลบ
- หน้า `menu`, `pos`, `stock` ยังต่อสตริง HTML ใน JavaScript (เปลี่ยนเป็น `<template>` แล้วเฉพาะหน้า `report`)
- หน้ารายงานยังสรุปตัวเลขรายวัน/วิธีชำระ/สาขาที่ฝั่ง browser จาก `GET /api/orders` (เฉพาะยอดขายต่อเมนูที่ backend สรุป)
- รูป Development View (สัปดาห์ 11) และ ER Diagram (สัปดาห์ 7) ยังไม่ได้วาด/ปรับใหม่ให้ตรงกับโค้ดปัจจุบัน
- ปัญหา usability จากสัปดาห์ 12 แก้แล้วครบ 3 ข้อ (เตือนสต็อกตอนเลือกสินค้า, แยกหน้าประวัติออเดอร์ที่แถบเมนูซ้าย, ปรับสีช่องรับเงิน) ยังไม่ได้ให้ผู้ทดสอบทดสอบซ้ำหลังแก้
- จำนวน "เหลือ N" บนการ์ดเมนูคำนวณทีละเมนูจากวัตถุดิบที่เหลือน้อยที่สุดในสูตร ถ้าเมนูหลายอย่างใช้วัตถุดิบร่วมกัน (เช่น นม) ตัวเลขอาจไม่แม่นเมื่อสั่งหลายเมนูพร้อมกัน เป็นแค่การเตือนล่วงหน้า server ยังตรวจสต็อกซ้ำตอนชำระเงินเสมอ
- Token ล็อกอินเก็บใน `localStorage` ตามที่เรียน ระบบจริงควรใช้ cookie แบบ httpOnly
