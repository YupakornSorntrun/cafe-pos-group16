// =====================================================================
// common/receipt.js — ใบเสร็จ: สร้าง HTML ใบเสร็จ และเปิดหน้าต่างให้ดู/พิมพ์
// ต้องโหลดหลัง format.js, api.js, ui.js
// =====================================================================
(function () {
  const esc = App.esc;
  const api = App.api;
  const modal = App.modal;
  const queueLabel = App.queueLabel;
  const fmtDateTime = App.fmtDateTime;
  const PAY_LABEL = App.PAY_LABEL;
  const TYPE_LABEL = App.TYPE_LABEL;

  // ตัวเลขทศนิยม 2 ตำแหน่ง
  function money(n) {
    return Number(n).toFixed(2);
  }

  // receiptHtml(): สร้าง HTML ใบเสร็จจากข้อมูลออเดอร์ (ได้จาก GET /api/orders/:id)
  // ยอดรวม/ส่วนลด/ยอดสุทธิ/เงินทอน ใช้ค่าที่ server คำนวณมาให้ ไม่คำนวณซ้ำที่หน้าเว็บ
  function receiptHtml(o) {
    const branch = o.branch || {};

    const receiptNo = o.receipt ? o.receipt.receipt_number : "#" + o.order_id;
    const typeText = TYPE_LABEL[o.order_type] || o.order_type;
    const tableText = o.table_number ? " · โต๊ะ " + esc(o.table_number) : "";
    const payText = PAY_LABEL[o.payment_method] || o.payment_method;

    // รายการสินค้า
    let itemsHtml = "";
    for (let i = 0; i < o.items.length; i++) {
      const item = o.items[i];
      itemsHtml +=
        '<div class="it"><div>' + esc(item.name) + "</div>" +
        '<div class="rw sub"><span>' + item.quantity + " x " + money(item.unit_price) + "</span>" +
        "<span>" + money(item.line_total) + "</span></div></div>";
    }

    // แสดงส่วนลดเฉพาะเมื่อมีส่วนลด
    let discountHtml = "";
    if (Number(o.discount_amount) > 0) {
      discountHtml = '<div class="rw"><span>ส่วนลด</span><span>-' + money(o.discount_amount) + "</span></div>";
    }

    // ป้ายยกเลิก เฉพาะออเดอร์ที่ void
    let voidHtml = "";
    if (o.payment_status === "voided") {
      voidHtml = '<div class="void">ยกเลิกแล้ว (VOID)</div>';
    }

    return (
      '<div class="receipt" id="receiptPaper">' +
      '<div class="c shop">Baristech Cafe</div>' +
      '<div class="c">' + esc(branch.name || "") + "</div>" +
      '<div class="c">' + esc(branch.address || "") + "</div>" +
      "<hr>" +
      '<div class="c">คิวที่</div>' +
      '<div class="c queue">' + esc(queueLabel(o)) + "</div>" +
      "<hr>" +
      '<div class="rw"><span>เลขที่</span><span>' + esc(receiptNo) + "</span></div>" +
      '<div class="rw"><span>วันที่</span><span>' + esc(fmtDateTime(o.created_at)) + "</span></div>" +
      '<div class="rw"><span>แคชเชียร์</span><span>' + esc(o.employee_name || "-") + "</span></div>" +
      '<div class="rw"><span>ประเภท</span><span>' + esc(typeText) + tableText + "</span></div>" +
      "<hr>" +
      itemsHtml +
      "<hr>" +
      '<div class="rw"><span>รวม</span><span>' + money(o.subtotal_amount) + "</span></div>" +
      discountHtml +
      '<div class="rw b"><span>ยอดสุทธิ</span><span>' + money(o.total_amount) + "</span></div>" +
      '<div class="rw"><span>' + esc(payText) + "</span><span>" + money(o.amount_received) + "</span></div>" +
      '<div class="rw"><span>เงินทอน</span><span>' + money(o.change_amount) + "</span></div>" +
      voidHtml +
      "<hr>" +
      '<div class="c">ขอบคุณที่ใช้บริการ</div>' +
      "</div>"
    );
  }

  // showReceipt(): โหลดออเดอร์ตามเลข แล้วเปิดใบเสร็จในหน้าต่างป๊อปอัป
  // ปุ่มพิมพ์ใช้ window.print() — CSS (@media print) จะซ่อนทุกอย่างยกเว้นใบเสร็จ
  async function showReceipt(orderId, options) {
    const title = (options && options.title) || "ใบเสร็จรับเงิน";

    const order = await api("/api/orders/" + orderId);
    const m = modal({
      title: title,
      body: receiptHtml(order),
      footer:
        '<button class="btn" data-close>ปิด</button>' +
        '<button class="btn primary" data-print>พิมพ์ใบเสร็จ</button>'
    });

    // ใส่ป้ายให้ CSS ตอนพิมพ์รู้ว่าหน้าต่างไหนคือใบเสร็จ
    m.el.classList.add("print-target");
    m.el.querySelector("[data-close]").onclick = m.close;

    // พิมพ์: เปิดโหมด print-receipt (CSS ซ่อนทุกอย่างยกเว้นใบเสร็จ) แล้วสั่งพิมพ์
    m.el.querySelector("[data-print]").onclick = function () {
      document.body.classList.add("print-receipt");
      window.addEventListener(
        "afterprint",
        function () {
          document.body.classList.remove("print-receipt");
        },
        { once: true }
      );
      window.print();
    };

    return m;
  }

  // ส่งออกให้ไฟล์อื่นเรียกใช้ผ่าน App
  window.App = window.App || {};
  Object.assign(window.App, {
    showReceipt: showReceipt
  });
})();
