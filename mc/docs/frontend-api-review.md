# คู่มือ Review โค้ดหน้าเว็บ (`public/js`) — API ที่ใช้ และกดแล้วไปไหนต่อ

เอกสารนี้ตอบ 3 คำถาม
1. ไฟล์ js แต่ละไฟล์ทำอะไร
2. หน้าเว็บเรียก API (endpoint) อะไรบ้าง
3. กดปุ่มหนึ่งปุ่มแล้ว โค้ดวิ่งจาก js ไป `src/` ส่วนไหน และไปแตะตารางไหนในฐานข้อมูล

---

## 1. ภาพรวม: ใครเรียกใคร

```
หน้า HTML  →  js ของหน้านั้น  →  App.api() ใน common/api.js  →  fetch ไป /api/...
                                                              │
                  src/app.js  ←──────────────────────────────┘
                     │  (เลือก route ตามพาธ)
                     ▼
              src/routes/*.js         ตรวจ token + บทบาท (middlewares/auth.js)
                     ▼
              src/controllers/*.js    ตรวจข้อมูล + กฎธุรกิจ
                     ▼
              src/models/*.js         เขียน SQL คุยกับ MySQL
```

| ไฟล์ js | หน้า | บทบาทที่เข้าได้ | ทำอะไร |
|---|---|---|---|
| `common/*.js` (7 ไฟล์) | ทุกหน้า | — | `format.js` แปลงเงิน/วันที่/กัน XSS, `storage.js` เก็บ token, `api.js` เรียก backend แนบ token, `icons.js` ไอคอน/รูปสินค้า, `ui.js` toast/modal/confirmBox, `shell.js` วาดเมนู/แถบบน/ตรวจสิทธิ์/เลือกสาขา, `receipt.js` ใบเสร็จ |
| `login.js` | `login.html` | ทุกคน | ล็อกอิน เก็บ token |
| `pos.js` | `index.html` | แคชเชียร์ | เลือกเมนู → ตะกร้า → ชำระเงิน (แสดงจำนวนที่ขายได้ และเตือนเมื่อสต็อกไม่พอ) |
| `orders.js` | `orders.html` | แคชเชียร์ | ดูออเดอร์วันนี้ ใบเสร็จ และยกเลิกออเดอร์ที่ยังไม่เริ่มทำ |
| `menu.js` | `menu.html` | เจ้าของ | เพิ่ม/แก้ไข/ลบเมนู, สูตรวัตถุดิบ, อัปโหลดรูป |
| `stock.js` | `stock.html` | เจ้าของ | เพิ่ม/แก้ไข/เติมสต็อก/ลบวัตถุดิบ |
| `report.js` | `report.html` | เจ้าของ | รายงานยอดขาย, ดูใบเสร็จ, ยกเลิกออเดอร์ |

> ไฟล์ใน `common/` ส่งออกทุกอย่างทางตัวแปร `App` (เช่น `App.api`, `App.toast`) ไฟล์หน้าอื่นหยิบไปใช้

---

## 2. ตาราง endpoint ทั้งหมด

คอลัมน์ "ใครเรียกได้" คือสิทธิ์ที่ **server บังคับจริง** (ตรวจที่ `src/routes/*.js` ผ่าน `authorizeRoles`)
การซ่อนปุ่มฝั่งหน้าเว็บเป็นแค่ความสะดวกของผู้ใช้ ไม่ใช่การป้องกัน

