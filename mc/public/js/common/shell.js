// =====================================================================
// common/shell.js — โครงของทุกหน้า (Shell)
// วาดแถบเมนูซ้าย/แถบบน ตรวจสิทธิ์ตามบทบาท และจัดการตัวเลือกสาขา
// ต้องโหลดหลัง format.js, storage.js, api.js, icons.js, ui.js
// =====================================================================
(function () {
  const esc = App.esc;
  const store = App.store;
  const api = App.api;
  const toast = App.toast;
  const ICONS = App.ICONS;

  // รายการเมนูซ้าย (roles = บทบาทที่เข้าหน้านั้นได้)
  const NAV = [
    { id: "pos", href: "/index.html", label: "แคชเชียร์ (POS)", icon: "pos", roles: ["cashier"] },
    { id: "orders", href: "/orders.html", label: "ประวัติออเดอร์", icon: "orders", roles: ["cashier"] },
    { id: "menu", href: "/menu.html", label: "จัดการเมนู", icon: "menu", roles: ["owner"] },
    { id: "stock", href: "/stock.html", label: "สต็อกวัตถุดิบ", icon: "stock", roles: ["owner"] },
    { id: "report", href: "/report.html", label: "แดชบอร์ดยอดขาย", icon: "report", roles: ["owner"] }
  ];
  const HOME = { cashier: "/index.html", owner: "/report.html" };
  const ROLE_LABEL = { cashier: "แคชเชียร์", owner: "เจ้าของร้าน" };

  // ---------- Shell: โครงของทุกหน้า ----------
  // ทุกหน้าเรียก Shell.init({ page, title, search, allBranches, onBranch, onSearch }) เป็นอย่างแรก
  // มันจะ:
  //   1) ตรวจว่าล็อกอินอยู่ไหม (ไม่อยู่ -> ไปหน้า login)
  //   2) ตรวจว่าบทบาทนี้เข้าหน้านี้ได้ไหม
  //   3) วาดแถบเมนูซ้าย (เฉพาะเมนูที่บทบาทนี้ใช้ได้)
  //   4) วาดแถบบน (ชื่อหน้า ช่องค้นหา ชื่อผู้ใช้ สาขา)
  //   5) โหลดรายชื่อสาขา และเรียก onBranch(สาขา) ทุกครั้งที่เปลี่ยนสาขา
  const Shell = {
    branches: [],
    branchId: null,
    user: null,

    init: async function (options) {
      const page = options.page;
      const title = options.title;
      const search = options.search || false;
      const allBranches = options.allBranches || false;
      const onBranch = options.onBranch;
      const onSearch = options.onSearch;

      document.title = title + " · Baristech Cafe";

      // ต้องล็อกอินก่อน
      try {
        Shell.user = await api("/api/auth/me");
      } catch (err) {
        return; // api() พาไปหน้า login ให้แล้ว
      }
      const user = Shell.user;

      // ต้องมีสิทธิ์เข้าหน้านี้
      let thisPage = null;
      for (let i = 0; i < NAV.length; i++) {
        if (NAV[i].id === page) thisPage = NAV[i];
      }
      if (!thisPage || thisPage.roles.indexOf(user.role) === -1) {
        location.replace(HOME[user.role] || "/login.html");
        return;
      }

      // แถบเมนูซ้าย
      let railHtml = '<div class="logo">' + ICONS.logo + "</div>";
      for (let i = 0; i < NAV.length; i++) {
        const n = NAV[i];
        if (n.roles.indexOf(user.role) === -1) continue; // บทบาทนี้ไม่เห็นเมนูนี้
        const active = n.id === page ? "active" : "";
        railHtml +=
          '<a class="nav ' + active + '" href="' + n.href + '" data-label="' + esc(n.label) +
          '" aria-label="' + esc(n.label) + '">' + ICONS[n.icon] + "</a>";
      }
      railHtml +=
        '<div class="spacer"></div>' +
        '<button class="nav-btn" id="logoutBtn" data-label="ออกจากระบบ" aria-label="ออกจากระบบ">' + ICONS.logout + "</button>";
      document.getElementById("rail").innerHTML = railHtml;

      // ปุ่มออกจากระบบ = ทิ้ง token ฝั่งเบราว์เซอร์ แล้วไปหน้า login
      document.getElementById("logoutBtn").addEventListener("click", function () {
        store.remove("cafe.token");
        location.href = "/login.html";
      });

      // แถบบน
      let searchHtml = "";
      if (search) {
        searchHtml =
          '<div class="search"><span class="icon">' + ICONS.search + "</span>" +
          '<input type="text" id="searchBox" placeholder="ค้นหาเมนู..." autocomplete="off"></div>';
      }
      const roleText = ROLE_LABEL[user.role] || user.role;
      document.getElementById("topbar").innerHTML =
        "<h1>" + esc(title) + "</h1>" +
        searchHtml +
        '<div class="grow"></div>' +
        '<div class="who"><b>' + esc(user.name) + '</b><span class="tag">' + esc(roleText) + "</span></div>" +
        '<div class="field-inline"><label for="branchSel">สาขา</label><select id="branchSel" style="width:180px"></select></div>';

      if (search && onSearch) {
        document.getElementById("searchBox").addEventListener("input", function (e) {
          onSearch(e.target.value.trim());
        });
      }

      // โหลดรายชื่อสาขา
      const sel = document.getElementById("branchSel");
      try {
        Shell.branches = await api("/api/branches");
      } catch (err) {
        sel.innerHTML = '<option value="">โหลดสาขาไม่สำเร็จ</option>';
        sel.classList.add("invalid");
        toast(err.message + " — ตรวจสอบการเชื่อมต่อฐานข้อมูล (schema.sql / seed.sql)", "error");
        return;
      }
      if (Shell.branches.length === 0) {
        sel.innerHTML = '<option value="">ยังไม่มีข้อมูลสาขา</option>';
        sel.classList.add("invalid");
        toast("ยังไม่มีข้อมูลสาขาในฐานข้อมูล — รัน seed.sql ก่อน", "error");
        return;
      }

      // ตัวเลือก "ทุกสาขา" มีให้เฉพาะเจ้าของ และเฉพาะหน้าที่เปิดใช้ (หน้ารายงาน)
      const canAll = allBranches && user.role === "owner";
      let optionsHtml = "";
      if (canAll) optionsHtml += '<option value="all">ทุกสาขา</option>';
      for (let i = 0; i < Shell.branches.length; i++) {
        const b = Shell.branches[i];
        optionsHtml += '<option value="' + b.branch_id + '">' + esc(b.name) + "</option>";
      }
      sel.innerHTML = optionsHtml;

      // เช็กว่าค่าสาขาที่จำไว้ ยังใช้ได้อยู่ไหม
      function isValidBranch(value) {
        if (value === "all") return canAll;
        for (let i = 0; i < Shell.branches.length; i++) {
          if (String(Shell.branches[i].branch_id) === value) return true;
        }
        return false;
      }

      // เลือกสาขาเริ่มต้น: ที่จำไว้ > "ทุกสาขา" (ถ้าใช้ได้) > สาขาแรก
      const saved = store.get("cafe.branchId");
      if (saved && isValidBranch(saved)) {
        sel.value = saved;
      } else if (canAll) {
        sel.value = "all";
      } else {
        sel.value = String(Shell.branches[0].branch_id);
      }

      // แคชเชียร์ผูกกับสาขาของตัวเอง เปลี่ยนไม่ได้
      if (user.role === "cashier") {
        sel.value = String(user.branchId);
        sel.disabled = true;
      }

      // apply(): อ่านสาขาที่เลือก -> จำไว้ -> แจ้งหน้านั้น (onBranch) ให้โหลดข้อมูลใหม่
      function apply() {
        if (user.role !== "cashier") store.set("cafe.branchId", sel.value);
        if (sel.value === "all") {
          Shell.branchId = null;
        } else {
          Shell.branchId = Number(sel.value);
        }
        if (onBranch) onBranch(Shell.branchId);
      }
      sel.addEventListener("change", apply);
      apply();
    },

    branchName: function (id) {
      for (let i = 0; i < Shell.branches.length; i++) {
        if (Shell.branches[i].branch_id === id) return Shell.branches[i].name;
      }
      return "-";
    }
  };

  // ส่งออกให้ไฟล์อื่นเรียกใช้ผ่าน App
  window.App = window.App || {};
  Object.assign(window.App, {
    Shell: Shell,
    HOME: HOME,
    ROLE_LABEL: ROLE_LABEL
  });
})();
