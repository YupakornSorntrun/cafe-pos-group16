// หน้าสต็อกวัตถุดิบ (เจ้าของ) — FR-04/05: เพิ่ม/แก้ไข/เติมสต็อก/ลบ + แจ้งเตือนใกล้หมด
// หน้าสต็อกวัตถุดิบ (เจ้าของ): ตารางวัตถุดิบ + เพิ่ม/แก้ไข/เติมสต็อก/ลบ
// วัตถุดิบเป็นของกลางทุกสาขา (ตาม schema) ตัวเลือกสาขาจึงไม่มีผลกับตารางนี้
(function () {
  const { api, toast, esc, modal, confirmBox, Shell, UNIT_LABEL } = App;
  const $ = (id) => document.getElementById(id);
  const state = { items: [], filter: "all" };
  const fmt = (n) => Number(n).toLocaleString("th-TH", { maximumFractionDigits: 2 });
  // isLow(): "ใกล้หมด" = คงเหลือไม่เกินเกณฑ์แจ้งเตือน (low_stock_threshold) ที่ตั้งไว้
  const isLow = (i) => Number(i.stock_quantity) <= Number(i.low_stock_threshold);

  async function load() {
    try { state.items = await api("/api/ingredients"); } catch (e) { state.items = []; toast(e.message, "error"); }
    render();
  }

  // render(): วาดตาราง (กรอง "ทั้งหมด"/"ใกล้หมด") และอัปเดตจำนวนบนแท็บ "ใกล้หมด"
  function render() {
    const lowCount = state.items.filter(isLow).length;
    $("filters").children[1].textContent = `ใกล้หมด (${lowCount})`;
    const list = state.items.filter((i) => state.filter === "all" || isLow(i));
    $("rows").innerHTML = list.length
      ? list.map((i) => `<tr data-id="${i.ingredient_id}">
          <td>${esc(i.name)}</td>
          <td class="r num">${fmt(i.stock_quantity)} ${UNIT_LABEL[i.unit]}</td>
          <td class="r num">${fmt(i.low_stock_threshold)} ${UNIT_LABEL[i.unit]}</td>
          <td>${isLow(i) ? '<span class="tag voided">ใกล้หมด</span>' : '<span class="tag paid">ปกติ</span>'}</td>
          <td class="r num">${i.used_in_menus}</td>
          <td><div class="actions"><button class="btn sm" data-act="restock">เติมสต็อก</button><button class="btn sm" data-act="edit">แก้ไข</button><button class="btn sm danger" data-act="del">ลบ</button></div></td>
        </tr>`).join("")
      : '<tr><td colspan="6" class="hint" style="text-align:center;padding:32px">ไม่มีรายการ</td></tr>';
  }

  function setErr(el, errEl, msg) { errEl.textContent = msg || ""; el.classList.toggle("invalid", !!msg); }

  // openForm(): ฟอร์มเพิ่ม (item = null) หรือแก้ไขวัตถุดิบ — ตอนเพิ่มกำหนดจำนวนเริ่มต้นได้ ตอนแก้ไขไม่แตะจำนวน (ใช้ "เติมสต็อก" แทน)
  function openForm(item) {
    const editing = !!item;
    const m = modal({
      title: editing ? "แก้ไขวัตถุดิบ" : "เพิ่มวัตถุดิบ",
      body: `<form id="f" novalidate>
        <div class="form-row"><label for="fName">ชื่อวัตถุดิบ <span class="req">*</span></label>
          <input type="text" id="fName" maxlength="100" value="${esc(item ? item.name : "")}"><div class="err" id="eName"></div></div>
        <div class="form-row"><label for="fUnit">หน่วย <span class="req">*</span></label>
          <select id="fUnit">${Object.entries(UNIT_LABEL).map(([k, v]) => `<option value="${k}" ${item && item.unit === k ? "selected" : ""}>${v} (${k})</option>`).join("")}</select></div>
        ${editing ? "" : `<div class="form-row"><label for="fStock">จำนวนเริ่มต้น</label>
          <input type="number" id="fStock" min="0" step="any" value="0"><div class="err" id="eStock"></div></div>`}
        <div class="form-row"><label for="fLow">แจ้งเตือนเมื่อเหลือต่ำกว่า</label>
          <input type="number" id="fLow" min="0" step="any" value="${item ? Number(item.low_stock_threshold) : 0}"><div class="err" id="eLow"></div></div>
      </form>`,
      footer: '<button class="btn" data-cancel type="button">ยกเลิก</button><button class="btn primary" data-save type="button">บันทึก</button>',
    });
    const q = (id) => m.el.querySelector("#" + id);
    const validate = () => {
      const nameMsg = q("fName").value.trim() ? "" : "กรุณากรอกชื่อวัตถุดิบ";
      const lowMsg = parseFloat(q("fLow").value) >= 0 ? "" : "ต้องไม่ติดลบ";
      setErr(q("fName"), q("eName"), nameMsg); setErr(q("fLow"), q("eLow"), lowMsg);
      let stockMsg = "";
      if (!editing) { stockMsg = parseFloat(q("fStock").value) >= 0 ? "" : "ต้องไม่ติดลบ"; setErr(q("fStock"), q("eStock"), stockMsg); }
      return !nameMsg && !lowMsg && !stockMsg;
    };
    m.el.querySelectorAll("input").forEach((el) => el.addEventListener("input", validate));
    m.el.querySelector("[data-cancel]").onclick = m.close;
    const btn = m.el.querySelector("[data-save]");
    const save = async () => {
      if (!validate()) return;
      btn.disabled = true;
      const body = { name: q("fName").value.trim(), unit: q("fUnit").value, lowStockThreshold: parseFloat(q("fLow").value) };
      try {
        if (editing) await api(`/api/ingredients/${item.ingredient_id}`, { method: "PUT", json: body });
        else await api("/api/ingredients", { json: { ...body, stockQuantity: parseFloat(q("fStock").value) } });
        m.close(); toast(editing ? "แก้ไขวัตถุดิบสำเร็จ" : "เพิ่มวัตถุดิบสำเร็จ"); load();
      } catch (e) { toast(e.message, "error"); btn.disabled = false; }
    };
    btn.addEventListener("click", save);
    q("f").addEventListener("submit", (e) => { e.preventDefault(); save(); });
    q("fName").focus();
  }

  // openRestock(): เติมสต็อก (บวกเพิ่ม) — server บันทึกประวัติลง stock_movements ด้วย
  function openRestock(item) {
    const m = modal({
      title: `เติมสต็อก: ${item.name}`,
      body: `<p class="hint" style="margin-bottom:12px">คงเหลือปัจจุบัน ${fmt(item.stock_quantity)} ${UNIT_LABEL[item.unit]}</p>
        <div class="form-row"><label for="fQty">จำนวนที่เติม (${UNIT_LABEL[item.unit]}) <span class="req">*</span></label>
        <input type="number" id="fQty" min="0" step="any" inputmode="decimal"><div class="err" id="eQty"></div></div>`,
      footer: '<button class="btn" data-cancel type="button">ยกเลิก</button><button class="btn primary" data-save type="button">เติมสต็อก</button>',
    });
    const inp = m.el.querySelector("#fQty"), err = m.el.querySelector("#eQty");
    const valid = () => { const ok = parseFloat(inp.value) > 0; setErr(inp, err, ok ? "" : "จำนวนต้องมากกว่า 0"); return ok; };
    inp.addEventListener("input", valid);
    m.el.querySelector("[data-cancel]").onclick = m.close;
    const btn = m.el.querySelector("[data-save]");
    btn.addEventListener("click", async () => {
      if (!valid()) return;
      btn.disabled = true;
      try { await api(`/api/ingredients/${item.ingredient_id}/restock`, { json: { quantity: parseFloat(inp.value) } }); m.close(); toast("เติมสต็อกสำเร็จ"); load(); }
      catch (e) { toast(e.message, "error"); btn.disabled = false; }
    });
    inp.focus();
  }

  $("addBtn").addEventListener("click", () => openForm(null));
  $("filters").addEventListener("click", (e) => {
    const b = e.target.closest("[data-f]");
    if (!b) return;
    state.filter = b.dataset.f;
    [...$("filters").children].forEach((x) => x.classList.toggle("active", x === b));
    render();
  });
  $("rows").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const item = state.items.find((x) => x.ingredient_id === Number(b.closest("tr").dataset.id));
    if (b.dataset.act === "edit") return openForm(item);
    if (b.dataset.act === "restock") return openRestock(item);
    if (!(await confirmBox({ title: "ลบวัตถุดิบ", message: `ต้องการลบ "${item.name}" ใช่หรือไม่?`, okText: "ลบ", danger: true }))) return;
    try { await api(`/api/ingredients/${item.ingredient_id}`, { method: "DELETE" }); toast("ลบวัตถุดิบสำเร็จ"); load(); }
    catch (err) { toast(err.message, "error"); }
  });

  Shell.init({ page: "stock", title: "สต็อกวัตถุดิบ", onBranch: load });
})();
