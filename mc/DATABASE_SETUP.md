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
DB_PASSWORD=my_password
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

## 5. ใช้ Git Branch

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

## 6. Commit และ Push

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