| # | Method | Path | ใครเรียกได้ | หน้าเว็บที่เรียก (ฟังก์ชัน) | Route → Controller/ที่ทำงาน | ทำอะไร / ตารางที่แตะ |
|---|---|---|---|---|---|---|
| 1 | POST | `/api/auth/login` | ทุกคน | `login.js` (submit ฟอร์ม) | `authRoutes.js` → `authController.login` → `employeeModel.findByUsername` | ตรวจ username/รหัสผ่าน (scrypt) → ออก JWT. จำกัดผิด 5 ครั้ง/10 นาที. ตาราง `employees` |
| 2 | GET | `/api/auth/me` | ล็อกอินแล้ว | `common/shell.js` `Shell.init`, `login.js` | `authRoutes.js` → `authController.getMe` | ถอด token บอกว่าใครล็อกอินอยู่ (ไม่แตะ DB) |
| 3 | GET | `/api/branches` | ล็อกอินแล้ว | `common/shell.js` `Shell.init` | `lookupRoutes.js` → `lookupController.getBranches` → `lookupModel.findAllBranches` / `findBranchById` | เจ้าของเห็นทุกสาขา, แคชเชียร์เห็นสาขาตัวเอง. ตาราง `branches` |
| 4 | GET | `/api/categories` | ล็อกอินแล้ว | `menu.js` `load` | `lookupRoutes.js` → `lookupController.getCategories` → `lookupModel.findAllCategories` | รายการหมวดหมู่. ตาราง `categories` |
| 5 | GET | `/api/menu?branchId=` | เจ้าของ, แคชเชียร์ (เฉพาะสาขาตัวเอง) | `pos.js` `loadMenus`, `menu.js` `load` | `menuRoutes.js` → `menuController.getMenus` → `menuModel.findByBranchId` | รายการเมนูของสาขา + จำนวนวัตถุดิบในสูตร. `menu_items`, `categories`, `menu_item_ingredients` |
| 6 | GET | `/api/menu/:id?branchId=` | เจ้าของ, แคชเชียร์ (สาขาตัวเอง) | `menu.js` `openForm` (ตอนแก้ไข) | `menuController.getMenuById` → `menuModel.findByIdAndBranchId` + `findIngredientsByMenuId` | เมนู 1 รายการ + สูตรวัตถุดิบ |
| 7 | POST | `/api/menu` | เจ้าของ | `menu.js` `openForm > save` | `menuController.createMenu` → `menuModel.create` | เพิ่มเมนู + สูตร (transaction). `menu_items`, `menu_item_ingredients` |
| 8 | PUT | `/api/menu/:id` | เจ้าของ | `menu.js` `openForm > save` | `menuController.updateMenu` → `menuModel.update` | แก้เมนู + แทนที่สูตรทั้งชุด |
| 9 | DELETE | `/api/menu/:id?branchId=` | เจ้าของ | `menu.js` ปุ่มลบ | `menuController.deleteMenu` → `menuModel.deleteMenu` | ลบเมนูและสูตรของเมนูนั้น |
| 10 | POST | `/api/uploads/menu-image` | เจ้าของ | `menu.js` `openForm > save` | `uploadRoutes.js` | รับไฟล์รูป (raw body, ≤2MB, jpg/png/webp) เก็บใน `public/uploads/` คืน `{imageUrl}` |
| 11 | GET | `/api/ingredients` | เจ้าของ | `stock.js` `load`, `menu.js` `openForm` | `ingredientRoutes.js` → `ingredientController.getIngredients` → `ingredientModel.findAll` | รายการวัตถุดิบ + จำนวนเมนูที่ใช้. `ingredients`, `menu_item_ingredients` |
| 12 | POST | `/api/ingredients` | เจ้าของ | `stock.js` `openForm > save` | `ingredientRoutes.js` → `ingredientController.createIngredient` → `ingredientModel.create` | เพิ่มวัตถุดิบ (+ บันทึกประวัติ restock ถ้ามีจำนวนเริ่มต้น). `ingredients`, `stock_movements` |
| 13 | PUT | `/api/ingredients/:id` | เจ้าของ | `stock.js` `openForm > save` | `ingredientRoutes.js` → `ingredientController.updateIngredient` → `ingredientModel.update` | แก้ชื่อ/หน่วย/เกณฑ์แจ้งเตือน (ไม่แตะจำนวน) |
| 14 | POST | `/api/ingredients/:id/restock` | เจ้าของ | `stock.js` `openRestock` | `ingredientRoutes.js` → `ingredientController.restockIngredient` → `ingredientModel.restock` | บวกสต็อก + บันทึก `stock_movements` (transaction) |
| 15 | DELETE | `/api/ingredients/:id` | เจ้าของ | `stock.js` ปุ่มลบ | `ingredientRoutes.js` → `ingredientController.deleteIngredient` → `ingredientModel.remove` | ลบ (ลบไม่ได้ถ้าถูกใช้ในสูตร/มีประวัติสต็อก) |
| 16 | POST | `/api/orders` | **แคชเชียร์เท่านั้น** | `pos.js` `submit` | `orderRoutes.js` → `orderController.createOrder` | สร้างออเดอร์ (ดูข้อ 3.1). `orders`, `order_items`, `ingredients`, `stock_movements`, `receipts`, `branch_daily_counters` |
| 17 | GET | `/api/orders` | เจ้าของ, แคชเชียร์ | `orders.js` `load`, `report.js` `load` | `orderController.getAllOrders` → `orderModel.findAll` | รายการออเดอร์. เจ้าของกรอง `branchId/from/to` ได้, แคชเชียร์ถูกบังคับเป็น "สาขาตัวเอง + วันนี้" |
| 18 | GET | `/api/orders/:id` | เจ้าของ, แคชเชียร์ (สาขาตัวเอง) | `common/receipt.js` `showReceipt` (จาก pos/orders/report) | `orderController.getOrderById` → `orderModel.findDetail` | ออเดอร์ + รายการสินค้า + ใบเสร็จ + สาขา + ชื่อแคชเชียร์ |
| 19 | DELETE | `/api/orders/:id` | เจ้าของ, แคชเชียร์ | `orders.js` ปุ่มยกเลิก, `report.js` ปุ่มยกเลิก | `orderController.deleteOrder` → `orderModel.lockStatus/restoreStock.../voidOrder` | ยกเลิก (void) ออเดอร์ ไม่ได้ลบแถวจริง (ดูข้อ 3.5) |
| 20 | GET | `/api/reports/sales?branchId=&from=&to=` | เจ้าของ | `report.js` `load` | `reportRoutes.js` → `reportController.getSalesReport` → `reportModel.salesByMenu` | สรุปยอดขายรวมต่อเมนู (นับเฉพาะออเดอร์ `paid`). `order_items`, `orders`, `menu_items` |

