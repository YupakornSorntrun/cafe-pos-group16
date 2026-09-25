# Week 7 — ER Diagram

> ER Diagram ของระบบ Cafe POS Week 7
> ใช้เป็น Source of Truth สำหรับ `schema.sql` และ Model

```mermaid
erDiagram
    BRANCHES ||--o{ EMPLOYEES : has
    BRANCHES ||--o{ ORDERS : has

    EMPLOYEES ||--o{ ORDERS : places

    CATEGORIES ||--o{ MENU_ITEMS : has

    MENU_ITEMS ||--o{ ORDER_ITEMS : "ordered as"
    ORDERS ||--|{ ORDER_ITEMS : contains

    MENU_ITEMS ||--o{ MENU_ITEM_INGREDIENTS : uses
    INGREDIENTS ||--o{ MENU_ITEM_INGREDIENTS : "used in"

    INGREDIENTS ||--o{ STOCK_MOVEMENTS : has
    ORDERS ||--o{ STOCK_MOVEMENTS : triggers

    ORDERS ||--o| RECEIPTS : generates

    BRANCHES {
        int branch_id PK
        varchar name
        varchar address
    }

    EMPLOYEES {
        int employee_id PK
        int branch_id FK
        varchar name
        enum role
    }

    CATEGORIES {
        int category_id PK
        varchar name
    }

    MENU_ITEMS {
        int menu_id PK
        int category_id FK
        varchar name
        decimal price
    }

    INGREDIENTS {
        int ingredient_id PK
        varchar name
        enum unit
        decimal stock_quantity
        decimal low_stock_threshold
    }

    MENU_ITEM_INGREDIENTS {
        int menu_id PK_FK
        int ingredient_id PK_FK
        decimal quantity_used
    }

    ORDERS {
        int order_id PK
        int branch_id FK
        int employee_id FK
        enum order_type "dine_in | takeaway"
        varchar table_number "nullable"
        varchar payment_method
        enum payment_status
        decimal subtotal_amount
        decimal discount_amount
        decimal total_amount
        decimal amount_received
        decimal change_amount
        enum barista_status "pending | preparing | completed"
        datetime created_at
    }

    ORDER_ITEMS {
        int order_item_id PK
        int order_id FK
        int menu_id FK
        int quantity
        decimal unit_price
    }

    STOCK_MOVEMENTS {
        int movement_id PK
        int ingredient_id FK
        int order_id FK
        decimal quantity_change
        enum reason
        datetime moved_at
    }

    RECEIPTS {
        int receipt_id PK
        int order_id FK
        varchar receipt_number
        datetime printed_at
    }
```

---

## สรุป Relationship

| ความสัมพันธ์ | ประเภท | อธิบาย |
|---|---|---|
| BRANCHES → EMPLOYEES | 1:M | 1 สาขามีหลายพนักงาน |
| BRANCHES → ORDERS | 1:M | 1 สาขามีหลายออเดอร์ |
| EMPLOYEES → ORDERS | 1:M | 1 พนักงานสร้างหลายออเดอร์ |
| CATEGORIES → MENU_ITEMS | 1:M | 1 หมวดหมู่มีหลายเมนู |
| ORDERS → ORDER_ITEMS | 1:M | 1 ออเดอร์มีหลายรายการสินค้า |
| MENU_ITEMS → ORDER_ITEMS | 1:M | 1 เมนูถูกสั่งในหลายออเดอร์ |
| MENU_ITEMS ↔ INGREDIENTS | M:N | ผ่าน junction table `MENU_ITEM_INGREDIENTS` |
| INGREDIENTS → STOCK_MOVEMENTS | 1:M | 1 วัตถุดิบมีหลายรายการเคลื่อนไหว |
| ORDERS → STOCK_MOVEMENTS | 1:M | 1 ออเดอร์ทำให้เกิดหลายรายการเคลื่อนไหวสต็อก (nullable) |
| ORDERS → RECEIPTS | 1:1 | 1 ออเดอร์สร้างได้ 1 ใบเสร็จ (หรืออาจพริ้นท์ซ้ำแต่ใช้เลขเดียวกัน) |
