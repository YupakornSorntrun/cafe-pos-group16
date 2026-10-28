// =====================================================================
// pos.js — หน้าแคชเชียร์ (index.html)
//
// หน้านี้ทำอะไร: เลือกเมนู -> ใส่ตะกร้า -> กรอกโต๊ะ/ส่วนลด/เงินที่รับ -> กดชำระเงิน
//
// API ที่หน้านี้เรียก (ดูตารางเต็มที่ docs/frontend-api-review.md)
//   GET    /api/menu?branchId=   โหลดเมนู          (loadMenus)
//   POST   /api/orders           สร้างออเดอร์       (submit)
//   GET    /api/orders/:id       ใบเสร็จ           (App.showReceipt ใน common/receipt.js)
// ดูประวัติ/ยกเลิกออเดอร์วันนี้ อยู่ที่หน้า orders.html (orders.js)
//
// แนวคิด: ข้อมูลทั้งหมดเก็บในตัวแปร state แล้วมีฟังก์ชัน render... วาดหน้าจอจาก state
// =====================================================================
(function () {
  const api = App.api;
  const toast = App.toast;
  const Shell = App.Shell;
  const esc = App.esc;
  const baht = App.baht;
  const imgTag = App.imgTag;

  // ย่อ document.getElementById ให้สั้นลง
  function byId(id) {
    return document.getElementById(id);
  }

  // ข้อมูลที่หน้านี้จำไว้
  const state = {
    menus: [],          // เมนูของสาขาที่เลือก
    activeCat: "all",   // หมวดที่เลือกอยู่
    search: "",         // คำค้นหา
    cart: [],           // ตะกร้า: [{ menu: {...}, qty: 2 }, ...]
    orderType: "dine_in",
    payMethod: "cash",
    submitting: false   // true ระหว่างรอ server ตอบ (กันกดซ้ำ)
  };

  // ---------- ตะกร้า (ฟังก์ชันช่วย) ----------

  // หารายการในตะกร้าจาก menu_id (ไม่เจอคืน null)
  function findCartLine(menuId) {
    for (let i = 0; i < state.cart.length; i++) {
      if (state.cart[i].menu.menu_id === menuId) return state.cart[i];
    }
    return null;
  }

  // ลบรายการออกจากตะกร้า
  function removeCartLine(menuId) {
    const newCart = [];
    for (let i = 0; i < state.cart.length; i++) {
      if (state.cart[i].menu.menu_id !== menuId) newCart.push(state.cart[i]);
    }
    state.cart = newCart;
  }

  // จำนวนที่ยังเพิ่มลงตะกร้าได้อีก (ขายได้อีก - ที่อยู่ในตะกร้าแล้ว) null = ไม่จำกัด
  function remainingQty(menu) {
    if (menu.available_qty === null) return null;
    const line = findCartLine(menu.menu_id);
    const inCart = line ? line.qty : 0;
    return Math.max(menu.available_qty - inCart, 0);
  }

  // เพิ่มได้อีก 1 ชิ้นไหม ถ้าไม่ได้จะเตือนทันที (ไม่ต้องรอไปเตือนตอนกดชำระเงิน)
  // หมายเหตุ: นี่เป็นแค่การเตือนล่วงหน้า — server ตรวจสต็อกซ้ำตอนชำระเงินเสมอ
  function canAddOne(menu) {
    const left = remainingQty(menu);
    if (left === null || left > 0) return true;

    if (menu.available_qty === 0) {
      toast(menu.name + " — วัตถุดิบไม่พอ (หมดแล้ว)", "warn");
    } else {
      toast(menu.name + " — วัตถุดิบไม่พอ ขายได้ไม่เกิน " + menu.available_qty + " ชิ้น", "warn");
    }
    return false;
  }

  // ยอดรวมก่อนลด
  function subtotal() {
    let sum = 0;
    for (let i = 0; i < state.cart.length; i++) {
      sum += state.cart[i].menu.price * state.cart[i].qty;
    }
    return sum;
  }

  // ส่วนลดที่กรอก (ว่าง = 0)
  function discountVal() {
    return parseFloat(byId("discount").value) || 0;
  }

  // ยอดสุทธิ = ยอดรวม - ส่วนลด (ไม่ต่ำกว่า 0)
  function total() {
    return Math.max(subtotal() - discountVal(), 0);
  }

  // เงินที่รับ: เงินสดใช้ค่าที่กรอก, บัตร/QR ถือว่ารับพอดียอดสุทธิ
  function receivedVal() {
    if (state.payMethod === "cash") return parseFloat(byId("received").value) || 0;
    return total();
  }

  // ---------- เมนู ----------

  // โหลดเมนูของสาขาที่เลือก
  // เรียก API: GET /api/menu?branchId=...  (backend: routes/menuRoutes.js -> menuController.getMenus)
  async function loadMenus() {
    byId("grid").innerHTML = '<div class="empty">กำลังโหลดเมนู...</div>';
    try {
      const rows = await api("/api/menu?branchId=" + Shell.branchId);
      state.menus = [];
      for (let i = 0; i < rows.length; i++) {
        const menu = rows[i];
        menu.price = Number(menu.price); // MySQL ส่ง DECIMAL มาเป็นข้อความ จึงแปลงเป็นตัวเลข
        // available_qty = ขายได้อีกกี่ชิ้น (null = ไม่จำกัด เพราะเมนูนี้ไม่มีสูตร)
        menu.available_qty = menu.available_qty === null ? null : Number(menu.available_qty);
        state.menus.push(menu);
      }
    } catch (err) {
      state.menus = [];
      toast(err.message, "error");
    }
    renderCats();
    renderGrid();
  }

  // วาดปุ่มหมวดหมู่ (เฉพาะหมวดที่มีเมนูอยู่จริง)
  function renderCats() {
    // รวบรวมหมวดไม่ซ้ำ
    const cats = [];
    const seen = {};
    for (let i = 0; i < state.menus.length; i++) {
      const m = state.menus[i];
      if (!seen[m.category_id]) {
        seen[m.category_id] = true;
        cats.push({ id: m.category_id, name: m.category_name });
      }
    }

    // ถ้าหมวดที่เลือกอยู่หายไป (เช่นเปลี่ยนสาขา) ให้กลับไป "ทั้งหมด"
    if (state.activeCat !== "all" && !seen[state.activeCat]) state.activeCat = "all";

    let html = '<button class="pill ' + (state.activeCat === "all" ? "active" : "") + '" data-cat="all">ทั้งหมด</button>';
    for (let i = 0; i < cats.length; i++) {
      const c = cats[i];
      const active = String(c.id) === state.activeCat ? "active" : "";
      html += '<button class="pill ' + active + '" data-cat="' + c.id + '">' + esc(c.name) + "</button>";
    }
    byId("cats").innerHTML = html;
  }

  // วาดการ์ดเมนู (กรองตามหมวดและคำค้นหา)
  function renderGrid() {
    const keyword = state.search.toLowerCase();
    const list = [];
    for (let i = 0; i < state.menus.length; i++) {
      const m = state.menus[i];
      const catOk = state.activeCat === "all" || String(m.category_id) === state.activeCat;
      const nameOk = keyword === "" || m.name.toLowerCase().indexOf(keyword) !== -1;
      if (catOk && nameOk) list.push(m);
    }

    if (list.length === 0) {
      if (state.menus.length > 0) {
        byId("grid").innerHTML = '<div class="empty">ไม่พบเมนูที่ค้นหา</div>';
      } else {
        byId("grid").innerHTML = '<div class="empty">สาขานี้ยังไม่มีเมนู — เพิ่มได้ที่หน้า "จัดการเมนู"</div>';
      }
      return;
    }

    let html = "";
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      const line = findCartLine(m.menu_id);
      // เลขจำนวนบนการ์ด ถ้าเมนูนี้อยู่ในตะกร้าแล้ว
      const badge = line ? '<span class="badge">' + line.qty + "</span>" : "";

      // จำนวนที่ขายได้อีก (เมนูที่ไม่มีสูตรจะไม่แสดง)
      const left = remainingQty(m);
      let stockHtml = "";
      if (left !== null) {
        let stockText = "เหลือ " + left;
        if (left === 0) stockText = m.available_qty === 0 ? "หมด" : "ครบจำนวนที่มี";
        const stockClass = left <= 3 ? "stock low" : "stock";
        stockHtml = '<div class="' + stockClass + '">' + stockText + "</div>";
      }
      const cardClass = left === 0 ? "card soldout" : "card";

      html +=
        '<button class="' + cardClass + '" data-id="' + m.menu_id + '" type="button">' +
        '<div class="thumb">' + imgTag(m.image_url, m.name) + badge + "</div>" +
        '<div class="name">' + esc(m.name) + "</div>" +
        '<div class="price num">' + baht(m.price) + "</div>" +
        stockHtml +
        "</button>";
    }
    byId("grid").innerHTML = html;
  }

  // ---------- ตะกร้า (วาดหน้าจอ) ----------

  // วาดรายการในตะกร้า แล้วอัปเดตการ์ดเมนูและยอดรวมตาม
  function renderCart() {
    if (state.cart.length === 0) {
      byId("cart").innerHTML = '<div class="cart-empty">ยังไม่มีรายการ — แตะที่เมนูเพื่อเพิ่ม</div>';
    } else {
      let html = "";
      for (let i = 0; i < state.cart.length; i++) {
        const l = state.cart[i];
        html +=
          '<div class="line" data-id="' + l.menu.menu_id + '">' +
          '<div class="top"><span class="nm">' + esc(l.menu.name) + '</span><span class="amt num">' + baht(l.menu.price * l.qty) + "</span></div>" +
          '<div class="bot">' +
          '<div class="stepper">' +
          '<button type="button" data-act="dec" aria-label="ลด">−</button>' +
          '<span class="q num">' + l.qty + "</span>" +
          '<button type="button" data-act="inc" aria-label="เพิ่ม">+</button>' +
          "</div>" +
          '<span class="unit num">' + baht(l.menu.price) + " / ชิ้น</span>" +
          "</div></div>";
      }
      byId("cart").innerHTML = html;
    }
    byId("clearCart").style.visibility = state.cart.length > 0 ? "visible" : "hidden";
    renderGrid();
    renderTotals();
  }

  // กดการ์ดเมนู: มีในตะกร้าแล้วบวก 1, ยังไม่มีก็เพิ่มใหม่
  function addItem(menuId) {
    let menu = null;
    for (let i = 0; i < state.menus.length; i++) {
      if (state.menus[i].menu_id === menuId) menu = state.menus[i];
    }
    if (!menu) return;
    if (!canAddOne(menu)) return; // วัตถุดิบไม่พอ -> เตือนและไม่เพิ่ม

    const line = findCartLine(menuId);
    if (line) {
      line.qty += 1;
    } else {
      state.cart.push({ menu: menu, qty: 1 });
    }
    renderCart();
  }

  // ปุ่ม + / - ในตะกร้า (delta = +1 หรือ -1) ลดจนเหลือ 0 จะลบรายการ
  function changeQty(menuId, delta) {
    const line = findCartLine(menuId);
    if (!line) return;
    if (delta > 0 && !canAddOne(line.menu)) return; // กด + เกินจำนวนที่ขายได้
    line.qty += delta;
    if (line.qty <= 0) removeCartLine(menuId);
    renderCart();
  }

  // ---------- ยอดรวม + ตรวจข้อมูล ----------

  // แสดง/ล้างข้อความ error ใต้ช่อง และใส่/เอากรอบแดง
  function setErr(inputEl, errEl, msg) {
    errEl.textContent = msg || "";
    if (inputEl) {
      if (msg) inputEl.classList.add("invalid");
      else inputEl.classList.remove("invalid");
    }
  }

  // เรียกทุกครั้งที่ข้อมูลเปลี่ยน ทำ 3 อย่าง:
  //   1) คำนวณและแสดงยอดรวม / ยอดสุทธิ / เงินทอน
  //   2) ตรวจช่องกรอก (ส่วนลด, เลขโต๊ะ, เงินที่รับ) แล้วแสดง error
  //   3) เปิด/ปิดปุ่ม "ชำระเงิน" พร้อมบอกเหตุผลที่กดไม่ได้
  // หมายเหตุ: นี่เป็นแค่การช่วยผู้ใช้ — server ตรวจซ้ำทั้งหมดอีกครั้งเสมอ
  function renderTotals() {
    const sub = subtotal();
    const disc = discountVal();
    const tot = total();
    byId("subtotal").textContent = baht(sub);
    byId("total").textContent = baht(tot);

    // ส่วนลด
    let discMsg = "";
    if (disc < 0) discMsg = "ส่วนลดต้องไม่ติดลบ";
    else if (disc > sub) discMsg = "ส่วนลดต้องไม่เกินยอดรวม";
    setErr(byId("discount"), byId("discountErr"), discMsg);

    // เลขโต๊ะ (ทานที่ร้านต้องมีเลขโต๊ะ)
    const needTable = state.orderType === "dine_in";
    byId("tableRow").style.display = needTable ? "" : "none";
    const tableEmpty = byId("table").value.trim() === "";
    // แสดง error หลังผู้ใช้แตะช่องแล้วเท่านั้น (dataset.touched) จะได้ไม่แดงตั้งแต่เปิดหน้า
    let tableMsg = "";
    if (needTable && tableEmpty && byId("table").dataset.touched) tableMsg = "ทานที่ร้านต้องระบุเลขโต๊ะ";
    setErr(byId("table"), byId("tableErr"), tableMsg);

    // การชำระเงิน
    const isCash = state.payMethod === "cash";
    byId("cashBox").style.display = isCash ? "" : "none";
    const received = receivedVal();
    const diff = received - tot; // บวก = เงินทอน, ลบ = ขาดเงิน
    const receivedTouched = byId("received").value !== "";
    let receivedMsg = "";
    if (isCash && receivedTouched && diff < 0) receivedMsg = "จำนวนเงินไม่เพียงพอ";
    setErr(byId("received"), byId("receivedErr"), receivedMsg);

    // กล่องเงินทอน / ขาดอีก
    const changeBox = byId("changeBox");
    const isShort = isCash && diff < 0;
    if (isShort) changeBox.classList.add("short");
    else changeBox.classList.remove("short");
    changeBox.firstElementChild.textContent = isShort ? "ขาดอีก" : "เงินทอน";
    byId("change").textContent = baht(isCash ? Math.abs(diff) : 0);

    // ปุ่มลัดรับเงิน: "พอดี" และธนบัตร 100/500/1000 ที่ไม่น้อยกว่ายอดสุทธิ
    let quickHtml = "";
    if (tot > 0) {
      quickHtml += '<button type="button" data-q="' + tot + '">พอดี</button>';
      const notes = [100, 500, 1000];
      for (let i = 0; i < notes.length; i++) {
        if (notes[i] >= tot) quickHtml += '<button type="button" data-q="' + notes[i] + '">' + notes[i] + "</button>";
      }
    }
    byId("quick").innerHTML = quickHtml;

    // ปุ่มชำระเงิน: ถ้ายังกดไม่ได้ ให้บอกเหตุผลใต้ปุ่ม
    let reason = "";
    if (state.cart.length === 0) {
      reason = "เลือกสินค้าอย่างน้อย 1 รายการ";
    } else if (discMsg) {
      reason = discMsg;
    } else if (needTable && tableEmpty) {
      reason = "กรุณาระบุเลขโต๊ะ";
    } else if (isCash && (!receivedTouched || diff < 0)) {
      reason = receivedTouched ? "จำนวนเงินไม่เพียงพอ" : "กรอกจำนวนเงินที่รับมา";
    }
    byId("payBtn").disabled = reason !== "" || state.submitting;
    byId("reason").textContent = reason;
  }

  // ---------- ชำระเงิน ----------

  // กดปุ่ม "ชำระเงิน" -> ส่งออเดอร์ไป server
  // เรียก API: POST /api/orders  (backend: routes/orderRoutes.js -> orderController.createOrder)
  // ส่งแค่ menuId + จำนวน ไม่ส่งราคา — server ดึงราคาจริงจากฐานข้อมูล
  // และใช้สาขา/พนักงานจาก token (กันการแก้ข้อมูลฝั่งหน้าเว็บ)
  async function submit() {
    if (state.submitting) return; // กันกดซ้ำ
    state.submitting = true;
    byId("payBtn").disabled = true;
    byId("payBtn").textContent = "กำลังบันทึก...";

    const items = [];
    for (let i = 0; i < state.cart.length; i++) {
      items.push({ menuId: state.cart[i].menu.menu_id, quantity: state.cart[i].qty });
    }
    const payload = {
      orderType: state.orderType,
      tableNumber: state.orderType === "dine_in" ? byId("table").value.trim() : null,
      paymentMethod: state.payMethod,
      discountAmount: discountVal(),
      amountReceived: receivedVal(),
      items: items
    };

    try {
      const res = await api("/api/orders", { json: payload });
      const warnings = res.data.lowStockWarnings; // รายชื่อวัตถุดิบที่ใกล้หมด (ถ้ามี)
      resetOrder();
      loadMenus(); // โหลดเมนูใหม่ เพื่ออัปเดตจำนวนที่ขายได้หลังตัดสต็อก
      await App.showReceipt(res.data.orderId, { title: "ชำระเงินสำเร็จ" });
      if (warnings && warnings.length > 0) {
        toast("สต็อกใกล้หมด: " + warnings.join(", "), "warn");
      }
    } catch (err) {
      toast(err.message, "error"); // เช่น วัตถุดิบไม่เพียงพอ / เงินไม่พอ
      loadMenus(); // สต็อกอาจเปลี่ยนไปแล้ว โหลดจำนวนที่ขายได้ใหม่
    }

    state.submitting = false;
    byId("payBtn").textContent = "ชำระเงิน";
    renderTotals();
  }

  // ล้างตะกร้าและช่องกรอกทั้งหมด เตรียมรับออเดอร์ถัดไป
  function resetOrder() {
    state.cart = [];
    byId("table").value = "";
    delete byId("table").dataset.touched;
    byId("discount").value = "";
    byId("received").value = "";
    renderCart();
  }

  // ---------- ผูกเหตุการณ์ (ปุ่ม/ช่องกรอกในหน้า) ----------
  // ทำครั้งเดียวตอนเปิดหน้า

  // ทำให้ปุ่มใน container เป็น "ปุ่มที่ถูกเลือก" (active) ทีละปุ่ม
  function setActiveButton(container, activeBtn) {
    for (let i = 0; i < container.children.length; i++) {
      container.children[i].classList.remove("active");
    }
    activeBtn.classList.add("active");
  }

  function bind() {
    // เลือกหมวดหมู่
    byId("cats").addEventListener("click", function (e) {
      const btn = e.target.closest("[data-cat]");
      if (!btn) return;
      state.activeCat = btn.dataset.cat;
      renderCats();
      renderGrid();
    });

    // กดการ์ดเมนู -> ใส่ตะกร้า
    byId("grid").addEventListener("click", function (e) {
      const card = e.target.closest(".card");
      if (card) addItem(Number(card.dataset.id));
    });

    // ปุ่ม + / - ในตะกร้า
    byId("cart").addEventListener("click", function (e) {
      const btn = e.target.closest("[data-act]");
      if (!btn) return;
      const menuId = Number(btn.closest(".line").dataset.id);
      changeQty(menuId, btn.dataset.act === "inc" ? 1 : -1);
    });

    // ปุ่มล้างตะกร้า
    byId("clearCart").addEventListener("click", function () {
      state.cart = [];
      renderCart();
    });

    // เลือก ทานที่ร้าน / กลับบ้าน
    byId("typeSeg").addEventListener("click", function (e) {
      const btn = e.target.closest("[data-type]");
      if (!btn) return;
      state.orderType = btn.dataset.type;
      setActiveButton(byId("typeSeg"), btn);
      renderTotals();
    });

    // เลือกวิธีชำระเงิน
    byId("paySeg").addEventListener("click", function (e) {
      const btn = e.target.closest("[data-pay]");
      if (!btn) return;
      state.payMethod = btn.dataset.pay;
      setActiveButton(byId("paySeg"), btn);
      renderTotals();
    });

    // ช่องเลขโต๊ะ / ส่วนลด / เงินที่รับ: พิมพ์แล้วคำนวณใหม่
    byId("table").addEventListener("input", function () {
      byId("table").dataset.touched = "1";
      renderTotals();
    });
    byId("table").addEventListener("blur", function () {
      byId("table").dataset.touched = "1";
      renderTotals();
    });
    byId("discount").addEventListener("input", renderTotals);
    byId("received").addEventListener("input", renderTotals);

    // ปุ่มลัดรับเงิน (พอดี/100/500/1000)
    byId("quick").addEventListener("click", function (e) {
      const btn = e.target.closest("[data-q]");
      if (!btn) return;
      byId("received").value = btn.dataset.q;
      renderTotals();
    });

    // ปุ่มชำระเงิน
    byId("payBtn").addEventListener("click", submit);
  }

  // ---------- เริ่มทำงาน ----------
  bind();
  Shell.init({
    page: "pos",
    title: "แคชเชียร์",
    search: true,
    // พิมพ์ในช่องค้นหา -> กรองเมนู
    onSearch: function (text) {
      state.search = text;
      renderGrid();
    },
    // เปลี่ยนสาขา -> ตะกร้าเก่าใช้ไม่ได้ (เมนูผูกกับสาขา) จึงล้างแล้วโหลดเมนูใหม่
    onBranch: function () {
      state.cart = [];
      state.activeCat = "all";
      loadMenus().then(renderCart);
    }
  });
  renderCart();
})();