**รูปแบบ error ที่ server ตอบ:** `{ "error": "ข้อความภาษาไทย" }` — `api()` ใน `common/api.js` อ่านค่านี้แล้ว `throw new Error(ข้อความ)` ให้หน้าเว็บ `toast(e.message)` ต่อ
ถ้า server ตอบ 401 (token หมดอายุ/ไม่มี) `api()` จะล้าง token แล้วพาไป `login.html` ให้อัตโนมัติ

---

## 3. กดปุ่มนี้ → ไปไหนต่อ (เส้นทางของแต่ละปุ่ม)

### 3.1 POS: กด "ชำระเงิน" (`pos.js` → `submit`)

```
กดปุ่ม #payBtn
 └ submit()                                 pos.js
    ├ ประกอบ payload: orderType, tableNumber, paymentMethod,
    │                 discountAmount, amountReceived, items[{menuId, quantity}]
    │   (ไม่ส่งราคา ไม่ส่ง branchId/employeeId)
    └ api("/api/orders", { json: payload })  common/api.js → POST /api/orders
        └ src/routes/orderRoutes.js
           ├ authorizeRoles("cashier")       ตรวจ token + ต้องเป็นแคชเชียร์
           ├ ใส่ employeeId, branchId จาก token ทับ body (กันแก้ค่าจากหน้าเว็บ)
           └ orderController.createOrder      src/controllers/orderController.js
              1. ตรวจ input (ชนิด/ค่า)  → 400 ถ้าผิด
              2. รวมเมนูที่ซ้ำกัน (BR-02)
              3. ดึงราคาจริงจาก DB: menuModel.findByIdAndBranchId   (ไม่เชื่อราคาจากหน้าเว็บ)
                 ดึงสูตร: menuModel.findIngredientsByMenuId → คำนวณวัตถุดิบที่ต้องใช้
              4. new Order(...) (models/Order.js) → addItem / calculateTotal
              5. ตรวจส่วนลด ≤ ยอดรวม, เงินรับ ≥ ยอดสุทธิ → 400 ถ้าไม่ผ่าน
              6. ตรวจสต็อกพอไหม (BR-01) → 400 "วัตถุดิบไม่เพียงพอ: ..."
              7. BEGIN TRANSACTION (BR-03)  orderModel.getConnection
                 ├ orderModel.nextQueueNo       เลขคิวของสาขาวันนั้น (A001...) → branch_daily_counters
                 ├ orderModel.createOrder       → orders
                 ├ orderModel.createOrderItem   → order_items (เก็บราคา ณ ตอนขาย)
                 ├ orderModel.updateStockAndRecordMovement → ingredients (ตัดสต็อก) + stock_movements
                 ├ orderModel.createReceipt     → receipts
                 └ COMMIT  (ผิดพลาดตรงไหน → ROLLBACK ทั้งหมด)
              8. ตอบ 201 { data: { orderId, queueNo, totalAmount, changeAmount, receiptId, lowStockWarnings } }
 └ กลับมาที่ pos.js: resetOrder() → showReceipt(orderId) (→ GET /api/orders/:id) → toast เตือนสต็อกใกล้หมด (ถ้ามี)
```

