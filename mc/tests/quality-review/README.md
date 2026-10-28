# สคริปต์ตรวจสอบคุณภาพ (สัปดาห์ 14)

หลักฐานประกอบ `docs/wk14-quality-review.md` สคริปต์ทั้งหมดทำงานกับ **ฐานข้อมูลทดสอบชั่วคราว** `cafe_pos_review_test` เท่านั้น ไม่แตะฐานข้อมูลจริง (`cafe_pos`)

## วิธีรัน

```bash
# 1) สร้างฐานข้อมูลทดสอบจาก schema.sql + seed.sql (ใช้ค่าเชื่อมต่อจาก .env)
node tests/quality-review/setup_testdb.js create

# 2) เปิดเซิร์ฟเวอร์ชี้ไปที่ฐานข้อมูลทดสอบ (พอร์ต 3060)  — PowerShell:
#    $env:DB_NAME="cafe_pos_review_test"; $env:PORT="3060"; node src/app.js
DB_NAME=cafe_pos_review_test PORT=3060 node src/app.js

# 3) รันทดสอบ (เปิดอีกหน้าต่างหนึ่ง)
node tests/quality-review/ac_test.js          # Acceptance Criteria สัปดาห์ 4 (US-01 ถึง US-06)
node tests/quality-review/idor_sqli_test.js   # IDOR, SQL Injection, Error Handling
node tests/quality-review/input_test.js       # Input Validation ของ POST /api/orders
node tests/quality-review/extra_probe.js      # สำรวจ input ผิดปกติฝั่งเจ้าของ (มีการเขียนไฟล์ทดสอบลง public/uploads ให้ลบทิ้งเอง)
node tests/quality-review/race_test.js        # Race condition: สต็อกเหลือ 1 ยิง 6 ออเดอร์พร้อมกัน

# 4) เสร็จแล้วลบฐานข้อมูลทดสอบ
node tests/quality-review/setup_testdb.js drop
```

หมายเหตุ: `ac_test.js` ต้องรันบนฐานข้อมูลที่เพิ่งสร้างใหม่ (นับจำนวนออเดอร์เริ่มจาก 0) และหลังรัน `setup_testdb.js create` ใหม่ ให้เปิดเซิร์ฟเวอร์ใหม่ด้วย (การเชื่อมต่อเดิมชี้ไปที่ฐานข้อมูลที่ถูกลบไปแล้ว)
