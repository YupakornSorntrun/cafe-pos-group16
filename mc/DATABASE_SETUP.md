# Cafe POS — Database & Git Workflow

คู่มือสั้น ๆ สำหรับตั้งค่าและเริ่มพัฒนาโปรเจกต์ Cafe POS

## 1. เตรียม MySQL

โปรเจกต์ใช้ MySQL ที่รันผ่าน Docker Container ชื่อ `mysql_db` ตรวจสอบว่า Container ทำงานอยู่:

```bash
docker ps
```

ควรเห็นชื่อ `mysql_db` และมีการเปิดใช้งานพอร์ต `3306`

## 2. สร้าง Database และ Table

ไฟล์ `schema.sql` ใช้สร้าง Database และ Table ที่โปรเจกต์ต้องการ ให้รันคำสั่งนี้จากโฟลเดอร์ที่มีไฟล์ดังกล่าว:

```bash
docker exec -i mysql_db mysql -u root -proot123456 < schema.sql
```

ตรวจสอบว่า Database ถูกสร้างแล้ว:

```bash
docker exec -it mysql_db mysql -u root -proot123456 -e "SHOW DATABASES;"
```

ควรพบ Database ชื่อ `cafe_pos`

> หากใช้ PowerShell แล้วคำสั่ง `< schema.sql` มีปัญหา ให้รันผ่าน Command Prompt (CMD) หรือ import ไฟล์ด้วย MySQL โดยตรง

## 3. ตั้งค่า `.env`

สร้างไฟล์ `.env` ในโฟลเดอร์โปรเจกต์ และกำหนดค่าดังนี้:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=123456
DB_NAME=cafe_pos
PORT=3000
```

ตรวจสอบให้ `DB_NAME` ตรงกับชื่อ Database ใน `schema.sql`

## 4. ติดตั้งและรันโปรเจกต์

เข้าโฟลเดอร์โปรเจกต์ เช่น `mc` แล้วติดตั้ง dependencies:

```bash
cd mc
npm install
npm run dev
```

หากเริ่มทำงานสำเร็จ จะมีข้อความระบุว่า Server รันอยู่ที่ port `3000`

## 5. Import ข้อมูลจำลอง (Seed Data) สำหรับทดสอบ

หลังจากสร้าง Database ด้วย `schema.sql` แล้ว ให้รันไฟล์ `seed.sql` เพื่อเพิ่มข้อมูลตั้งต้น (เช่น สาขา พนักงาน เมนู) ให้ระบบพร้อมสำหรับการทดสอบ API:

```bash
docker exec -i mysql_db mysql -u root -proot123456 < seed.sql
```

> **หมายเหตุ:** หากข้อมูลภาษาไทยเพี้ยน หรือต้องการรีเซ็ต Database ให้รันคำสั่งเหล่านี้ตามลำดับผ่าน CMD (Command Prompt):
> 1. `docker exec -i mysql_db mysql -u root -proot123456 -e "DROP DATABASE cafe_pos;"`
> 2. `docker exec -i mysql_db mysql -u root -proot123456 < schema.sql`
> 3. `docker exec -i mysql_db mysql -u root -proot123456 < seed.sql`

## 6. ทดสอบ API ด้วย Postman

เมื่อรันเซิร์ฟเวอร์ (`npm run dev`) และนำเข้าข้อมูลตั้งต้นแล้ว สามารถทดสอบระบบออเดอร์ได้ตามนี้ (ไม่ต้องใส่ Headers นอกเหนือจาก `Content-Type: application/json`):

### 1) สร้างออเดอร์ใหม่
- **Method:** `POST`
- **URL:** `http://localhost:3000/api/orders`
- **Body (raw -> JSON):**
  ```json
  {
    "branchId": 1,
    "employeeId": 1,
    "paymentMethod": "cash",
    "items": [
      { "menuId": 1, "price": 50, "quantity": 2 },
      { "menuId": 2, "price": 65, "quantity": 1 }
    ]
  }
  ```

### 2) เรียกดูออเดอร์ทั้งหมด
- **Method:** `GET`
- **URL:** `http://localhost:3000/api/orders`

### 3) ลบเฉพาะ "บางเมนู" ออกจากออเดอร์
หากลูกค้าเปลี่ยนใจไม่เอาบางเมนู ระบบจะหักยอดเงินรวมให้โดยอัตโนมัติ
- **Method:** `DELETE`
- **URL:** `http://localhost:3000/api/orders/:orderId/items/:itemId`
- **ตัวอย่าง:** `DELETE http://localhost:3000/api/orders/2/items/1` (ลบไอเทม 1 จากออเดอร์ 2)

### 4) ยกเลิก/ลบออเดอร์ทั้งบิล
ระบบจะลบข้อมูลเมนูในออเดอร์ให้ก่อนลบบิลอัตโนมัติ (ไม่ติด FK constraint)
- **Method:** `DELETE`
- **URL:** `http://localhost:3000/api/orders/:orderId`
- **ตัวอย่าง:** `DELETE http://localhost:3000/api/orders/1` (ลบออเดอร์ 1)

## 7. ใช้ Git Branch

ตรวจสอบ Branch ปัจจุบันก่อนเริ่มทำงาน:

```bash
git branch
```

เครื่องหมาย `*` คือ Branch ที่กำลังใช้งานอยู่

สลับ Branch:

```bash
git switch main
git switch week5/add-order
```

สร้าง Branch ใหม่และสลับไปใช้งานทันที:

```bash
git switch -c feature/order-api
```

## 8. Commit และ Push

ตรวจสอบและบันทึกงาน:

```bash
git status
git add .
git commit -m "feat: add order creation"
```

Push Branch ครั้งแรก:

```bash
git push -u origin feature/order-api
```

ครั้งต่อไปใช้:

```bash
git push
```

> **สำคัญ:** ก่อน `git push` ให้รัน `git branch` ทุกครั้ง และตรวจสอบว่าอยู่บน Branch งานของตัวเอง ไม่ใช่ `main`

## Workflow แบบสั้น

1. สลับไป Branch งานของตัวเอง หรือสร้าง Branch ใหม่จาก `main`
2. แก้ไขและทดสอบโค้ด
3. ตรวจสอบ Branch และไฟล์ที่เปลี่ยนด้วย `git branch` และ `git status`
4. `git add` → `git commit` → `git push`
5. สร้าง Pull Request เพื่อให้ตรวจสอบก่อนรวมเข้า `main`