### 3.2 POS: เปิดหน้าเว็บ / เปลี่ยนสาขา (โหลดเมนู)

```
เปิดหน้า → Shell.init (common/shell.js)
  ├ GET /api/auth/me        ตรวจล็อกอิน + สิทธิ์เข้าหน้านี้   (ไม่ผ่าน → ไปหน้า login/หน้าแรกของบทบาท)
  ├ GET /api/branches       เติม dropdown สาขา
  └ onBranch() → loadMenus()  pos.js
        GET /api/menu?branchId=...
          └ menuRoutes.js → authorizeRoles + ownBranchOnly (แคชเชียร์ดูสาขาอื่นไม่ได้)
             └ menuController.getMenus → menuModel.findByBranchId → SELECT menu_items ...
```

### 3.3 หน้าประวัติออเดอร์ (`orders.js`): เมนูซ้าย "ประวัติออเดอร์" → ปุ่ม "ใบเสร็จ" / "ยกเลิก"

```
กดไอคอน "ประวัติออเดอร์" ที่แถบเมนูซ้าย → เปิด orders.html → Shell.init → load()
   GET /api/orders                     (server บังคับ สาขาตัวเอง + วันนี้)
     └ orderController.getAllOrders → orderModel.findAll

ปุ่ม "ใบเสร็จ"  → App.showReceipt(id) → GET /api/orders/:id → orderController.getOrderById → orderModel.findDetail
ปุ่ม "ยกเลิก"   → confirmBox → DELETE /api/orders/:id → ดูข้อ 3.5
```

### 3.4 เมนู: "เพิ่มเมนู" / "แก้ไข" → "บันทึก" (`menu.js`)

```
กด #addBtn หรือปุ่ม "แก้ไข" → openForm(menu)
   GET /api/ingredients                         ไว้ทำ dropdown สูตร
   (แก้ไข) GET /api/menu/:id?branchId=          ดึงสูตรเดิม → menuController.getMenuById

กด "บันทึก" → save()
   ① validate()   ตรวจชื่อ/ราคา/สูตรฝั่งหน้าเว็บ (เพื่อบอกผู้ใช้เร็ว ๆ)
   ② ถ้าเลือกรูปใหม่: POST /api/uploads/menu-image  → uploadRoutes.js → เขียนไฟล์ลง public/uploads/ → ได้ imageUrl
   ③ เพิ่ม: POST /api/menu       → menuController.createMenu → menuModel.create   (transaction: menu_items + menu_item_ingredients)
      แก้ไข: PUT  /api/menu/:id   → menuController.updateMenu → menuModel.update   (ลบสูตรเก่าแล้วใส่สูตรใหม่)
   ④ สำเร็จ → ปิดฟอร์ม → load() โหลดตารางใหม่

ปุ่ม "ลบ" → confirmBox → DELETE /api/menu/:id?branchId= → menuController.deleteMenu → menuModel.deleteMenu
```

