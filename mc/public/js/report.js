// =====================================================================
// report.js — หน้ารายงานยอดขาย (report.html) เฉพาะเจ้าของ
//
// หน้านี้ทำอะไร: เลือกสาขา + ช่วงวันที่ -> ดึงออเดอร์ -> สรุปยอดขายที่ฝั่งหน้าเว็บ
//   (ยอดขายนับเฉพาะ payment_status = "paid", ออเดอร์ที่ยกเลิก = "voided" ไม่นับ)
//
// API ที่หน้านี้เรียก
//   GET    /api/orders?branchId=&from=&to=   โหลดออเดอร์ตามสาขา/วันที่   (load)
//   GET    /api/reports/sales?branchId=&from=&to=  ยอดขายรวมต่อเมนู      (load)
//   GET    /api/orders/:id                   ใบเสร็จ                    (showReceipt ใน common/receipt.js)
//   DELETE /api/orders/:id                   ยกเลิกออเดอร์               (ปุ่มยกเลิกในตาราง)
// หมายเหตุ: ยอดขายต่อเมนูสรุปโดย backend ส่วนตัวเลขอื่น (รายวัน/วิธีชำระ/สาขา) ยังสรุปในหน้านี้
// =====================================================================
(function () {
  const api = App.api;
  const toast = App.toast;
  const Shell = App.Shell;
  const baht = App.baht;
  const fmtDateTime = App.fmtDateTime;
  const confirmBox = App.confirmBox;
  const showReceipt = App.showReceipt;
  const PAY_LABEL = App.PAY_LABEL;
  const TYPE_LABEL = App.TYPE_LABEL;
  const ymd = App.ymdThai; // แปลงวันที่เป็น "YYYY-MM-DD" ตามเวลาไทย

  // หา element ในหน้าเว็บจาก id (ย่อมาจาก document.getElementById)
  function byId(id) {
    return document.getElementById(id);
  }

  const state = {
    orders: [],    // ออเดอร์ที่โหลดมา
    menuSales: [], // ยอดขายต่อเมนู (จาก /api/reports/sales)
    group: "day"   // สรุปรายวัน ("day") หรือรายเดือน ("month")
  };

  // หาออเดอร์จากเลข order_id
  function findOrder(orderId) {
    for (let i = 0; i < state.orders.length; i++) {
      if (state.orders[i].order_id === orderId) return state.orders[i];
    }
    return null;
  }

  // ทำให้ปุ่มใน container เป็น "ปุ่มที่ถูกเลือก" ทีละปุ่ม (activeBtn = null คือไม่เลือกปุ่มไหนเลย)
  function setActiveButton(container, activeBtn) {
    for (let i = 0; i < container.children.length; i++) {
      container.children[i].classList.remove("active");
    }
    if (activeBtn) activeBtn.classList.add("active");
  }

  // ปุ่มลัดช่วงเวลา: วันนี้ ("today") / 7 วันล่าสุด ("7d") / เดือนนี้ ("month")
  function setPreset(preset) {
    const now = new Date();
    let from = ymd(now);
    if (preset === "7d") {
      from = ymd(new Date(now.getTime() - 6 * 86400000));
    }
    if (preset === "month") {
      from = ymd(now).slice(0, 8) + "01"; // วันที่ 1 ของเดือนนี้
    }
    byId("from").value = from;
    byId("to").value = ymd(now);

    for (let i = 0; i < byId("presets").children.length; i++) {
      const btn = byId("presets").children[i];
      if (btn.dataset.p === preset) btn.classList.add("active");
      else btn.classList.remove("active");
    }
  }

  // โหลดออเดอร์ตามสาขา + ช่วงวันที่ แล้ววาดรายงานใหม่
  // เรียก API: GET /api/orders?branchId=&from=&to=  (backend: orderController.getAllOrders)
  async function load() {
    const from = byId("from").value;
    const to = byId("to").value;

    // ตรวจช่วงวันที่ก่อน
    if (from && to && from > to) {
      byId("rangeErr").textContent = "วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด";
      return;
    }
    byId("rangeErr").textContent = "";

    // ประกอบ query string (Shell.branchId เป็น null = ทุกสาขา จึงไม่ส่ง branchId)
    const params = new URLSearchParams();
    if (Shell.branchId) params.set("branchId", Shell.branchId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    try {
      // ยอดขายต่อเมนู (backend สรุปให้ ตัวเลขเป็น number แล้ว)
      state.menuSales = await api("/api/reports/sales?" + params.toString());

      const rows = await api("/api/orders?" + params.toString());
      state.orders = [];
      for (let i = 0; i < rows.length; i++) {
        const o = rows[i];
        // MySQL ส่ง DECIMAL มาเป็นข้อความ จึงแปลงเป็นตัวเลขก่อนนำไปบวก
        o.total_amount = Number(o.total_amount);
        o.change_amount = Number(o.change_amount);
        o.subtotal_amount = Number(o.subtotal_amount);
        state.orders.push(o);
      }
    } catch (err) {
      state.orders = [];
      state.menuSales = [];
      toast(err.message, "error");
    }
    render();
  }

  // จัดกลุ่มออเดอร์ตาม key (วัน/วิธีจ่าย/สาขา) แล้วนับจำนวน + รวมยอด
  // คืนค่าเป็นอาร์เรย์ [{ key, count, total }, ...]
  function groupOrders(orders, getKey) {
    const map = {};
    const result = [];
    for (let i = 0; i < orders.length; i++) {
      const key = getKey(orders[i]);
      if (!map[key]) {
        map[key] = { key: key, count: 0, total: 0 };
        result.push(map[key]);
      }
      map[key].count += 1;
      map[key].total += orders[i].total_amount;
    }
    return result;
  }

  // ---------- ตัวช่วยสร้างแถว/กล่องจาก <template> ใน report.html ----------

  // สำเนา element แรกใน <template> ที่มี id นี้ (แล้วค่อยเติมข้อความลงไป)
  function cloneTemplate(templateId) {
    return byId(templateId).content.firstElementChild.cloneNode(true);
  }

  // แถวตารางว่างพร้อมข้อความ (cols = จำนวนคอลัมน์ของตาราง)
  function emptyRow(cols) {
    const row = cloneTemplate("emptyRowTemplate");
    row.querySelector("td").colSpan = cols;
    return row;
  }

  // ใส่แถวทั้งหมดลงใน <tbody> (ถ้าไม่มีแถวเลย แสดงแถว "ไม่มีข้อมูล")
  function showRows(tbodyId, rows, cols) {
    const tbody = byId(tbodyId);
    tbody.innerHTML = "";

    if (rows.length === 0) {
      tbody.appendChild(emptyRow(cols));
      return;
    }
    for (let i = 0; i < rows.length; i++) {
      tbody.appendChild(rows[i]);
    }
  }

  // แถวสรุปรายวัน/รายเดือน: วันที่ | จำนวนออเดอร์ | ยอดขาย
  function makeGroupRow(label, count, total) {
    const row = cloneTemplate("groupRowTemplate");
    row.querySelector(".cell-name").textContent = label;
    row.querySelector(".cell-count").textContent = count;
    row.querySelector(".cell-total").textContent = baht(total);
    return row;
  }

  // แถวที่มีแถบสัดส่วน: ชื่อ | จำนวน | ยอดขาย | แถบ (ใช้กับวิธีชำระเงิน / สาขา / เมนู)
  // sum = ยอดรวมทั้งหมด ใช้คิดเปอร์เซ็นต์ของแถบ
  function makeBarRow(name, count, total, sum) {
    const percent = sum > 0 ? (total / sum) * 100 : 0;

    const row = cloneTemplate("barRowTemplate");
    row.querySelector(".cell-name").textContent = name;
    row.querySelector(".cell-count").textContent = count;
    row.querySelector(".cell-total").textContent = baht(total);
    row.querySelector(".bar-fill").style.width = percent + "%";
    return row;
  }

  // ช่องตัวเลขสรุป (KPI) 1 ช่อง
  function makeKpi(label, value, sub) {
    const box = cloneTemplate("kpiTemplate");
    box.querySelector(".l").textContent = label;
    box.querySelector(".v").textContent = value;
    box.querySelector(".s").textContent = sub;
    return box;
  }

  // แถวรายการออเดอร์ 1 แถว
  function makeOrderRow(o) {
    const row = cloneTemplate("orderRowTemplate");
    row.dataset.id = o.order_id;

    let statusText = "ค้างชำระ";
    if (o.payment_status === "paid") statusText = "ชำระแล้ว";
    if (o.payment_status === "voided") statusText = "ยกเลิก";

    let typeText = TYPE_LABEL[o.order_type] || o.order_type;
    if (o.table_number) typeText += " · " + o.table_number;

    row.querySelector(".cell-queue").textContent = App.queueLabel(o);
    row.querySelector(".cell-time").textContent = fmtDateTime(o.created_at);
    row.querySelector(".cell-branch").textContent = Shell.branchName(o.branch_id);
    row.querySelector(".cell-type").textContent = typeText;
    row.querySelector(".cell-pay").textContent = PAY_LABEL[o.payment_method] || o.payment_method;
    row.querySelector(".cell-total").textContent = baht(o.total_amount);

    const tag = row.querySelector(".cell-status");
    tag.textContent = statusText;
    tag.classList.add(o.payment_status);

    // ออเดอร์ที่ยกเลิกแล้ว: ทำเป็นแถวจาง
    if (o.payment_status === "voided") {
      row.classList.add("is-voided");
    }
    // ปุ่มยกเลิกมีเฉพาะออเดอร์ที่จ่ายแล้ว
    if (o.payment_status !== "paid") {
      row.querySelector('[data-act="void"]').remove();
    }
    return row;
  }

  // วาดรายงานทั้งหมดจาก state.orders: ตัวเลขสรุป (KPI) + ตารางสรุป + รายการออเดอร์
  function render() {
    // แยกออเดอร์ที่จ่ายแล้ว / ยกเลิก
    const paid = [];
    const voided = [];
    for (let i = 0; i < state.orders.length; i++) {
      if (state.orders[i].payment_status === "paid") paid.push(state.orders[i]);
      if (state.orders[i].payment_status === "voided") voided.push(state.orders[i]);
    }

    let total = 0;
    for (let i = 0; i < paid.length; i++) total += paid[i].total_amount;
    const avg = paid.length > 0 ? total / paid.length : 0;

    let voidTotal = 0;
    for (let i = 0; i < voided.length; i++) voidTotal += voided[i].total_amount;

    // ---------- ตัวเลขสรุป 4 ช่อง ----------
    const kpiBox = byId("kpis");
    kpiBox.innerHTML = "";
    kpiBox.appendChild(makeKpi("ยอดขายรวม", baht(total), "ไม่รวมออเดอร์ที่ยกเลิก"));
    kpiBox.appendChild(makeKpi("จำนวนออเดอร์", paid.length.toLocaleString("th-TH"), "ออเดอร์ที่ชำระแล้ว"));
    kpiBox.appendChild(makeKpi("เฉลี่ยต่อออเดอร์", baht(avg), ""));
    kpiBox.appendChild(makeKpi(
      "ยกเลิก (Void)",
      voided.length.toLocaleString("th-TH"),
      voided.length > 0 ? baht(voidTotal) : "—"
    ));

    // ---------- สรุปรายวัน / รายเดือน ----------
    const isMonth = state.group === "month";
    byId("groupTitle").textContent = isMonth ? "สรุปยอดขายรายเดือน" : "สรุปยอดขายรายวัน";
    byId("groupCol").textContent = isMonth ? "เดือน" : "วันที่";

    const byDate = groupOrders(paid, function (o) {
      const day = ymd(new Date(o.created_at)); // "2026-10-16"
      return isMonth ? day.slice(0, 7) : day;  // "2026-10" หรือ "2026-10-16"
    });
    // เรียงใหม่สุดขึ้นก่อน
    byDate.sort(function (a, b) {
      return a.key < b.key ? 1 : -1;
    });

    const groupRows = [];
    for (let i = 0; i < byDate.length; i++) {
      const g = byDate[i];
      let label;
      if (isMonth) {
        label = new Date(g.key + "-01").toLocaleDateString("th-TH", {
          timeZone: "UTC",
          year: "numeric",
          month: "long"
        });
      } else {
        label = new Date(g.key).toLocaleDateString("th-TH", {
          timeZone: "UTC",
          dateStyle: "medium"
        });
      }
      groupRows.push(makeGroupRow(label, g.count, g.total));
    }
    showRows("groupRows", groupRows, 3);

    // ---------- สรุปตามวิธีชำระเงิน ----------
    const byPay = groupOrders(paid, function (o) {
      return o.payment_method;
    });
    byPay.sort(function (a, b) {
      return b.total - a.total;
    });

    const payRows = [];
    for (let i = 0; i < byPay.length; i++) {
      const g = byPay[i];
      payRows.push(makeBarRow(PAY_LABEL[g.key] || g.key, g.count, g.total, total));
    }
    showRows("payRows", payRows, 4);

    // ---------- สรุปตามสาขา (แสดงเมื่อเลือก "ทุกสาขา") ----------
    const showBranch = Shell.branchId === null;
    byId("branchPanel").style.display = showBranch ? "" : "none";
    if (showBranch) {
      const byBranch = groupOrders(paid, function (o) {
        return o.branch_id;
      });
      byBranch.sort(function (a, b) {
        return b.total - a.total;
      });

      const branchRows = [];
      for (let i = 0; i < byBranch.length; i++) {
        const g = byBranch[i];
        branchRows.push(makeBarRow(Shell.branchName(Number(g.key)), g.count, g.total, total));
      }
      showRows("branchRows", branchRows, 4);
    }

    // ---------- ยอดขายแยกตามเมนู (ข้อมูลจาก /api/reports/sales) ----------
    let menuTotal = 0;
    for (let i = 0; i < state.menuSales.length; i++) {
      menuTotal += state.menuSales[i].totalSales;
    }

    const menuRows = [];
    for (let i = 0; i < state.menuSales.length; i++) {
      const m = state.menuSales[i];
      menuRows.push(makeBarRow(m.menuName, m.totalQuantity, m.totalSales, menuTotal));
    }
    showRows("menuRows", menuRows, 4);

    // ---------- รายการออเดอร์ ----------
    byId("orderCount").textContent = state.orders.length + " รายการ";

    const orderRows = [];
    for (let i = 0; i < state.orders.length; i++) {
      orderRows.push(makeOrderRow(state.orders[i]));
    }
    showRows("orderRows", orderRows, 8);
  }

  // ---------- ผูกเหตุการณ์ ----------

  // ปุ่มลัดช่วงเวลา -> ตั้งวันที่แล้วโหลดใหม่
  byId("presets").addEventListener("click", function (e) {
    const btn = e.target.closest("[data-p]");
    if (!btn) return;
    setPreset(btn.dataset.p);
    load();
  });

  // เปลี่ยนวันที่เอง -> ยกเลิกการเลือกปุ่มลัด แล้วโหลดใหม่
  function onDateChange() {
    setActiveButton(byId("presets"), null);
    load();
  }
  byId("from").addEventListener("change", onDateChange);
  byId("to").addEventListener("change", onDateChange);

  // สลับ รายวัน / รายเดือน (ไม่ต้องโหลดใหม่ แค่วาดใหม่)
  byId("groupSeg").addEventListener("click", function (e) {
    const btn = e.target.closest("[data-g]");
    if (!btn) return;
    state.group = btn.dataset.g;
    setActiveButton(byId("groupSeg"), btn);
    render();
  });

  // ปุ่มพิมพ์รายงาน
  byId("printBtn").addEventListener("click", function () {
    window.print();
  });

  // ปุ่มในตารางออเดอร์: ใบเสร็จ / ยกเลิก
  byId("orderRows").addEventListener("click", async function (e) {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const orderId = Number(btn.closest("tr").dataset.id);

    try {
      if (btn.dataset.act === "view") {
        // เรียก API: GET /api/orders/:id (อยู่ใน showReceipt)
        await showReceipt(orderId);
        return;
      }

      // ปุ่มยกเลิก: ถามยืนยันก่อน
      const ok = await confirmBox({
        title: "ยกเลิกออเดอร์",
        message:
          "ยกเลิกออเดอร์คิว " + App.queueLabel(findOrder(orderId)) +
          " ใช่หรือไม่? (ถ้าบาริสต้ายังไม่เริ่มทำ จะคืนวัตถุดิบเข้าสต็อก)",
        okText: "ยกเลิกออเดอร์",
        danger: true
      });
      if (!ok) return;

      // เรียก API: DELETE /api/orders/:id  (backend: orderController.deleteOrder)
      await api("/api/orders/" + orderId, { method: "DELETE" });
      toast("ยกเลิกออเดอร์และคืนสต็อกแล้ว");
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  });

  // ---------- เริ่มทำงาน ----------
  setPreset("today");
  Shell.init({ page: "report", title: "รายงานยอดขาย", allBranches: true, onBranch: load });
})();
