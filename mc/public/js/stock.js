// =====================================================================
// stock.js — หน้าสต็อกวัตถุดิบ (stock.html) เฉพาะเจ้าของ
//
// หน้านี้ทำอะไร: ดูรายการวัตถุดิบ / เพิ่ม / แก้ไข / เติมสต็อก / ลบ / ดูอันที่ใกล้หมด
// วัตถุดิบเป็นของกลางทุกสาขา ตัวเลือกสาขาจึงไม่มีผลกับหน้านี้
//
// API ที่หน้านี้เรียก (backend: routes/ingredientRoutes.js)
//   GET    /api/ingredients               โหลดรายการ        (load)
//   POST   /api/ingredients               เพิ่มวัตถุดิบ       (openForm > save)
//   PUT    /api/ingredients/:id           แก้ไข             (openForm > save)
//   POST   /api/ingredients/:id/restock   เติมสต็อก          (openRestock)
//   DELETE /api/ingredients/:id           ลบ               (ปุ่มลบในตาราง)
// =====================================================================
(function () {
  const api = App.api;
  const toast = App.toast;
  const esc = App.esc;
  const modal = App.modal;
  const confirmBox = App.confirmBox;
  const Shell = App.Shell;
  const UNIT_LABEL = App.UNIT_LABEL;

  // หา element ในหน้าเว็บจาก id (ย่อมาจาก document.getElementById)
  function byId(id) {
    return document.getElementById(id);
  }

  const state = {
    items: [],      // รายการวัตถุดิบ
    filter: "all"   // "all" = ทั้งหมด, "low" = เฉพาะใกล้หมด
  };

  // แสดงตัวเลขแบบมีจุลภาค ทศนิยมไม่เกิน 2 ตำแหน่ง
  function fmt(n) {
    return Number(n).toLocaleString("th-TH", { maximumFractionDigits: 2 });
  }

  // "ใกล้หมด" = คงเหลือไม่เกินเกณฑ์แจ้งเตือน (low_stock_threshold)
  function isLow(item) {
    return Number(item.stock_quantity) <= Number(item.low_stock_threshold);
  }

  // หาวัตถุดิบจากเลข id
  function findItem(id) {
    for (let i = 0; i < state.items.length; i++) {
      if (state.items[i].ingredient_id === id) return state.items[i];
    }
    return null;
  }

  // โหลดรายการวัตถุดิบ
  // เรียก API: GET /api/ingredients
  async function load() {
    try {
      state.items = await api("/api/ingredients");
    } catch (err) {
      state.items = [];
      toast(err.message, "error");
    }
    render();
  }

  // วาดตาราง (กรอง "ทั้งหมด"/"ใกล้หมด") และอัปเดตจำนวนบนแท็บ "ใกล้หมด"
  function render() {
    let lowCount = 0;
    const list = [];
    for (let i = 0; i < state.items.length; i++) {
      const item = state.items[i];
      if (isLow(item)) lowCount++;
      if (state.filter === "all" || isLow(item)) list.push(item);
    }
    byId("filters").children[1].textContent = "ใกล้หมด (" + lowCount + ")";

    if (list.length === 0) {
      byId("rows").innerHTML = '<tr><td colspan="6" class="hint" style="text-align:center;padding:32px">ไม่มีรายการ</td></tr>';
      return;
    }

    let html = "";
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const unit = UNIT_LABEL[item.unit];
      const statusHtml = isLow(item)
        ? '<span class="tag voided">ใกล้หมด</span>'
        : '<span class="tag paid">ปกติ</span>';
      html +=
        '<tr data-id="' + item.ingredient_id + '">' +
        "<td>" + esc(item.name) + "</td>" +
        '<td class="r num">' + fmt(item.stock_quantity) + " " + unit + "</td>" +
        '<td class="r num">' + fmt(item.low_stock_threshold) + " " + unit + "</td>" +
        "<td>" + statusHtml + "</td>" +
        '<td class="r num">' + item.used_in_menus + "</td>" +
        '<td><div class="actions">' +
        '<button class="btn sm" data-act="restock">เติมสต็อก</button>' +
        '<button class="btn sm" data-act="edit">แก้ไข</button>' +
        '<button class="btn sm danger" data-act="del">ลบ</button>' +
        "</div></td></tr>";
    }
    byId("rows").innerHTML = html;
  }

  // แสดง/ล้างข้อความ error ใต้ช่อง และใส่/เอากรอบแดง
  function setErr(inputEl, errEl, msg) {
    errEl.textContent = msg || "";
    if (msg) inputEl.classList.add("invalid");
    else inputEl.classList.remove("invalid");
  }

  // ---------- ฟอร์มเพิ่ม/แก้ไข ----------

  // เปิดฟอร์มเพิ่ม (item = null) หรือแก้ไข (ส่งวัตถุดิบเดิมมา)
  // ตอนเพิ่มกำหนดจำนวนเริ่มต้นได้ ตอนแก้ไขไม่แตะจำนวน (ใช้ "เติมสต็อก" แทน)
  function openForm(item) {
    const editing = item !== null;

    // ตัวเลือกหน่วย (กรัม/มล./ชิ้น)
    let unitOptions = "";
    for (const key in UNIT_LABEL) {
      const selected = item && item.unit === key ? "selected" : "";
      unitOptions += '<option value="' + key + '" ' + selected + ">" + UNIT_LABEL[key] + " (" + key + ")</option>";
    }

    // ช่อง "จำนวนเริ่มต้น" มีเฉพาะตอนเพิ่ม
    let stockField = "";
    if (!editing) {
      stockField =
        '<div class="form-row"><label for="fStock">จำนวนเริ่มต้น</label>' +
        '<input type="number" id="fStock" min="0" step="any" value="0"><div class="err" id="eStock"></div></div>';
    }

    const nameValue = item ? esc(item.name) : "";
    const lowValue = item ? Number(item.low_stock_threshold) : 0;

    const m = modal({
      title: editing ? "แก้ไขวัตถุดิบ" : "เพิ่มวัตถุดิบ",
      body:
        '<form id="f" novalidate>' +
        '<div class="form-row"><label for="fName">ชื่อวัตถุดิบ <span class="req">*</span></label>' +
        '<input type="text" id="fName" maxlength="100" value="' + nameValue + '"><div class="err" id="eName"></div></div>' +
        '<div class="form-row"><label for="fUnit">หน่วย <span class="req">*</span></label>' +
        '<select id="fUnit">' + unitOptions + "</select></div>" +
        stockField +
        '<div class="form-row"><label for="fLow">แจ้งเตือนเมื่อเหลือต่ำกว่า</label>' +
        '<input type="number" id="fLow" min="0" step="any" value="' + lowValue + '"><div class="err" id="eLow"></div></div>' +
        "</form>",
      footer:
        '<button class="btn" data-cancel type="button">ยกเลิก</button>' +
        '<button class="btn primary" data-save type="button">บันทึก</button>'
    });

    // ค้นหาองค์ประกอบในฟอร์มจาก id
    function q(id) {
      return m.el.querySelector("#" + id);
    }

    // ตรวจข้อมูล คืน true เมื่อผ่านทั้งหมด
    function validate() {
      const nameMsg = q("fName").value.trim() ? "" : "กรุณากรอกชื่อวัตถุดิบ";
      const lowMsg = parseFloat(q("fLow").value) >= 0 ? "" : "ต้องไม่ติดลบ";
      setErr(q("fName"), q("eName"), nameMsg);
      setErr(q("fLow"), q("eLow"), lowMsg);

      let stockMsg = "";
      if (!editing) {
        stockMsg = parseFloat(q("fStock").value) >= 0 ? "" : "ต้องไม่ติดลบ";
        setErr(q("fStock"), q("eStock"), stockMsg);
      }
      return !nameMsg && !lowMsg && !stockMsg;
    }

    // ตรวจทันทีที่พิมพ์
    const inputs = m.el.querySelectorAll("input");
    for (let i = 0; i < inputs.length; i++) {
      inputs[i].addEventListener("input", validate);
    }
    m.el.querySelector("[data-cancel]").onclick = m.close;

    const saveBtn = m.el.querySelector("[data-save]");

    // บันทึก: แก้ไข -> PUT, เพิ่ม -> POST
    async function save() {
      if (!validate()) return;
      saveBtn.disabled = true;

      const body = {
        name: q("fName").value.trim(),
        unit: q("fUnit").value,
        lowStockThreshold: parseFloat(q("fLow").value)
      };

      try {
        if (editing) {
          // เรียก API: PUT /api/ingredients/:id
          await api("/api/ingredients/" + item.ingredient_id, { method: "PUT", json: body });
        } else {
          // เรียก API: POST /api/ingredients  (เพิ่มจำนวนเริ่มต้นเข้าไปด้วย)
          body.stockQuantity = parseFloat(q("fStock").value);
          await api("/api/ingredients", { json: body });
        }
        m.close();
        toast(editing ? "แก้ไขวัตถุดิบสำเร็จ" : "เพิ่มวัตถุดิบสำเร็จ");
        load();
      } catch (err) {
        toast(err.message, "error");
        saveBtn.disabled = false;
      }
    }

    saveBtn.addEventListener("click", save);
    q("f").addEventListener("submit", function (e) {
      e.preventDefault();
      save();
    });
    q("fName").focus();
  }

  // ---------- เติมสต็อก ----------

  // เติมสต็อก (บวกเพิ่ม) — server บันทึกประวัติลง stock_movements ด้วย
  function openRestock(item) {
    const unit = UNIT_LABEL[item.unit];
    const m = modal({
      title: "เติมสต็อก: " + item.name,
      body:
        '<p class="hint" style="margin-bottom:12px">คงเหลือปัจจุบัน ' + fmt(item.stock_quantity) + " " + unit + "</p>" +
        '<div class="form-row"><label for="fQty">จำนวนที่เติม (' + unit + ') <span class="req">*</span></label>' +
        '<input type="number" id="fQty" min="0" step="any" inputmode="decimal"><div class="err" id="eQty"></div></div>',
      footer:
        '<button class="btn" data-cancel type="button">ยกเลิก</button>' +
        '<button class="btn primary" data-save type="button">เติมสต็อก</button>'
    });

    const input = m.el.querySelector("#fQty");
    const errBox = m.el.querySelector("#eQty");

    // จำนวนต้องมากกว่า 0
    function isValid() {
      const ok = parseFloat(input.value) > 0;
      setErr(input, errBox, ok ? "" : "จำนวนต้องมากกว่า 0");
      return ok;
    }
    input.addEventListener("input", isValid);
    m.el.querySelector("[data-cancel]").onclick = m.close;

    const saveBtn = m.el.querySelector("[data-save]");
    saveBtn.addEventListener("click", async function () {
      if (!isValid()) return;
      saveBtn.disabled = true;
      try {
        // เรียก API: POST /api/ingredients/:id/restock
        await api("/api/ingredients/" + item.ingredient_id + "/restock", {
          json: { quantity: parseFloat(input.value) }
        });
        m.close();
        toast("เติมสต็อกสำเร็จ");
        load();
      } catch (err) {
        toast(err.message, "error");
        saveBtn.disabled = false;
      }
    });
    input.focus();
  }

  // ---------- ผูกเหตุการณ์ ----------

  // ปุ่ม "เพิ่มวัตถุดิบ"
  byId("addBtn").addEventListener("click", function () {
    openForm(null);
  });

  // แท็บ ทั้งหมด / ใกล้หมด
  byId("filters").addEventListener("click", function (e) {
    const btn = e.target.closest("[data-f]");
    if (!btn) return;
    state.filter = btn.dataset.f;
    for (let i = 0; i < byId("filters").children.length; i++) {
      byId("filters").children[i].classList.remove("active");
    }
    btn.classList.add("active");
    render();
  });

  // ปุ่มในแต่ละแถว: เติมสต็อก / แก้ไข / ลบ
  byId("rows").addEventListener("click", async function (e) {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const item = findItem(Number(btn.closest("tr").dataset.id));
    if (!item) return;

    if (btn.dataset.act === "edit") {
      openForm(item);
      return;
    }
    if (btn.dataset.act === "restock") {
      openRestock(item);
      return;
    }

    // ปุ่มลบ: ถามยืนยันก่อน
    const ok = await confirmBox({
      title: "ลบวัตถุดิบ",
      message: 'ต้องการลบ "' + item.name + '" ใช่หรือไม่?',
      okText: "ลบ",
      danger: true
    });
    if (!ok) return;

    try {
      // เรียก API: DELETE /api/ingredients/:id  (ลบไม่ได้ถ้าถูกใช้ในสูตรหรือมีประวัติสต็อก)
      await api("/api/ingredients/" + item.ingredient_id, { method: "DELETE" });
      toast("ลบวัตถุดิบสำเร็จ");
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  });

  // เริ่มทำงาน (onBranch ถูกเรียกครั้งแรกหลังโหลดสาขาเสร็จ จึงเป็นจุดที่เรียก load)
  Shell.init({ page: "stock", title: "สต็อกวัตถุดิบ", onBranch: load });
})();