### 3.5 ยกเลิกออเดอร์ (หน้าประวัติออเดอร์ และ Report) — `DELETE /api/orders/:id`

```
orderController.deleteOrder
  ├ หาออเดอร์: orderModel.findById        (แคชเชียร์ดูได้เฉพาะสาขาตัวเอง → ไม่งั้น 404)
  ├ คำนวณวัตถุดิบที่ต้องคืน จากรายการสินค้า + สูตร
  └ BEGIN TRANSACTION
     ├ orderModel.lockStatus   SELECT ... FOR UPDATE   (ล็อกแถวกันชนกับบาริสต้า/กดซ้ำ)
     ├ ถ้า void ไปแล้ว                       → 400
     ├ ถ้าเป็นแคชเชียร์ และบาริสต้าเริ่มทำแล้ว → 409
     ├ ถ้ายัง pending: คืนสต็อก  (ingredients + stock_movements)
     ├ orderModel.voidOrder    UPDATE orders SET payment_status='voided'
     └ COMMIT
  ตอบ { message, stockRestored }
```

กฎสิทธิ์: **เจ้าของ** ยกเลิกได้ทุกออเดอร์ / **แคชเชียร์** ยกเลิกได้เฉพาะสาขาตัวเองและสถานะ "รอทำ"
คืนสต็อกเฉพาะออเดอร์ที่บาริสต้ายังไม่เริ่มทำ

### 3.6 สต็อก (`stock.js`) — ทุกปุ่มไปที่ `ingredientRoutes.js` → `ingredientController.js` → `ingredientModel.js`

| ปุ่ม | ฟังก์ชันใน stock.js | API |
|---|---|---|
| เพิ่มวัตถุดิบ → บันทึก | `openForm > save` | `POST /api/ingredients` |
| แก้ไข → บันทึก | `openForm > save` | `PUT /api/ingredients/:id` |
| เติมสต็อก → เติมสต็อก | `openRestock` | `POST /api/ingredients/:id/restock` |
| ลบ → ยืนยัน | handler ของ `#rows` | `DELETE /api/ingredients/:id` |
| แท็บ ทั้งหมด/ใกล้หมด | handler ของ `#filters` | ไม่เรียก API (กรองจากข้อมูลที่โหลดมาแล้ว) |

### 3.7 รายงาน (`report.js`)

```
เปลี่ยนสาขา / ปุ่มลัดวันที่ / เปลี่ยนวันที่ → load()
   GET /api/reports/sales?branchId=&from=&to=   ยอดขายต่อเมนู (reportController → reportModel.salesByMenu)
   GET /api/orders?branchId=&from=&to=     (เจ้าของ; ถ้าเลือก "ทุกสาขา" จะไม่ส่ง branchId)
render()  สรุปตัวเลขที่ฝั่งหน้าเว็บ  (ยอดรวม/เฉลี่ย/รายวัน/วิธีจ่าย/สาขา)
          นับเฉพาะ payment_status = "paid"; "voided" นับแยกเป็นช่อง Void
สลับ รายวัน/รายเดือน, ปุ่มพิมพ์ → ไม่เรียก API
ปุ่ม "ใบเสร็จ" → GET /api/orders/:id      ปุ่ม "ยกเลิก" → DELETE /api/orders/:id
```

### 3.8 ล็อกอิน / ออกจากระบบ

```
กด "เข้าสู่ระบบ" → login.js → POST /api/auth/login
    สำเร็จ: localStorage["cafe.token"] = token → ไปหน้าตามบทบาท (cashier → /index.html, owner → /report.html)
กด "ออกจากระบบ" (common/shell.js) → ลบ token ใน localStorage → ไป /login.html   (ไม่เรียก API: JWT เป็น stateless)
```

---

## 4. จุดที่ควรรู้ตอน Review (ข้อสังเกตจากการอ่านโค้ด)

