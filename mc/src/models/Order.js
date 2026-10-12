// src/models/Order.js — Domain class ตาม Class Diagram สัปดาห์ 6 (docs/images/wk06-class-diagram.png)
// ไฟล์นี้เก็บ "ตรรกะทางธุรกิจ" ของออเดอร์เท่านั้น ไม่มีคำสั่ง SQL
// (การอ่าน/เขียนฐานข้อมูลอยู่ใน orderModel.js ซึ่งเป็นชั้น Data-access แยกกัน)

// OrderItem: รายการสินค้า 1 บรรทัดในออเดอร์
//   - menuItem  : อ้างอิงเมนูที่มีอยู่แล้ว (Aggregation — เมนูไม่ได้ถูกสร้างหรือลบไปพร้อม OrderItem)
//   - unitPrice : "snapshot" ราคา ณ ตอนสั่ง แยกจาก menuItem.price เพื่อให้ออเดอร์เก่าราคาไม่เปลี่ยนตามเมนู
class OrderItem {
  constructor(item, quantity) {
    this.menuItem = item;
    this.quantity = quantity;
    this.unitPrice = Number(item.price); // mysql2 คืน DECIMAL เป็น string จึงแปลงเป็นตัวเลข
  }

  getSubtotal() {
    return this.unitPrice * this.quantity;
  }
}

// Order: ออเดอร์ 1 ใบ ประกอบด้วย OrderItem หลายรายการ (Composition — OrderItem ถูกสร้างใน addItem() เท่านั้น)
class Order {
  constructor(paymentMethod) {
    this.orderId = null; // ยังไม่มีจนกว่าจะบันทึกลงฐานข้อมูล
    this.createdAt = new Date();
    this.paymentMethod = paymentMethod;
    this.items = [];
  }

  addItem(item, quantity) {
    this.items.push(new OrderItem(item, quantity));
  }

  // ราคารวมของทุกรายการ (ก่อนหักส่วนลด)
  calculateTotal() {
    return this.items.reduce((sum, item) => sum + item.getSubtotal(), 0);
  }

  // ออเดอร์ส่งได้เมื่อมีสินค้าอย่างน้อย 1 รายการ
  submit() {
    return this.items.length > 0;
  }
}

module.exports = { Order, OrderItem };
