// หน้าจัดการเมนู — CRUD + อัปโหลดรูปสินค้า (NFR-05)
(function () {
  const { api, toast, Shell, esc, baht, imgTag, modal, confirmBox } = App;
  const $ = (id) => document.getElementById(id);

  const state = { menus: [], categories: [], activeCat: "all", search: "" };

  async function load() {
    $("rows").innerHTML = '<tr><td colspan="6" class="hint" style="text-align:center;padding:32px">กำลังโหลด...</td></tr>';
    try {
      const [menus, cats] = await Promise.all([api(`/api/menu?branchId=${Shell.branchId}`), api("/api/categories")]);
      state.menus = menus.map((m) => ({ ...m, price: Number(m.price) }));
      state.categories = cats;
    } catch (e) {
      state.menus = [];
      toast(e.message, "error");
    }
    render();
  }

  function render() {
    const usedCats = state.categories.filter((c) => state.menus.some((m) => m.category_id === c.category_id));
    if (state.activeCat !== "all" && !usedCats.some((c) => String(c.category_id) === state.activeCat)) state.activeCat = "all";
    $("cats").innerHTML =
      `<button class="pill ${state.activeCat === "all" ? "active" : ""}" data-cat="all">ทั้งหมด (${state.menus.length})</button>` +
      usedCats.map((c) => `<button class="pill ${String(c.category_id) === state.activeCat ? "active" : ""}" data-cat="${c.category_id}">${esc(c.name)}</button>`).join("");

    const q = state.search.toLowerCase();
    const list = state.menus.filter((m) => (state.activeCat === "all" || String(m.category_id) === state.activeCat) && (!q || m.name.toLowerCase().includes(q)));
    $("rows").innerHTML = list.length
      ? list.map((m) => `<tr data-id="${m.menu_id}">
          <td><div class="thumb-sm">${imgTag(m.image_url, m.name)}</div></td>
          <td>${esc(m.name)}</td>
          <td><span class="tag">${esc(m.category_name)}</span></td>
          <td>${m.ingredient_count ? `<span class="tag paid">${m.ingredient_count} วัตถุดิบ</span>` : '<span class="tag voided" title="ขายแล้วจะไม่ตัดสต็อก">ไม่มีสูตร</span>'}</td>
          <td class="r num">${baht(m.price)}</td>
          <td><div class="actions"><button class="btn sm" data-act="edit">แก้ไข</button><button class="btn sm danger" data-act="del">ลบ</button></div></td>
        </tr>`).join("")
      : '<tr><td colspan="6" class="hint" style="text-align:center;padding:32px">ไม่พบเมนู</td></tr>';
  }

  // ---------- add / edit form ----------
  async function openForm(menu) {
    const editing = !!menu;
    // วัตถุดิบทั้งหมด + สูตรเดิมของเมนู (ถ้าแก้ไข)
    let allIngredients = [];
    let recipe = [];
    try {
      allIngredients = await api("/api/ingredients");
      if (editing) {
        const detail = await api(`/api/menu/${menu.menu_id}?branchId=${Shell.branchId}`);
        recipe = detail.ingredients.map((r) => ({ ingredientId: r.ingredientId, quantityUsed: r.quantityUsed }));
      }
    } catch (e) {
      return toast(e.message, "error");
    }
    let imageUrl = menu ? menu.image_url || "" : "";
    let pendingFile = null;
    let previewUrl = null;

    const m = modal({
      title: editing ? "แก้ไขเมนู" : "เพิ่มเมนูใหม่",
      body: `<form id="menuForm" novalidate>
        <div class="form-row"><label for="fName">ชื่อเมนู <span class="req">*</span></label>
          <input type="text" id="fName" maxlength="100" value="${esc(menu ? menu.name : "")}" placeholder="เช่น ชาไทยเย็น">
          <div class="err" id="eName"></div></div>
        <div class="form-row"><label for="fCat">หมวดหมู่ <span class="req">*</span></label>
          <select id="fCat">${state.categories.map((c) => `<option value="${c.category_id}" ${menu && menu.category_id === c.category_id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div>
        <div class="form-row"><label for="fPrice">ราคา (บาท) <span class="req">*</span></label>
          <input type="number" id="fPrice" min="0.01" step="0.01" inputmode="decimal" value="${menu ? menu.price : ""}" placeholder="0.00">
          <div class="err" id="ePrice"></div></div>
        <div class="form-row"><label>สูตรวัตถุดิบ (ต่อ 1 หน่วยที่ขาย)</label>
          <div id="recipeRows"></div>
          <button type="button" class="btn sm" id="addIng">+ เพิ่มวัตถุดิบ</button>
          <div class="hint" id="recipeHint"></div>
          <div class="err" id="eRecipe"></div></div>
        <div class="form-row"><label>รูปสินค้า</label>
          <div class="upload">
            <div class="preview" id="preview"></div>
            <div class="ctrl">
              <label class="btn sm" for="fFile" style="margin:0;cursor:pointer">เลือกรูป...</label>
              <input type="file" id="fFile" accept="image/jpeg,image/png,image/webp">
              <button type="button" class="link" id="rmImg">ลบรูป</button>
              <div class="hint">JPG / PNG / WEBP ไม่เกิน 2MB</div>
            </div>
          </div>
          <div class="err" id="eFile"></div></div>
      </form>`,
      footer: '<button class="btn" data-cancel type="button">ยกเลิก</button><button class="btn primary" data-save type="button">บันทึก</button>',
      onClose: () => { if (previewUrl) URL.revokeObjectURL(previewUrl); },
    });
    const el = m.el;
    const $$ = (id) => el.querySelector("#" + id);

    const renderPreview = () => {
      $$("preview").innerHTML = pendingFile ? `<img src="${previewUrl}" alt="">` : imgTag(imageUrl, "");
      $$("rmImg").style.display = pendingFile || imageUrl ? "" : "none";
    };
    renderPreview();

    // ---------- recipe rows ----------
    const unitOf = (id) => { const i = allIngredients.find((x) => x.ingredient_id === id); return i ? App.UNIT_LABEL[i.unit] : ""; };
    const renderRecipe = () => {
      $$("recipeRows").innerHTML = recipe.map((r, idx) => `<div class="recipe-row" data-idx="${idx}">
        <select data-k="ing"><option value="">เลือกวัตถุดิบ...</option>${allIngredients.map((i) => `<option value="${i.ingredient_id}" ${i.ingredient_id === r.ingredientId ? "selected" : ""}>${esc(i.name)}</option>`).join("")}</select>
        <input type="number" data-k="qty" min="0" step="any" inputmode="decimal" value="${r.quantityUsed || ""}" placeholder="ปริมาณ">
        <span class="unit">${esc(unitOf(r.ingredientId))}</span>
        <button type="button" class="x" data-k="rm" aria-label="ลบแถว">&times;</button></div>`).join("");
      $$("recipeHint").textContent = recipe.length ? "" : "ยังไม่มีสูตร — เมนูนี้จะขายได้แต่ไม่ตัดสต็อก";
      if (!allIngredients.length) $$("recipeHint").textContent = "ยังไม่มีวัตถุดิบในระบบ — เพิ่มได้ที่หน้า \"สต็อกวัตถุดิบ\"";
    };
    renderRecipe();
    $$("addIng").addEventListener("click", () => { recipe.push({ ingredientId: null, quantityUsed: "" }); renderRecipe(); });
    $$("recipeRows").addEventListener("click", (e) => {
      if (e.target.dataset.k === "rm") { recipe.splice(Number(e.target.closest(".recipe-row").dataset.idx), 1); renderRecipe(); }
    });
    $$("recipeRows").addEventListener("change", (e) => {
      if (e.target.dataset.k === "ing") { recipe[Number(e.target.closest(".recipe-row").dataset.idx)].ingredientId = Number(e.target.value) || null; renderRecipe(); }
    });
    $$("recipeRows").addEventListener("input", (e) => {
      if (e.target.dataset.k === "qty") recipe[Number(e.target.closest(".recipe-row").dataset.idx)].quantityUsed = parseFloat(e.target.value) || "";
    });
    const recipeError = () => {
      const ids = new Set();
      for (const r of recipe) {
        if (!r.ingredientId) return "ต้องเลือกวัตถุดิบให้ครบทุกแถว (หรือลบแถวที่ไม่ใช้)";
        if (!(r.quantityUsed > 0)) return "ปริมาณวัตถุดิบต้องมากกว่า 0";
        if (ids.has(r.ingredientId)) return "เลือกวัตถุดิบซ้ำในสูตรเดียวกันไม่ได้";
        ids.add(r.ingredientId);
      }
      return "";
    };

    $$("fFile").addEventListener("change", (e) => {
      const f = e.target.files[0];
      $$("eFile").textContent = "";
      if (!f) return;
      if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) { $$("eFile").textContent = "รองรับเฉพาะไฟล์ JPG, PNG หรือ WEBP"; e.target.value = ""; return; }
      if (f.size > 2 * 1024 * 1024) { $$("eFile").textContent = "ไฟล์ต้องมีขนาดไม่เกิน 2MB"; e.target.value = ""; return; }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      pendingFile = f;
      previewUrl = URL.createObjectURL(f);
      renderPreview();
    });
    $$("rmImg").addEventListener("click", () => {
      pendingFile = null; imageUrl = ""; $$("fFile").value = "";
      renderPreview();
    });

    const validate = () => {
      const name = $$("fName").value.trim();
      const price = parseFloat($$("fPrice").value);
      const nameMsg = name ? "" : "กรุณากรอกชื่อเมนู";
      const priceMsg = Number.isFinite(price) && price > 0 ? "" : "ราคาต้องมากกว่า 0";
      $$("eName").textContent = nameMsg; $$("fName").classList.toggle("invalid", !!nameMsg);
      $$("ePrice").textContent = priceMsg; $$("fPrice").classList.toggle("invalid", !!priceMsg);
      const recMsg = recipeError();
      $$("eRecipe").textContent = recMsg;
      return !nameMsg && !priceMsg && !recMsg;
    };
    $$("fName").addEventListener("input", validate);
    $$("fPrice").addEventListener("input", validate);
    el.querySelector("[data-cancel]").onclick = m.close;

    const saveBtn = el.querySelector("[data-save]");
    const save = async () => {
      if (!validate()) return;
      saveBtn.disabled = true; saveBtn.textContent = "กำลังบันทึก...";
      try {
        let url = imageUrl;
        if (pendingFile) {
          const up = await api("/api/uploads/menu-image", { method: "POST", headers: { "Content-Type": pendingFile.type }, body: pendingFile });
          url = up.imageUrl;
        }
        const body = {
          branchId: Shell.branchId,
          categoryId: Number($$("fCat").value),
          name: $$("fName").value.trim(),
          price: parseFloat($$("fPrice").value),
          imageUrl: url || null,
          ingredients: recipe.map((r) => ({ ingredientId: r.ingredientId, quantityUsed: r.quantityUsed })),
        };
        if (editing) await api(`/api/menu/${menu.menu_id}`, { method: "PUT", json: body });
        else await api("/api/menu", { json: body });
        m.close();
        toast(editing ? "แก้ไขเมนูสำเร็จ" : "เพิ่มเมนูสำเร็จ");
        load();
      } catch (e) {
        toast(e.message, "error");
        saveBtn.disabled = false; saveBtn.textContent = "บันทึก";
      }
    };
    saveBtn.addEventListener("click", save);
    $$("menuForm").addEventListener("submit", (e) => { e.preventDefault(); save(); });
    $$("fName").focus();
  }

  // ---------- events ----------
  $("addBtn").addEventListener("click", () => openForm(null));
  $("cats").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cat]");
    if (b) { state.activeCat = b.dataset.cat; render(); }
  });
  $("rows").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const menu = state.menus.find((x) => x.menu_id === Number(b.closest("tr").dataset.id));
    if (!menu) return;
    if (b.dataset.act === "edit") return openForm(menu);
    const ok = await confirmBox({ title: "ลบเมนู", message: `ต้องการลบ "${menu.name}" ออกจากสาขานี้ใช่หรือไม่?`, okText: "ลบเมนู", danger: true });
    if (!ok) return;
    try {
      await api(`/api/menu/${menu.menu_id}?branchId=${Shell.branchId}`, { method: "DELETE" });
      toast("ลบเมนูสำเร็จ");
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  });

  Shell.init({
    page: "menu",
    title: "จัดการเมนู",
    search: true,
    onSearch: (t) => { state.search = t; render(); },
    onBranch: load,
  });
})();
