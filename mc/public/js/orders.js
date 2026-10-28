// =====================================================================
// orders.js — หน้าประวัติออเดอร์ (orders.html) สำหรับแคชเชียร์
//
// หน้านี้ทำอะไร: แสดงออเดอร์วันนี้ของสาขาตัวเอง ดูใบเสร็จ (พิมพ์ซ้ำได้) และยกเลิกออเดอร์ที่บาริสต้ายังไม่เริ่มทำ
//
// API ที่หน้านี้เรียก (ดูตารางเต็มที่ docs/frontend-api-review.md)
//   GET    /api/orders           ออเดอร์วันนี้      (load) — server บังคับให้แคชเชียร์ได้เฉพาะ "วันนี้ + สาขาตัวเอง"
//   GET    /api/orders/:id       ใบเสร็จ           (App.showReceipt ใน common/receipt.js)
//   DELETE /api/orders/:id       ยกเลิกออเดอร์      (ปุ่มยกเลิกในตาราง)
// =====================================================================
(function () {
  const api = App.api;
  const toast = App.toast;
  const Shell = App.Shell;
  const baht = App.baht;
  const fmtDateTime = App.fmtDateTime;
  const BARISTA_LABEL = App.BARISTA_LABEL;

  // หา element ในหน้าเว็บจาก id (ย่อมาจาก document.getElementById)
  function byId(id) {
    return document.getElementById(id);
  }

  const state = {
    orders: [] // ออเดอร์ที่โหลดมา
  };

  // หาออเดอร์จากเลข order_id
  function findOrder(orderId) {
    for (let i = 0; i < state.orders.length; i++) {
      if (state.orders[i].order_id === orderId) return state.orders[i];
    }
    return null;
  }

  // สำเนา element แรกใน <template> ที่มี id นี้ (แล้วค่อยเติมข้อความลงไป)
  function cloneTemplate(templateId) {
    return byId(templateId).content.firstElementChild.cloneNode(true);
  }

  // แถวออเดอร์ 1 แถว
  function makeOrderRow(o) {
    const row = cloneTemplate("orderRowTemplate");
    row.dataset.id = o.order_id;

    const voided = o.payment_status === "voided";
    // ยกเลิกได้เฉพาะออเดอร์ที่ยังไม่ถูกยกเลิก และบาริสต้ายังไม่เริ่มทำ
    const canCancel = !voided && o.barista_status === "pending";

    row.querySelector(".cell-queue").textContent = App.queueLabel(o);
    row.querySelector(".cell-time").textContent = fmtDateTime(o.created_at);
    row.querySelector(".cell-total").textContent = baht(o.total_amount);

    const tag = row.querySelector(".cell-status");
    if (voided) {
      tag.textContent = "ยกเลิก";
      tag.classList.add("voided");
      row.classList.add("is-voided");
    } else {
      tag.textContent = BARISTA_LABEL[o.barista_status];
    }

    if (!canCancel) {
      row.querySelector('[data-act="cancel"]').remove();
    }
    return row;
  }

  // วาดตารางออเดอร์จาก state.orders
  function render() {
    byId("orderCount").textContent = state.orders.length + " รายการ";

    const tbody = byId("orderRows");
    tbody.innerHTML = "";

    if (state.orders.length === 0) {
      tbody.appendChild(cloneTemplate("emptyRowTemplate"));
      return;
    }
    for (let i = 0; i < state.orders.length; i++) {
      tbody.appendChild(makeOrderRow(state.orders[i]));
    }
  }

  // โหลดออเดอร์วันนี้ แล้ววาดตารางใหม่ (เรียกหลังยกเลิกทุกครั้ง)
  // เรียก API: GET /api/orders  (backend: orderController.getAllOrders)
  async function load() {
    try {
      state.orders = await api("/api/orders");
    } catch (err) {
      state.orders = [];
      toast(err.message, "error");
    }
    render();
  }

  // ---------- ผูกเหตุการณ์ ----------

  // ปุ่มในตาราง: ใบเสร็จ / ยกเลิก
  byId("orderRows").addEventListener("click", async function (e) {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const orderId = Number(btn.closest("tr").dataset.id);

    try {
      if (btn.dataset.act === "view") {
        // เรียก API: GET /api/orders/:id (อยู่ใน App.showReceipt)
        await App.showReceipt(orderId);
        return;
      }

      // ปุ่มยกเลิก: ถามยืนยันก่อน
      const ok = await App.confirmBox({
        title: "ยกเลิกออเดอร์",
        message:
          "ยกเลิกออเดอร์คิว " + App.queueLabel(findOrder(orderId)) +
          " ใช่หรือไม่? ระบบจะคืนวัตถุดิบเข้าสต็อก",
        okText: "ยกเลิกออเดอร์",
        danger: true
      });
      if (!ok) return;

      // เรียก API: DELETE /api/orders/:id  (backend: orderController.deleteOrder — คืนสต็อก + เปลี่ยนสถานะเป็น voided)
      const res = await api("/api/orders/" + orderId, { method: "DELETE" });
      toast(res.message);
    } catch (err) {
      toast(err.message, "error");
    }
    load();
  });

  // ---------- เริ่มทำงาน ----------
  // onBranch ถูกเรียกครั้งแรกหลังโหลดสาขาเสร็จ จึงเป็นจุดที่เรียก load
  Shell.init({ page: "orders", title: "ประวัติออเดอร์", onBranch: load });
})();
