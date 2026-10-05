// หน้ารายงานยอดขาย (Summary Report) — FR-07
// ข้อมูลมาจาก GET /api/orders (wk9) แล้วสรุปฝั่ง client; endpoint รายงานเฉพาะ (/api/reports/sales) ไว้ทำใน wk13
// ลำดับ: เลือกสาขา/ช่วงวันที่ -> load() ดึงออเดอร์จาก server -> render() สรุปตัวเลขที่ฝั่งหน้าเว็บ
// ยอดขายนับเฉพาะออเดอร์ที่ payment_status = "paid" (ออเดอร์ที่ยกเลิก = "voided" ไม่นับ)
(function () {
  const { api, toast, Shell, esc, baht, fmtDateTime, confirmBox, showReceipt, PAY_LABEL, TYPE_LABEL } = App;
  const $ = (id) => document.getElementById(id);

  const state = { orders: [], group: "day" };

  const ymd = App.ymdThai;

  // setPreset(): ปุ่มลัดช่วงเวลา (วันนี้ / 7 วันล่าสุด / เดือนนี้) นับตามวันที่ในเวลาไทย
  function setPreset(p) {
    const now = new Date();
    let from = ymd(now);
    if (p === "7d") from = ymd(new Date(now.getTime() - 6 * 86400000));
    if (p === "month") from = ymd(now).slice(0, 8) + "01";
    $("from").value = from;
    $("to").value = ymd(now);
    [...$("presets").children].forEach((b) => b.classList.toggle("active", b.dataset.p === p));
  }

  // load(): ตรวจช่วงวันที่ -> ขอออเดอร์ตามสาขา/วันที่ -> วาดรายงานใหม่
  async function load() {
    const from = $("from").value, to = $("to").value;
    $("rangeErr").textContent = from && to && from > to ? "วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด" : "";
    if ($("rangeErr").textContent) return;
    const qs = new URLSearchParams();
    if (Shell.branchId) qs.set("branchId", Shell.branchId);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    try {
      state.orders = (await api("/api/orders?" + qs)).map((o) => ({
        ...o,
        total_amount: Number(o.total_amount),
        change_amount: Number(o.change_amount),
        subtotal_amount: Number(o.subtotal_amount),
      }));
    } catch (e) {
      state.orders = [];
      toast(e.message, "error");
    }
    render();
  }

  // sumBy(): จัดกลุ่มออเดอร์ตาม key ที่กำหนด (วัน/วิธีจ่าย/สาขา) แล้วนับจำนวน+รวมยอด -> Map
  const sumBy = (rows, keyFn) => {
    const m = new Map();
    for (const o of rows) {
      const k = keyFn(o);
      const cur = m.get(k) || { count: 0, total: 0 };
      cur.count += 1; cur.total += o.total_amount;
      m.set(k, cur);
    }
    return m;
  };
  const empty = (cols, text = "ไม่มีข้อมูลในช่วงเวลานี้") => `<tr><td colspan="${cols}" class="hint" style="text-align:center;padding:24px">${text}</td></tr>`;

  // render(): คำนวณ KPI และตารางสรุปทั้งหมดจาก state.orders แล้ววาดลงหน้า
  function render() {
    const paid = state.orders.filter((o) => o.payment_status === "paid");
    const voided = state.orders.filter((o) => o.payment_status === "voided");
    const total = paid.reduce((s, o) => s + o.total_amount, 0);
    const avg = paid.length ? total / paid.length : 0;

    $("kpis").innerHTML = [
      ["ยอดขายรวม", baht(total), "ไม่รวมออเดอร์ที่ยกเลิก"],
      ["จำนวนออเดอร์", paid.length.toLocaleString("th-TH"), "ออเดอร์ที่ชำระแล้ว"],
      ["เฉลี่ยต่อออเดอร์", baht(avg), ""],
      ["ยกเลิก (Void)", voided.length.toLocaleString("th-TH"), voided.length ? baht(voided.reduce((s, o) => s + o.total_amount, 0)) : "—"],
    ].map(([l, v, s]) => `<div class="kpi"><div class="l">${l}</div><div class="v num">${v}</div><div class="s">${s}</div></div>`).join("");

    // รายวัน / รายเดือน
    const isMonth = state.group === "month";
    $("groupTitle").textContent = isMonth ? "สรุปยอดขายรายเดือน" : "สรุปยอดขายรายวัน";
    $("groupCol").textContent = isMonth ? "เดือน" : "วันที่";
    const grouped = [...sumBy(paid, (o) => { const d = new Date(o.created_at); return isMonth ? ymd(d).slice(0, 7) : ymd(d); }).entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
    const fmtKey = (k) => new Date(k + (isMonth ? "-01" : "")).toLocaleDateString("th-TH", { timeZone: "UTC", ...(isMonth ? { year: "numeric", month: "long" } : { dateStyle: "medium" }) });
    $("groupRows").innerHTML = grouped.length
      ? grouped.map(([k, v]) => `<tr><td>${fmtKey(k)}</td><td class="r num">${v.count}</td><td class="r num">${baht(v.total)}</td></tr>`).join("")
      : empty(3);

    // วิธีชำระเงิน
    const pays = [...sumBy(paid, (o) => o.payment_method).entries()].sort((a, b) => b[1].total - a[1].total);
    $("payRows").innerHTML = pays.length
      ? pays.map(([k, v]) => `<tr><td>${esc(PAY_LABEL[k] || k)}</td><td class="r num">${v.count}</td><td class="r num">${baht(v.total)}</td><td><div class="bar"><i style="width:${total ? (v.total / total) * 100 : 0}%"></i></div></td></tr>`).join("")
      : empty(4);

    // สาขา (เฉพาะเมื่อเลือก "ทุกสาขา")
    const showBranch = Shell.branchId === null;
    $("branchPanel").style.display = showBranch ? "" : "none";
    if (showBranch) {
      const bs = [...sumBy(paid, (o) => o.branch_id).entries()].sort((a, b) => b[1].total - a[1].total);
      $("branchRows").innerHTML = bs.length
        ? bs.map(([k, v]) => `<tr><td>${esc(Shell.branchName(k))}</td><td class="r num">${v.count}</td><td class="r num">${baht(v.total)}</td><td><div class="bar"><i style="width:${total ? (v.total / total) * 100 : 0}%"></i></div></td></tr>`).join("")
        : empty(4);
    }

    // รายการออเดอร์
    $("orderCount").textContent = `${state.orders.length} รายการ`;
    $("orderRows").innerHTML = state.orders.length
      ? state.orders.map((o) => `<tr class="${o.payment_status === "voided" ? "is-voided" : ""}" data-id="${o.order_id}">
          <td class="num"><b>${App.queueLabel(o)}</b></td>
          <td>${esc(fmtDateTime(o.created_at))}</td>
          <td>${esc(Shell.branchName(o.branch_id))}</td>
          <td>${esc(TYPE_LABEL[o.order_type] || o.order_type)}${o.table_number ? ` · ${esc(o.table_number)}` : ""}</td>
          <td>${esc(PAY_LABEL[o.payment_method] || o.payment_method)}</td>
          <td class="r num strike">${baht(o.total_amount)}</td>
          <td><span class="tag ${o.payment_status}">${o.payment_status === "paid" ? "ชำระแล้ว" : o.payment_status === "voided" ? "ยกเลิก" : "ค้างชำระ"}</span></td>
          <td><div class="actions"><button class="btn sm" data-act="view">ใบเสร็จ</button>${o.payment_status === "paid" ? '<button class="btn sm danger" data-act="void">ยกเลิก</button>' : ""}</div></td>
        </tr>`).join("")
      : empty(8);
  }

  // ผูกเหตุการณ์: ปุ่มลัด/เปลี่ยนวันที่ -> โหลดใหม่, สลับรายวัน/รายเดือน -> วาดใหม่, ปุ่มใบเสร็จ/ยกเลิก ในตารางออเดอร์
  // ---------- events ----------
  $("presets").addEventListener("click", (e) => {
    const b = e.target.closest("[data-p]");
    if (b) { setPreset(b.dataset.p); load(); }
  });
  ["from", "to"].forEach((id) => $(id).addEventListener("change", () => { [...$("presets").children].forEach((b) => b.classList.remove("active")); load(); }));
  $("groupSeg").addEventListener("click", (e) => {
    const b = e.target.closest("[data-g]");
    if (!b) return;
    state.group = b.dataset.g;
    [...$("groupSeg").children].forEach((x) => x.classList.toggle("active", x === b));
    render();
  });
  $("printBtn").addEventListener("click", () => window.print());
  $("orderRows").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const id = Number(b.closest("tr").dataset.id);
    try {
      if (b.dataset.act === "view") return await showReceipt(id);
      const ok = await confirmBox({ title: "ยกเลิกออเดอร์", message: `ยกเลิกออเดอร์คิว ${App.queueLabel(state.orders.find((o) => o.order_id === id))} ใช่หรือไม่? (ถ้าบาริสต้ายังไม่เริ่มทำ จะคืนวัตถุดิบเข้าสต็อก)`, okText: "ยกเลิกออเดอร์", danger: true });
      if (!ok) return;
      await api(`/api/orders/${id}`, { method: "DELETE" });
      toast("ยกเลิกออเดอร์และคืนสต็อกแล้ว");
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  });

  setPreset("today");
  Shell.init({ page: "report", title: "รายงานยอดขาย", allBranches: true, onBranch: load });
})();
