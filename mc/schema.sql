-- =============================================================
-- Cafe POS System — Week 7 MySQL Schema
-- Source of Truth: ER Diagram จาก Week 7 Requirement
-- =============================================================
-- หมายเหตุ:
--   - ingredients.stock_quantity เป็น cached current balance
--     (intentional denormalization เพื่อ performance)
--   - stock_movements เป็น source of truth ของการเคลื่อนไหวสต็อก
--   - application logic หรือ trigger ต้องเป็นผู้ sync ค่า stock_quantity
-- =============================================================

CREATE DATABASE IF NOT EXISTS cafe_pos;
USE cafe_pos;
SET NAMES utf8mb4;

-- -----------------------------------------------------------
-- 1. BRANCHES
-- -----------------------------------------------------------
CREATE TABLE branches (
    branch_id       INT             AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100)    NOT NULL,
    address         VARCHAR(255)    NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------
-- 2. EMPLOYEES
-- -----------------------------------------------------------
CREATE TABLE employees (
    employee_id     INT             AUTO_INCREMENT PRIMARY KEY,
    branch_id       INT             NOT NULL,
    name            VARCHAR(100)    NOT NULL,
    role            ENUM('barista', 'cashier') NOT NULL,

    INDEX idx_employees_branch_id (branch_id),

    CONSTRAINT fk_employees_branch
        FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------
-- 3. CATEGORIES
-- -----------------------------------------------------------
CREATE TABLE categories (
    category_id     INT             AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100)    NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------
-- 4. MENU_ITEMS
-- -----------------------------------------------------------
CREATE TABLE menu_items (
    menu_id         INT             AUTO_INCREMENT PRIMARY KEY,
    category_id     INT             NOT NULL,
    name            VARCHAR(100)    NOT NULL,
    price           DECIMAL(10,2)   NOT NULL,

    INDEX idx_menu_items_category_id (category_id),

    CONSTRAINT fk_menu_items_category
        FOREIGN KEY (category_id) REFERENCES categories(category_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------
-- 5. INGREDIENTS
-- -----------------------------------------------------------
-- stock_quantity = cached value (derive ได้จาก SUM(stock_movements.quantity_change))
-- low_stock_threshold = ค่า threshold สำหรับแจ้งเตือนสต็อกต่ำ
CREATE TABLE ingredients (
    ingredient_id       INT             AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(100)    NOT NULL,
    unit                ENUM('g', 'ml', 'pcs') NOT NULL,
    stock_quantity      DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    low_stock_threshold DECIMAL(10,2)   NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------
-- 6. MENU_ITEM_INGREDIENTS (junction table — M:N)
-- -----------------------------------------------------------
CREATE TABLE menu_item_ingredients (
    menu_id         INT             NOT NULL,
    ingredient_id   INT             NOT NULL,
    quantity_used   DECIMAL(10,2)   NOT NULL,

    PRIMARY KEY (menu_id, ingredient_id),

    INDEX idx_menu_item_ingredients_ingredient_id (ingredient_id),

    CONSTRAINT fk_mii_menu
        FOREIGN KEY (menu_id) REFERENCES menu_items(menu_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    CONSTRAINT fk_mii_ingredient
        FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------
-- 7. ORDERS
-- -----------------------------------------------------------
CREATE TABLE orders (
    order_id        INT             AUTO_INCREMENT PRIMARY KEY,
    branch_id       INT             NOT NULL,
    employee_id     INT             NOT NULL,
    payment_method  VARCHAR(20)     NOT NULL,
    payment_status  ENUM('unpaid', 'paid') NOT NULL DEFAULT 'unpaid',
    total_amount    DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    created_at      DATETIME        NOT NULL,

    INDEX idx_orders_branch_id (branch_id),
    INDEX idx_orders_employee_id (employee_id),

    CONSTRAINT fk_orders_branch
        FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    CONSTRAINT fk_orders_employee
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------
-- 8. ORDER_ITEMS
-- -----------------------------------------------------------
CREATE TABLE order_items (
    order_item_id   INT             AUTO_INCREMENT PRIMARY KEY,
    order_id        INT             NOT NULL,
    menu_id         INT             NOT NULL,
    quantity        INT             NOT NULL,
    unit_price      DECIMAL(10,2)   NOT NULL,

    INDEX idx_order_items_order_id (order_id),
    INDEX idx_order_items_menu_id (menu_id),

    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    CONSTRAINT fk_order_items_menu
        FOREIGN KEY (menu_id) REFERENCES menu_items(menu_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------
-- 9. STOCK_MOVEMENTS
-- -----------------------------------------------------------
-- order_id เป็น NULL ได้ กรณี restock หรือ adjustment ที่ไม่เกี่ยวกับการขาย
CREATE TABLE stock_movements (
    movement_id     INT             AUTO_INCREMENT PRIMARY KEY,
    ingredient_id   INT             NOT NULL,
    order_id        INT             NULL,
    quantity_change DECIMAL(10,2)   NOT NULL,
    reason          ENUM('sale', 'restock', 'adjustment') NOT NULL,
    moved_at        DATETIME        NOT NULL,

    INDEX idx_stock_movements_ingredient_id (ingredient_id),
    INDEX idx_stock_movements_order_id (order_id),

    CONSTRAINT fk_stock_movements_ingredient
        FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    CONSTRAINT fk_stock_movements_order
        FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
