// หน้า POS รับออเดอร์ — US-01..US-06 (wk04)
// ลำดับการทำงานของหน้านี้:
//   เลือกเมนู (addItem) -> ตะกร้า (state.cart) -> คำนวณยอด+ตรวจข้อมูลทุกครั้งที่เปลี่ยน (renderTotals)
//   -> กดชำระเงิน (submit) -> POST /api/orders -> แสดงใบเสร็จ -> ล้างตะกร้า
// ทุกครั้งที่ state เปลี่ยน จะเรียกฟังก์ชัน render... เพื่อวาดหน้าจอส่วนนั้นใหม่
(function () {
  const { api, toast, Shell, esc, baht, imgTag } = App;
  const $ = (id) => document.getElementById(id);

  // state = ข้อมูลทั้งหมดที่หน้านี้จำไว้ (ไม่มีที่เก็บอื่น) — หน้าจอเป็นแค่ภาพสะท้อนของ state นี้
  const state = {
    menus: [],
    activeCat: "all",
    search: "",
    // ตะกร้า: เก็บเป็น Map ที่มี key = menu_id ทำให้เมนูเดิมถูกบวกจำนวน ไม่เกิดแถวซ้ำ
    cart: new Map(), // menuId -> { menu, qty }
    orderType: "dine_in",
    payMethod: "cash",
    submitting: false,
    today: [],
  };

  // ค่าที่คำนวณจาก state/ช่องกรอก (ไม่เก็บซ้ำ): ยอดรวม, ส่วนลด, ยอดสุทธิ, เงินที่รับ
  // ถ้าจ่ายด้วยบัตร/QR ถือว่ารับเงินเท่ายอดสุทธิพอดี
  // ---------- derived values ----------
  const subtotal = () => [...state.cart.values()].reduce((s, l) => s + l.menu.price * l.qty, 0);
  const discountVal = () => (parseFloat($("discount").value) || 0);
  const total = () => Math.max(subtotal() - discountVal(), 0);
  const receivedVal = () => (state.payMethod === "cash" ? parseFloat($("received").value) || 0 : total());

  // ---------- menu grid ----------
  // loadMenus(): ดึงเมนูของ "สาขาที่เลือกอยู่" จาก server มาเก็บใน state.menus
  async function loadMenus() {
    $("grid").innerHTML = '<div class="empty">กำลังโหลดเมนู...</div>';
    try {
      state.menus = (await api(`/api/menu?branchId=${Shell.branchId}`)).map((m) => ({ ...m, price: Number(m.price) }));
    } catch (e) {
      state.menus = [];
      toast(e.message, "error");
    }
    renderCats();
    renderGrid();
  }

  // renderCats(): วาดแท็บหมวดหมู่จากหมวดที่มีเมนูอยู่จริงในสาขานี้
  function renderCats() {
    const cats = [...new Map(state.menus.map((m) => [m.category_id, m.category_name])).entries()];
    if (state.activeCat !== "all" && !cats.some(([id]) => String(id) === state.activeCat)) state.activeCat = "all";
    $("cats").innerHTML =
      `<button class="pill ${state.activeCat === "all" ? "active" : ""}" data-cat="all">ทั้งหมด</button>` +
      cats.map(([id, name]) => `<button class="pill ${String(id) === state.activeCat ? "active" : ""}" data-cat="${id}">${esc(name)}</button>`).join("");
  }

  // renderGrid(): วาดการ์ดเมนู โดยกรองตามหมวดที่เลือกและคำค้นหา; มีเลขจำนวนบนการ์ดที่อยู่ในตะกร้าแล้ว
  function renderGrid() {
    const q = state.search.toLowerCase();
    const list = state.menus.filter(
      (m) => (state.activeCat === "all" || String(m.category_id) === state.activeCat) && (!q || m.name.toLowerCase().includes(q))
    );
    if (!list.length) {
      $("grid").innerHTML = `<div class="empty">${state.menus.length ? "ไม่พบเมนูที่ค้นหา" : "สาขานี้ยังไม่มีเมนู — เพิ่มได้ที่หน้า \"จัดการเมนู\""}</div>`;
      return;
    }
    $("grid").innerHTML = list
      .map((m) => {
        const inCart = state.cart.get(m.menu_id);
        return `<button class="card" data-id="${m.menu_id}" type="button">
          <div class="thumb">${imgTag(m.image_url, m.name)}${inCart ? `<span class="badge">${inCart.qty}</span>` : ""}</div>
          <div class="name">${esc(m.name)}</div>
          <div class="price num">${baht(m.price)}</div>
        </button>`;
      })
      .join("");
  }

  // ---------- cart ----------
  // renderCart(): วาดรายการในตะกร้าฝั่งขวา แล้วอัปเดตตัวเลขบนการ์ดและยอดรวมตาม
  function renderCart() {
    const lines = [...state.cart.values()];
    $("cart").innerHTML = lines.length
      ? lines
          .map(
            (l) => `<div class="line" data-id="${l.menu.menu_id}">
            <div class="top"><span class="nm">${esc(l.menu.name)}</span><span class="amt num">${baht(l.menu.price * l.qty)}</span></div>
            <div class="bot">
              <div class="stepper">
                <button type="button" data-act="dec" aria-label="ลด">−</button>
                <span class="q num">${l.qty}</span>
                <button type="button" data-act="inc" aria-label="เพิ่ม">+</button>
              </div>
              <span class="unit num">${baht(l.menu.price)} / ชิ้น</span>
            </div></div>`
          )
          .join("")
      : '<div class="cart-empty">ยังไม่มีรายการ — แตะที่เมนูเพื่อเพิ่ม</div>';
    $("clearCart").style.visibility = lines.length ? "visible" : "hidden";
    renderGrid();
    renderTotals();
  }

  // addItem(): กดการ์ดเมนู -> ถ้ามีในตะกร้าแล้วบวก 1 ไม่มีก็เพิ่มใหม่
  function addItem(id) {
    const menu = state.menus.find((m) => m.menu_id === id);
    if (!menu) return;
    const l = state.cart.get(id);
    if (l) l.qty += 1; else state.cart.set(id, { menu, qty: 1 });
    renderCart();
  }

  // changeQty(): ปุ่ม + / - ในตะกร้า (delta = +1 หรือ -1) ลดจนเหลือ 0 จะลบรายการออก
  function changeQty(id, delta) {
    const l = state.cart.get(id);
    if (!l) return;
    l.qty += delta;
    if (l.qty <= 0) state.cart.delete(id);
    renderCart();
  }

  // ---------- totals + validation (feedback ทันที) ----------
  // setErr(): แสดง/ล้างข้อความ error ใต้ช่อง และใส่/เอากรอบแดงที่ช่องนั้น
  function setErr(inputEl, errEl, msg) {
    errEl.textContent = msg || "";
    if (inputEl) inputEl.classList.toggle("invalid", !!msg);
  }

  // renderTotals(): หัวใจของหน้านี้ — เรียกทุกครั้งที่ข้อมูลเปลี่ยน ทำ 3 อย่าง:
  //   1) คำนวณและแสดงยอดรวม / ยอดสุทธิ / เงินทอน
  //   2) ตรวจข้อมูลแต่ละช่อง แล้วแสดง error ทันที (ส่วนลด, เลขโต๊ะ, เงินที่รับ)
  //   3) เปิด/ปิดปุ่ม "ชำระเงิน" และเขียนเหตุผลใต้ปุ่มเมื่อยังกดไม่ได้
  function renderTotals() {
    const sub = subtotal();
    const disc = discountVal();
    const tot = total();
    $("subtotal").textContent = baht(sub);
    $("total").textContent = baht(tot);

    // ส่วนลด
    let discMsg = "";
    if (disc < 0) discMsg = "ส่วนลดต้องไม่ติดลบ";
    else if (disc > sub) discMsg = "ส่วนลดต้องไม่เกินยอดรวม";
    setErr($("discount"), $("discountErr"), discMsg);

    // เลขโต๊ะ (US-02 AC-01)
    const needTable = state.orderType === "dine_in";
    $("tableRow").style.display = needTable ? "" : "none";
    // error เลขโต๊ะจะขึ้นหลังผู้ใช้แตะช่องนั้นแล้ว (dataset.touched) กันไม่ให้ขึ้นแดงตั้งแต่เปิดหน้า
    const tableMsg = needTable && !$("table").value.trim() && $("table").dataset.touched ? "ทานที่ร้านต้องระบุเลขโต๊ะ" : "";
    setErr($("table"), $("tableErr"), tableMsg);

    // การชำระเงิน (US-04)
    const isCash = state.payMethod === "cash";
    $("cashBox").style.display = isCash ? "" : "none";
    const rec = receivedVal();
    const diff = rec - tot;
    const recTouched = $("received").value !== "";
    let recMsg = "";
    if (isCash && recTouched && diff < 0) recMsg = "จำนวนเงินไม่เพียงพอ";
    setErr($("received"), $("receivedErr"), recMsg);

    const cb = $("changeBox");
    cb.classList.toggle("short", isCash && diff < 0);
    cb.firstElementChild.textContent = isCash && diff < 0 ? "ขาดอีก" : "เงินทอน";
    $("change").textContent = baht(isCash ? Math.abs(diff) : 0);

    // ปุ่มลัดรับเงิน: "พอดี" และธนบัตร 100/500/1000 ที่ไม่น้อยกว่ายอดสุทธิ
    // quick cash buttons
    const quicks = [{ label: "พอดี", v: tot }, ...[100, 500, 1000].filter((v) => v >= tot).slice(0, 3).map((v) => ({ label: String(v), v }))];
    $("quick").innerHTML = tot > 0 ? quicks.map((q) => `<button type="button" data-q="${q.v}">${q.label}</button>`).join("") : "";

    // ปุ่มชำระเงิน
    let reason = "";
    if (!state.cart.size) reason = "เลือกสินค้าอย่างน้อย 1 รายการ";
    else if (discMsg) reason = discMsg;
    else if (needTable && !$("table").value.trim()) reason = "กรุณาระบุเลขโต๊ะ";
    else if (isCash && (!recTouched || diff < 0)) reason = recTouched ? "จำนวนเงินไม่เพียงพอ" : "กรอกจำนวนเงินที่รับมา";
    $("payBtn").disabled = !!reason || state.submitting;
    $("reason").textContent = reason;
  }

  // ---------- submit ----------
  // submit(): กดชำระเงิน -> ส่งออเดอร์ไป server
  // หมายเหตุ: ส่งแค่ประเภท/โต๊ะ/วิธีจ่าย/ส่วนลด/เงินที่รับ/รายการ (menuId + จำนวน)
  //   ไม่ส่งราคา — server ดึงราคาจริงจากฐานข้อมูลเอง และใช้สาขา/พนักงานจาก token ที่ล็อกอิน (กันการแก้ข้อมูลฝั่งหน้าเว็บ)
  async function submit() {
    // กันกดซ้ำระหว่างรอ server ตอบ (ไม่งั้นอาจเกิดออเดอร์ซ้ำ)
    if (state.submitting) return;
    state.submitting = true;
    $("payBtn").disabled = true;
    $("payBtn").textContent = "กำลังบันทึก...";
    const payload = {
      orderType: state.orderType,
      tableNumber: state.orderType === "dine_in" ? $("table").value.trim() : null,
      paymentMethod: state.payMethod,
      discountAmount: discountVal(),
      amountReceived: receivedVal(),
      items: [...state.cart.values()].map((l) => ({ menuId: l.menu.menu_id, quantity: l.qty })),
    };
    try {
      const res = await api("/api/orders", { json: payload });
      const warnings = res.data.lowStockWarnings;
      resetOrder();
      await App.showReceipt(res.data.orderId, { title: "ชำระเงินสำเร็จ" });
      if (warnings && warnings.length) toast("สต็อกใกล้หมด: " + warnings.join(", "), "warn");
    } catch (e) {
      toast(e.message, "error"); // เช่น วัตถุดิบไม่เพียงพอ / จำนวนเงินไม่พอ (US-05)
    } finally {
      state.submitting = false;
      $("payBtn").textContent = "ชำระเงิน";
      renderTotals();
    }
  }

  // resetOrder(): ล้างตะกร้าและทุกช่องกรอก เตรียมรับออเดอร์ถัดไป
  function resetOrder() {
    state.cart.clear();
    $("table").value = "";
    delete $("table").dataset.touched;
    $("discount").value = "";
    $("received").value = "";
    renderCart();
  }

  // ---------- ออเดอร์วันนี้ + ยกเลิก (ลูกค้าขอยกเลิกหลังออกใบเสร็จ แต่ยังไม่ได้รับสินค้า) ----------
  // openToday(): หน้าต่าง "ออเดอร์วันนี้" ของสาขาตัวเอง ดูใบเสร็จ/ยกเลิกออเดอร์ได้
  // ยกเลิกได้เฉพาะออเดอร์สถานะ "รอทำ" (บาริสต้ายังไม่เริ่ม) — server ตรวจกฎนี้ซ้ำอีกชั้น
  async function openToday() {
    const m = App.modal({
      title: "ออเดอร์วันนี้",
      body: '<div id="todayBody" style="min-width:0">กำลังโหลด...</div>',
      footer: '<button class="btn" data-close type="button">ปิด</button>',
    });
    m.el.querySelector(".modal").style.maxWidth = "620px";
    m.el.querySelector("[data-close]").onclick = m.close;
    const body = m.el.querySelector("#todayBody");

    // refresh(): โหลดรายการออเดอร์วันนี้มาวาดตารางใหม่ (เรียกหลังยกเลิกทุกครั้ง)
    async function refresh() {
      let orders;
      try { orders = state.today = await api("/api/orders"); } catch (e) { body.textContent = e.message; return; }
      body.innerHTML = orders.length
        ? `<table><thead><tr><th>คิว</th><th>เวลา</th><th class="r">ยอด</th><th>สถานะ</th><th></th></tr></thead><tbody>${orders.map((o) => {
            const voided = o.payment_status === "voided";
            const canCancel = !voided && o.barista_status === "pending";
            return `<tr data-id="${o.order_id}" class="${voided ? "is-voided" : ""}">
              <td class="num"><b>${App.queueLabel(o)}</b></td>
              <td>${esc(App.fmtDateTime(o.created_at))}</td>
              <td class="r num">${baht(o.total_amount)}</td>
              <td>${voided ? '<span class="tag voided">ยกเลิก</span>' : `<span class="tag">${App.BARISTA_LABEL[o.barista_status]}</span>`}</td>
              <td><div class="actions"><button class="btn sm" data-act="view">ใบเสร็จ</button>${canCancel ? '<button class="btn sm danger" data-act="cancel">ยกเลิก</button>' : ""}</div></td>
            </tr>`;
          }).join("")}</tbody></table><p class="hint" style="margin-top:10px">ยกเลิกได้เฉพาะออเดอร์ที่บาริสต้ายังไม่เริ่มทำ (สถานะ "รอทำ") — คืนเงินลูกค้าด้วยตัวเอง</p>`
        : '<div class="hint" style="text-align:center;padding:24px">วันนี้ยังไม่มีออเดอร์</div>';
    }
    body.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      const id = Number(b.closest("tr").dataset.id);
      try {
        if (b.dataset.act === "view") return await App.showReceipt(id);
        const ok = await App.confirmBox({ title: "ยกเลิกออเดอร์", message: `ยกเลิกออเดอร์คิว ${App.queueLabel(state.today.find((o) => o.order_id === id))} ใช่หรือไม่? ระบบจะคืนวัตถุดิบเข้าสต็อก`, okText: "ยกเลิกออเดอร์", danger: true });
        if (!ok) return;
        const res = await api(`/api/orders/${id}`, { method: "DELETE" });
        toast(res.message);
      } catch (err) {
        toast(err.message, "error");
      }
      refresh();
    });
    refresh();
  }

  // ---------- events ----------
  $("todayBtn").addEventListener("click", openToday);
  // bind(): ผูกเหตุการณ์ (คลิก/พิมพ์) ของทุกปุ่มและช่องในหน้า ทำครั้งเดียวตอนเปิดหน้า
  function bind() {
    $("cats").addEventListener("click", (e) => {
      const b = e.target.closest("[data-cat]");
      if (!b) return;
      state.activeCat = b.dataset.cat;
      renderCats();
      renderGrid();
    });
    $("grid").addEventListener("click", (e) => {
      const c = e.target.closest(".card");
      if (c) addItem(Number(c.dataset.id));
    });
    $("cart").addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      changeQty(Number(b.closest(".line").dataset.id), b.dataset.act === "inc" ? 1 : -1);
    });
    $("clearCart").addEventListener("click", () => { state.cart.clear(); renderCart(); });

    $("typeSeg").addEventListener("click", (e) => {
      const b = e.target.closest("[data-type]");
      if (!b) return;
      state.orderType = b.dataset.type;
      [...$("typeSeg").children].forEach((x) => x.classList.toggle("active", x === b));
      renderTotals();
    });
    $("paySeg").addEventListener("click", (e) => {
      const b = e.target.closest("[data-pay]");
      if (!b) return;
      state.payMethod = b.dataset.pay;
      [...$("paySeg").children].forEach((x) => x.classList.toggle("active", x === b));
      renderTotals();
    });
    $("table").addEventListener("input", () => { $("table").dataset.touched = "1"; renderTotals(); });
    $("table").addEventListener("blur", () => { $("table").dataset.touched = "1"; renderTotals(); });
    $("discount").addEventListener("input", renderTotals);
    $("received").addEventListener("input", renderTotals);
    $("quick").addEventListener("click", (e) => {
      const b = e.target.closest("[data-q]");
      if (!b) return;
      $("received").value = b.dataset.q;
      renderTotals();
    });
    $("payBtn").addEventListener("click", submit);
  }

  // เริ่มทำงาน: ผูกเหตุการณ์ -> Shell.init (ตรวจล็อกอิน + โหลดสาขา) -> วาดตะกร้าเปล่า
  bind();
  Shell.init({
    page: "pos",
    title: "แคชเชียร์",
    search: true,
    onSearch: (t) => { state.search = t; renderGrid(); },
    onBranch: () => {
      // เปลี่ยนสาขา → ตะกร้าเก่าใช้ไม่ได้ (เมนูผูกกับสาขา)
      state.cart.clear();
      state.activeCat = "all";
      loadMenus().then(renderCart);
    },
  });
  renderCart();
})();
