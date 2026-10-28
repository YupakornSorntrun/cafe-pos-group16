// =====================================================================
// menu.js — หน้าจัดการเมนู (menu.html) เฉพาะเจ้าของ
//
// หน้านี้ทำอะไร: ดูตารางเมนูของสาขาที่เลือก / เพิ่ม / แก้ไข (ชื่อ หมวด ราคา สูตรวัตถุดิบ รูป) / ลบ
//
// API ที่หน้านี้เรียก
//   GET    /api/menu?branchId=         โหลดเมนูของสาขา            (load)
//   GET    /api/categories             โหลดหมวดหมู่               (load)
//   GET    /api/ingredients            โหลดวัตถุดิบไว้ทำสูตร       (openForm)
//   GET    /api/menu/:id?branchId=     โหลดสูตรเดิมตอนแก้ไข        (openForm)
//   POST   /api/uploads/menu-image     อัปโหลดรูปเมนู             (openForm > save)
//   POST   /api/menu                   เพิ่มเมนู                  (openForm > save)
//   PUT    /api/menu/:id               แก้ไขเมนู                  (openForm > save)
//   DELETE /api/menu/:id?branchId=     ลบเมนู                    (ปุ่มลบในตาราง)
// =====================================================================
(function () {
  const api = App.api;
  const toast = App.toast;
  const Shell = App.Shell;
  const esc = App.esc;
  const baht = App.baht;
  const imgTag = App.imgTag;
  const modal = App.modal;
  const confirmBox = App.confirmBox;

  // หา element ในหน้าเว็บจาก id (ย่อมาจาก document.getElementById)
  function byId(id) {
    return document.getElementById(id);
  }

  const state = {
    menus: [],        // เมนูของสาขาที่เลือก
    categories: [],   // หมวดหมู่ทั้งหมด
    activeCat: "all", // หมวดที่เลือกอยู่
    search: ""        // คำค้นหา
  };

  // หาเมนูจากเลข menu_id
  function findMenu(menuId) {
    for (let i = 0; i < state.menus.length; i++) {
      if (state.menus[i].menu_id === menuId) return state.menus[i];
    }
    return null;
  }

  // โหลดเมนูของสาขาและรายการหมวดหมู่ แล้ววาดตาราง
  // เรียก API: GET /api/menu?branchId=...   (backend: menuController.getMenus)
  //          GET /api/categories            (backend: routes/lookupRoutes.js)
  async function load() {
    byId("rows").innerHTML = '<tr><td colspan="6" class="hint" style="text-align:center;padding:32px">กำลังโหลด...</td></tr>';
    try {
      const menus = await api("/api/menu?branchId=" + Shell.branchId);
      const cats = await api("/api/categories");
      state.menus = [];
      for (let i = 0; i < menus.length; i++) {
        menus[i].price = Number(menus[i].price); // DECIMAL มาเป็นข้อความ จึงแปลงเป็นตัวเลข
        state.menus.push(menus[i]);
      }
      state.categories = cats;
    } catch (err) {
      state.menus = [];
      toast(err.message, "error");
    }
    render();
  }

  // วาดปุ่มหมวดหมู่และตารางเมนู (กรองตามหมวด/คำค้น)
  // ป้าย "ไม่มีสูตร" เตือนว่าเมนูนั้นขายแล้วจะไม่ตัดสต็อก
  function render() {
    // หมวดที่มีเมนูอยู่จริง
    const usedCats = [];
    for (let i = 0; i < state.categories.length; i++) {
      const cat = state.categories[i];
      for (let j = 0; j < state.menus.length; j++) {
        if (state.menus[j].category_id === cat.category_id) {
          usedCats.push(cat);
          break;
        }
      }
    }

    // ถ้าหมวดที่เลือกอยู่หายไป ให้กลับไป "ทั้งหมด"
    let activeFound = false;
    for (let i = 0; i < usedCats.length; i++) {
      if (String(usedCats[i].category_id) === state.activeCat) activeFound = true;
    }
    if (state.activeCat !== "all" && !activeFound) state.activeCat = "all";

    let catHtml =
      '<button class="pill ' + (state.activeCat === "all" ? "active" : "") + '" data-cat="all">ทั้งหมด (' + state.menus.length + ")</button>";
    for (let i = 0; i < usedCats.length; i++) {
      const c = usedCats[i];
      const active = String(c.category_id) === state.activeCat ? "active" : "";
      catHtml += '<button class="pill ' + active + '" data-cat="' + c.category_id + '">' + esc(c.name) + "</button>";
    }
    byId("cats").innerHTML = catHtml;

    // กรองเมนู
    const keyword = state.search.toLowerCase();
    const list = [];
    for (let i = 0; i < state.menus.length; i++) {
      const m = state.menus[i];
      const catOk = state.activeCat === "all" || String(m.category_id) === state.activeCat;
      const nameOk = keyword === "" || m.name.toLowerCase().indexOf(keyword) !== -1;
      if (catOk && nameOk) list.push(m);
    }

    if (list.length === 0) {
      byId("rows").innerHTML = '<tr><td colspan="6" class="hint" style="text-align:center;padding:32px">ไม่พบเมนู</td></tr>';
      return;
    }

    let html = "";
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      const recipeHtml = m.ingredient_count
        ? '<span class="tag paid">' + m.ingredient_count + " วัตถุดิบ</span>"
        : '<span class="tag voided" title="ขายแล้วจะไม่ตัดสต็อก">ไม่มีสูตร</span>';
      html +=
        '<tr data-id="' + m.menu_id + '">' +
        '<td><div class="thumb-sm">' + imgTag(m.image_url, m.name) + "</div></td>" +
        "<td>" + esc(m.name) + "</td>" +
        '<td><span class="tag">' + esc(m.category_name) + "</span></td>" +
        "<td>" + recipeHtml + "</td>" +
        '<td class="r num">' + baht(m.price) + "</td>" +
        '<td><div class="actions"><button class="btn sm" data-act="edit">แก้ไข</button><button class="btn sm danger" data-act="del">ลบ</button></div></td>' +
        "</tr>";
    }
    byId("rows").innerHTML = html;
  }

  // ---------- ฟอร์มเพิ่ม / แก้ไข ----------

  // เปิดฟอร์มเพิ่มเมนู (menu = null) หรือแก้ไข (ส่งเมนูเดิมมา)
  // ตัวแปรที่ต้องจำ:
  //   recipe      = สูตรที่กำลังแก้ [{ ingredientId, quantityUsed }, ...]
  //   imageUrl    = ลิงก์รูปเดิมของเมนู
  //   pendingFile = ไฟล์รูปใหม่ที่เลือกแล้วแต่ยังไม่อัปโหลด
  async function openForm(menu) {
    const editing = menu !== null;

    // โหลดวัตถุดิบทั้งหมด (ไว้ทำ dropdown) และสูตรเดิมของเมนู (ถ้าแก้ไข)
    let allIngredients = [];
    let recipe = [];
    try {
      // เรียก API: GET /api/ingredients
      allIngredients = await api("/api/ingredients");
      if (editing) {
        // เรียก API: GET /api/menu/:id?branchId=  (backend: menuController.getMenuById — ได้สูตรกลับมาด้วย)
        const detail = await api("/api/menu/" + menu.menu_id + "?branchId=" + Shell.branchId);
        for (let i = 0; i < detail.ingredients.length; i++) {
          recipe.push({
            ingredientId: detail.ingredients[i].ingredientId,
            quantityUsed: detail.ingredients[i].quantityUsed
          });
        }
      }
    } catch (err) {
      toast(err.message, "error");
      return;
    }

    let imageUrl = menu ? menu.image_url || "" : "";
    let pendingFile = null;
    let previewUrl = null;

    // ตัวเลือกหมวดหมู่
    let catOptions = "";
    for (let i = 0; i < state.categories.length; i++) {
      const c = state.categories[i];
      const selected = menu && menu.category_id === c.category_id ? "selected" : "";
      catOptions += '<option value="' + c.category_id + '" ' + selected + ">" + esc(c.name) + "</option>";
    }

    const m = modal({
      title: editing ? "แก้ไขเมนู" : "เพิ่มเมนูใหม่",
      body:
        '<form id="menuForm" novalidate>' +
        '<div class="form-row"><label for="fName">ชื่อเมนู <span class="req">*</span></label>' +
        '<input type="text" id="fName" maxlength="100" value="' + esc(menu ? menu.name : "") + '" placeholder="เช่น ชาไทยเย็น">' +
        '<div class="err" id="eName"></div></div>' +
        '<div class="form-row"><label for="fCat">หมวดหมู่ <span class="req">*</span></label>' +
        '<select id="fCat">' + catOptions + "</select></div>" +
        '<div class="form-row"><label for="fPrice">ราคา (บาท) <span class="req">*</span></label>' +
        '<input type="number" id="fPrice" min="0.01" step="0.01" inputmode="decimal" value="' + (menu ? menu.price : "") + '" placeholder="0.00">' +
        '<div class="err" id="ePrice"></div></div>' +
        '<div class="form-row"><label>สูตรวัตถุดิบ (ต่อ 1 หน่วยที่ขาย)</label>' +
        '<div id="recipeRows"></div>' +
        '<button type="button" class="btn sm" id="addIng">+ เพิ่มวัตถุดิบ</button>' +
        '<div class="hint" id="recipeHint"></div>' +
        '<div class="err" id="eRecipe"></div></div>' +
        '<div class="form-row"><label>รูปสินค้า</label>' +
        '<div class="upload">' +
        '<div class="preview" id="preview"></div>' +
        '<div class="ctrl">' +
        '<label class="btn sm" for="fFile" style="margin:0;cursor:pointer">เลือกรูป...</label>' +
        '<input type="file" id="fFile" accept="image/jpeg,image/png,image/webp">' +
        '<button type="button" class="link" id="rmImg">ลบรูป</button>' +
        '<div class="hint">JPG / PNG / WEBP ไม่เกิน 2MB</div>' +
        "</div></div>" +
        '<div class="err" id="eFile"></div></div>' +
        "</form>",
      footer:
        '<button class="btn" data-cancel type="button">ยกเลิก</button>' +
        '<button class="btn primary" data-save type="button">บันทึก</button>',
      onClose: function () {
        if (previewUrl) URL.revokeObjectURL(previewUrl); // คืนหน่วยความจำของรูปตัวอย่าง
      }
    });
    const el = m.el;

    // ค้นหาองค์ประกอบในฟอร์มจาก id
    function findInForm(id) {
      return el.querySelector("#" + id);
    }

    // ---------- รูปภาพ ----------

    // แสดงตัวอย่างรูป (รูปใหม่ที่เลือก > รูปเดิม > ไอคอนว่าง)
    function renderPreview() {
      if (pendingFile) {
        findInForm("preview").innerHTML = '<img src="' + previewUrl + '" alt="">';
      } else {
        findInForm("preview").innerHTML = imgTag(imageUrl, "");
      }
      findInForm("rmImg").style.display = pendingFile || imageUrl ? "" : "none";
    }
    renderPreview();

    // เลือกไฟล์รูป: ตรวจชนิดและขนาดก่อน (server ตรวจซ้ำอีกชั้น)
    findInForm("fFile").addEventListener("change", function (e) {
      const file = e.target.files[0];
      findInForm("eFile").textContent = "";
      if (!file) return;

      const okTypes = ["image/jpeg", "image/png", "image/webp"];
      if (okTypes.indexOf(file.type) === -1) {
        findInForm("eFile").textContent = "รองรับเฉพาะไฟล์ JPG, PNG หรือ WEBP";
        e.target.value = "";
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        findInForm("eFile").textContent = "ไฟล์ต้องมีขนาดไม่เกิน 2MB";
        e.target.value = "";
        return;
      }

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      pendingFile = file;
      previewUrl = URL.createObjectURL(file);
      renderPreview();
    });

    // ปุ่มลบรูป
    findInForm("rmImg").addEventListener("click", function () {
      pendingFile = null;
      imageUrl = "";
      findInForm("fFile").value = "";
      renderPreview();
    });

    // ---------- สูตรวัตถุดิบ ----------

    // หน่วยของวัตถุดิบ (กรัม/มล./ชิ้น) จากเลข id
    function unitOf(ingredientId) {
      for (let i = 0; i < allIngredients.length; i++) {
        if (allIngredients[i].ingredient_id === ingredientId) {
          return App.UNIT_LABEL[allIngredients[i].unit];
        }
      }
      return "";
    }

    // วาดแถวสูตรวัตถุดิบ (เลือกวัตถุดิบ + ปริมาณ + หน่วย) จากอาร์เรย์ recipe
    function renderRecipe() {
      let html = "";
      for (let idx = 0; idx < recipe.length; idx++) {
        const r = recipe[idx];

        let options = '<option value="">เลือกวัตถุดิบ...</option>';
        for (let i = 0; i < allIngredients.length; i++) {
          const ing = allIngredients[i];
          const selected = ing.ingredient_id === r.ingredientId ? "selected" : "";
          options += '<option value="' + ing.ingredient_id + '" ' + selected + ">" + esc(ing.name) + "</option>";
        }

        html +=
          '<div class="recipe-row" data-idx="' + idx + '">' +
          '<select data-k="ing">' + options + "</select>" +
          '<input type="number" data-k="qty" min="0" step="any" inputmode="decimal" value="' + (r.quantityUsed || "") + '" placeholder="ปริมาณ">' +
          '<span class="unit">' + esc(unitOf(r.ingredientId)) + "</span>" +
          '<button type="button" class="x" data-k="rm" aria-label="ลบแถว">&times;</button></div>';
      }
      findInForm("recipeRows").innerHTML = html;

      if (recipe.length === 0) {
        findInForm("recipeHint").textContent = "ยังไม่มีสูตร — เมนูนี้จะขายได้แต่ไม่ตัดสต็อก";
      } else {
        findInForm("recipeHint").textContent = "";
      }
      if (allIngredients.length === 0) {
        findInForm("recipeHint").textContent = 'ยังไม่มีวัตถุดิบในระบบ — เพิ่มได้ที่หน้า "สต็อกวัตถุดิบ"';
      }
    }
    renderRecipe();

    // หาลำดับแถวสูตรจากปุ่ม/ช่องที่ถูกกด
    function rowIndex(target) {
      return Number(target.closest(".recipe-row").dataset.idx);
    }

    // ปุ่ม "+ เพิ่มวัตถุดิบ"
    findInForm("addIng").addEventListener("click", function () {
      recipe.push({ ingredientId: null, quantityUsed: "" });
      renderRecipe();
    });
    // ปุ่ม x ลบแถว
    findInForm("recipeRows").addEventListener("click", function (e) {
      if (e.target.dataset.k === "rm") {
        recipe.splice(rowIndex(e.target), 1);
        renderRecipe();
      }
    });
    // เลือกวัตถุดิบใน dropdown
    findInForm("recipeRows").addEventListener("change", function (e) {
      if (e.target.dataset.k === "ing") {
        recipe[rowIndex(e.target)].ingredientId = Number(e.target.value) || null;
        renderRecipe();
      }
    });
    // พิมพ์ปริมาณ
    findInForm("recipeRows").addEventListener("input", function (e) {
      if (e.target.dataset.k === "qty") {
        recipe[rowIndex(e.target)].quantityUsed = parseFloat(e.target.value) || "";
      }
    });

    // ตรวจสูตร: เลือกวัตถุดิบครบทุกแถว, ปริมาณ > 0, ห้ามเลือกซ้ำ
    // คืนข้อความ error หรือ "" ถ้าผ่าน
    function recipeError() {
      const usedIds = {};
      for (let i = 0; i < recipe.length; i++) {
        const r = recipe[i];
        if (!r.ingredientId) return "ต้องเลือกวัตถุดิบให้ครบทุกแถว (หรือลบแถวที่ไม่ใช้)";
        if (!(r.quantityUsed > 0)) return "ปริมาณวัตถุดิบต้องมากกว่า 0";
        if (usedIds[r.ingredientId]) return "เลือกวัตถุดิบซ้ำในสูตรเดียวกันไม่ได้";
        usedIds[r.ingredientId] = true;
      }
      return "";
    }

    // ---------- ตรวจข้อมูลและบันทึก ----------

    // ตรวจชื่อ ราคา สูตร แล้วแสดง error ใต้ช่อง คืน true เมื่อผ่านทั้งหมด
    function validate() {
      const name = findInForm("fName").value.trim();
      const price = parseFloat(findInForm("fPrice").value);
      const nameMsg = name ? "" : "กรุณากรอกชื่อเมนู";
      const priceMsg = isFinite(price) && price > 0 ? "" : "ราคาต้องมากกว่า 0";
      const recipeMsg = recipeError();

      findInForm("eName").textContent = nameMsg;
      findInForm("ePrice").textContent = priceMsg;
      findInForm("eRecipe").textContent = recipeMsg;
      if (nameMsg) findInForm("fName").classList.add("invalid");
      else findInForm("fName").classList.remove("invalid");
      if (priceMsg) findInForm("fPrice").classList.add("invalid");
      else findInForm("fPrice").classList.remove("invalid");

      return !nameMsg && !priceMsg && !recipeMsg;
    }
    findInForm("fName").addEventListener("input", validate);
    findInForm("fPrice").addEventListener("input", validate);
    el.querySelector("[data-cancel]").onclick = m.close;

    const saveBtn = el.querySelector("[data-save]");

    // บันทึก: ตรวจข้อมูล -> (ถ้ามีรูปใหม่) อัปโหลดรูปก่อนเพื่อได้ลิงก์ -> ส่งข้อมูลเมนู POST (เพิ่ม) หรือ PUT (แก้)
    // ลำดับนี้ทำให้เมนูอ้างลิงก์รูปที่อัปโหลดสำเร็จแล้วเท่านั้น
    async function save() {
      if (!validate()) return;
      saveBtn.disabled = true;
      saveBtn.textContent = "กำลังบันทึก...";

      try {
        let url = imageUrl;
        if (pendingFile) {
          // เรียก API: POST /api/uploads/menu-image  (ส่งไฟล์ตรง ๆ เป็น raw body; backend: routes/uploadRoutes.js)
          const up = await api("/api/uploads/menu-image", {
            method: "POST",
            headers: { "Content-Type": pendingFile.type },
            body: pendingFile
          });
          url = up.imageUrl;
        }

        const ingredients = [];
        for (let i = 0; i < recipe.length; i++) {
          ingredients.push({
            ingredientId: recipe[i].ingredientId,
            quantityUsed: recipe[i].quantityUsed
          });
        }
        const body = {
          branchId: Shell.branchId,
          categoryId: Number(findInForm("fCat").value),
          name: findInForm("fName").value.trim(),
          price: parseFloat(findInForm("fPrice").value),
          imageUrl: url || null,
          ingredients: ingredients
        };

        if (editing) {
          // เรียก API: PUT /api/menu/:id  (backend: menuController.updateMenu)
          await api("/api/menu/" + menu.menu_id, { method: "PUT", json: body });
        } else {
          // เรียก API: POST /api/menu  (backend: menuController.createMenu)
          await api("/api/menu", { json: body });
        }
        m.close();
        toast(editing ? "แก้ไขเมนูสำเร็จ" : "เพิ่มเมนูสำเร็จ");
        load();
      } catch (err) {
        toast(err.message, "error");
        saveBtn.disabled = false;
        saveBtn.textContent = "บันทึก";
      }
    }

    saveBtn.addEventListener("click", save);
    findInForm("menuForm").addEventListener("submit", function (e) {
      e.preventDefault();
      save();
    });
    findInForm("fName").focus();
  }

  // ---------- ผูกเหตุการณ์ ----------

  // ปุ่ม "เพิ่มเมนู"
  byId("addBtn").addEventListener("click", function () {
    openForm(null);
  });

  // เลือกหมวดหมู่
  byId("cats").addEventListener("click", function (e) {
    const btn = e.target.closest("[data-cat]");
    if (btn) {
      state.activeCat = btn.dataset.cat;
      render();
    }
  });

  // ปุ่มในตาราง: แก้ไข / ลบ
  byId("rows").addEventListener("click", async function (e) {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const menu = findMenu(Number(btn.closest("tr").dataset.id));
    if (!menu) return;

    if (btn.dataset.act === "edit") {
      openForm(menu);
      return;
    }

    // ปุ่มลบ: ถามยืนยันก่อน
    const ok = await confirmBox({
      title: "ลบเมนู",
      message: 'ต้องการลบ "' + menu.name + '" ออกจากสาขานี้ใช่หรือไม่?',
      okText: "ลบเมนู",
      danger: true
    });
    if (!ok) return;

    try {
      // เรียก API: DELETE /api/menu/:id?branchId=  (backend: menuController.deleteMenu)
      await api("/api/menu/" + menu.menu_id + "?branchId=" + Shell.branchId, { method: "DELETE" });
      toast("ลบเมนูสำเร็จ");
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  });

  // ---------- เริ่มทำงาน ----------
  Shell.init({
    page: "menu",
    title: "จัดการเมนู",
    search: true,
    onSearch: function (text) {
      state.search = text;
      render();
    },
    onBranch: load
  });
})();