**ทำถูกแล้ว (ควรเก็บไว้)**
- ราคา, สาขา, พนักงาน มาจาก DB/token ไม่เชื่อค่าจากหน้าเว็บ (`createOrder`)
- ทุก endpoint มีตรวจ token + บทบาทที่ server; หน้าเว็บตรวจซ้ำเพื่อ UX เท่านั้น
- สร้าง/ยกเลิกออเดอร์ใช้ transaction (ผิดพลาดแล้ว rollback ทั้งหมด)
- ข้อความจากผู้ใช้/DB ผ่าน `esc()` ก่อนใส่ HTML (กัน XSS)
- ตรวจ validation ทั้งสองฝั่ง (หน้าเว็บ = เร็ว, server = เชื่อถือได้)

**ควรปรับ / ระวัง**
1. **สต็อกอาจติดลบเมื่อมีสองออเดอร์พร้อมกัน** — `createOrder` อ่านสต็อกและเช็ก "พอไหม" *ก่อน* เปิด transaction แล้วค่อยตัดสต็อก ถ้าแคชเชียร์สองคนขายของที่ใช้วัตถุดิบเดียวกันพร้อมกัน ทั้งคู่ผ่านการเช็กได้ ทางแก้: ย้ายการเช็กเข้าไปใน transaction และใช้ `SELECT ... FOR UPDATE` หรือ `UPDATE ... WHERE stock_quantity >= ?` แล้วดูจำนวนแถวที่ถูกแก้
2. **ข้อความหลังยกเลิกใน `report.js` ไม่ตรงความจริง** — หน้ารายงานขึ้น "ยกเลิกออเดอร์และคืนสต็อกแล้ว" เสมอ แต่ server อาจไม่คืนสต็อก (ถ้าบาริสต้าเริ่มทำแล้ว) และตอบ `message` กลับมาให้อยู่แล้ว ควรใช้ `res.message` เหมือน `pos.js`
3. **รายงานดึงออเดอร์ทั้งหมดมาสรุปที่หน้าเว็บ** — ถ้าไม่ใส่วันที่ หรือข้อมูลโตขึ้น จะช้า. ควรทำ endpoint สรุปที่ server (เช่น `GET /api/reports/sales`) แล้วใช้ `GROUP BY`
4. **รูปที่อัปโหลดแล้วบันทึกเมนูไม่สำเร็จ จะค้างเป็นไฟล์ขยะ** ใน `public/uploads/` (อัปโหลดก่อน แล้วค่อยบันทึกเมนู)
5. **เก็บ token ใน `localStorage`** — ถ้ามีช่อง XSS จะถูกขโมยได้ ตอนนี้ลดความเสี่ยงด้วย `esc()` และ CSP ของ helmet; ทางเลือกที่แน่นหนากว่าคือ httpOnly cookie
6. `HOME` (หน้าแรกตามบทบาท) ซ้ำกันใน `common/shell.js` กับ `login.js` เพราะหน้า login ไม่โหลดไฟล์ใน `common/` — แก้ที่หนึ่งต้องแก้อีกที่
7. หน้าเว็บ `report.js` ใช้ `payment_status` เป็นข้อความ `"paid"/"voided"` — ถ้าเพิ่มสถานะใหม่ใน DB ต้องแก้หลายที่

---

## 5. ถ้าอยากไล่โค้ดเองให้เข้าใจเร็วที่สุด

1. เปิด `common/api.js` กับ `common/shell.js` อ่านแค่ `api()` และ `Shell.init` — เข้าใจสองตัวนี้ก็เข้าใจครึ่งหนึ่งของหน้าเว็บ
2. เปิด `login.js` (สั้นสุด) แล้วตาม `POST /api/auth/login` ไป `authRoutes.js` → `authController.js` → `employeeModel.js`
3. เปิด `pos.js` เริ่มที่หัวไฟล์ (คอมเมนต์บอก API) → `submit()` → ตามไป `orderController.createOrder` ตามแผนภาพข้อ 3.1
4. ใน js ทุกไฟล์ ค้นข้อความ `เรียก API:` จะเจอทุกจุดที่เรียก backend พร้อมบอกว่าไปไฟล์ไหนใน `src/`
