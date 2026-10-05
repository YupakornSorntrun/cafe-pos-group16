// Shared helpers: API, shell (sidebar + topbar + branch selector), toast, modal, receipt
// =====================================================================
// common.js — ตัวช่วยที่ "ทุกหน้า" ใช้ร่วมกัน (โหลดก่อนไฟล์ของแต่ละหน้าเสมอ)
//   - api()      เรียก backend พร้อมแนบ token ล็อกอิน
//   - Shell      วาดแถบเมนูซ้าย/แถบบน, ตรวจว่าล็อกอินและมีสิทธิ์เข้าหน้านั้นไหม, จัดการตัวเลือกสาขา
//   - toast / modal / confirmBox   ข้อความเตือนและหน้าต่างป๊อปอัป
//   - showReceipt()  แสดงและพิมพ์ใบเสร็จ
// ทุกอย่างถูกส่งออกทางตัวแปร App ท้ายไฟล์ เช่น App.api(...), App.toast(...)
// =====================================================================
(function () {
  // ไอคอนทั้งหมดเป็น SVG ฝังในโค้ด (เส้นเรียบ ๆ) จึงไม่ต้องโหลดไฟล์รูปเพิ่ม
  const ICONS = {
    logo: '<svg viewBox="0 0 24 24"><path d="M4 8h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z"/><path d="M16 10h2a2 2 0 0 1 0 4h-2"/><path d="M8 3v2M12 3v2"/></svg>',
    pos: '<svg viewBox="0 0 24 24"><path d="M6 7h12l1 13H5L6 7z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/></svg>',
    menu: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>',
    stock: '<svg viewBox="0 0 24 24"><path d="M3 8l9-4 9 4-9 4-9-4z"/><path d="M3 8v8l9 4 9-4V8"/><path d="M12 12v8"/></svg>',
    report: '<svg viewBox="0 0 24 24"><path d="M5 20V10M12 20V4M19 20v-7"/></svg>',
    logout: '<svg viewBox="0 0 24 24"><path d="M9 4H5v16h4"/><path d="M16 8l4 4-4 4M20 12H10"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg>',
    cup: '<svg viewBox="0 0 24 24"><path d="M5 9h11v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V9z"/><path d="M16 11h1.5a2 2 0 0 1 0 4H16"/><path d="M9 4v2M12 4v2"/></svg>',
  };

  // roles = บทบาทที่เข้าหน้านี้ได้ (ตรงกับสิทธิ์ที่ server บังคับใช้อีกชั้น)
  const NAV = [
    { id: "pos", href: "/index.html", label: "แคชเชียร์ (POS)", icon: "pos", roles: ["cashier"] },
    { id: "menu", href: "/menu.html", label: "จัดการเมนู", icon: "menu", roles: ["owner"] },
    { id: "stock", href: "/stock.html", label: "สต็อกวัตถุดิบ", icon: "stock", roles: ["owner"] },
    { id: "report", href: "/report.html", label: "แดชบอร์ดยอดขาย", icon: "report", roles: ["owner"] },
  ];
  const HOME = { cashier: "/index.html", owner: "/report.html" };
  const ROLE_LABEL = { cashier: "แคชเชียร์", owner: "เจ้าของร้าน" };

  // ห่อ localStorage ด้วย try/catch เพราะบางเบราว์เซอร์ (เช่นโหมดส่วนตัว) ใช้ไม่ได้ จะได้ไม่ทำให้หน้าเว็บพัง
  // ใช้เก็บ token ล็อกอิน (cafe.token) และสาขาที่เลือกล่าสุด (cafe.branchId)
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
    remove(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
  };

  // esc(): แปลงอักขระพิเศษ < > & " ' เป็น HTML entity ก่อนนำข้อความไปใส่ใน HTML
  // เพื่อกันการฝังสคริปต์ (XSS) — ข้อความจากฐานข้อมูลหรือที่ผู้ใช้พิมพ์ต้องผ่านฟังก์ชันนี้ทุกครั้ง
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // baht(1234.5) -> "฿1,234.50"
  const baht = (n) =>
    "฿" + Number(n || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // แสดงเวลาเป็นเวลาไทยเสมอ ไม่ขึ้นกับ timezone ของเครื่อง
  const TZ = "Asia/Bangkok";
  // เลขคิวแสดงผล: A001, A002, ...
  const queueLabel = (o) => "A" + String(o.queue_no).padStart(3, "0");
  const fmtDateTime = (d) =>
    new Date(d).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: TZ });
  // "YYYY-MM-DD" ตามวันที่ในเวลาไทย
  const ymdThai = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: TZ });

  // api(): ตัวกลางเรียก backend แทน fetch ตรง ๆ
  //   api("/api/menu?branchId=1")                     -> GET
  //   api("/api/orders", { json: {...} })             -> POST พร้อมส่ง JSON
  //   api("/api/menu/3", { method: "PUT", json: {...} })
  // ถ้า server ตอบ error จะ throw Error ที่มีข้อความภาษาไทยให้เอาไปแสดงต่อได้ (toast(e.message))
  async function api(path, opts = {}) {
    const init = { ...opts };
    // ถ้าส่ง { json: ... } มา -> แปลงเป็น JSON ใน body และตั้ง method เป็น POST ให้อัตโนมัติ
    if (init.json !== undefined) {
      init.method = init.method || "POST";
      init.headers = { "Content-Type": "application/json", ...(init.headers || {}) };
      init.body = JSON.stringify(init.json);
      delete init.json;
    }
    // แนบ JWT ไปกับทุกคำขอ เพื่อให้ server รู้ว่าใครเรียกและมีสิทธิ์ทำสิ่งนั้นไหม
    const token = store.get("cafe.token");
    if (token) init.headers = { ...(init.headers || {}), Authorization: `Bearer ${token}` };
    let res;
    try {
      res = await fetch(path, init);
    } catch {
      throw new Error("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    }
    const data = await res.json().catch(() => ({}));
    // 401 = ยังไม่ล็อกอิน หรือ token หมดอายุ -> ล้าง token แล้วพาไปหน้า login
    // (ยกเว้นตอนกดล็อกอินเอง ซึ่งต้องให้แสดงข้อความ "รหัสผ่านไม่ถูกต้อง" แทน)
    if (res.status === 401 && !path.startsWith("/api/auth/login")) {
      store.remove("cafe.token");
      location.href = "/login.html";
      throw new Error(data.error || "กรุณาเข้าสู่ระบบ");
    }
    if (!res.ok) {
      const msg = typeof data.error === "string" ? data.error : (data.error && data.error.message) || "เกิดข้อผิดพลาด";
      throw new Error(msg);
    }
    return data;
  }

  // toast(): กล่องข้อความเล็ก ๆ มุมขวาล่าง หายไปเอง (kind = "error" สีแดง, "warn" สีเหลือง)
  function toast(msg, kind = "") {
    let box = document.querySelector(".toasts");
    if (!box) {
      box = document.createElement("div");
      box.className = "toasts";
      document.body.appendChild(box);
    }
    const el = document.createElement("div");
    el.className = "toast " + kind;
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => el.remove(), kind === "error" ? 5000 : 3200);
  }

  // modal(): หน้าต่างป๊อปอัป ปิดได้ด้วยปุ่ม x, กด Esc หรือคลิกพื้นหลัง
  // คืนค่า { el, close } เพื่อให้ผู้เรียกไปผูกปุ่มข้างใน (เช่น ปุ่มบันทึก) เอง
  // modal({title, body(html), footer(html)}) → { el, close }
  function modal({ title, body, footer, onClose }) {
    const ov = document.createElement("div");
    ov.className = "overlay";
    ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true">
      <div class="modal-head"><h3>${esc(title)}</h3><button class="x" aria-label="ปิด">&times;</button></div>
      <div class="modal-body">${body}</div>${footer ? `<div class="modal-foot">${footer}</div>` : ""}</div>`;
    const close = () => { ov.remove(); document.removeEventListener("keydown", onKey); if (onClose) onClose(); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    ov.addEventListener("mousedown", (e) => { if (e.target === ov) close(); });
    ov.querySelector(".x").addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    document.body.appendChild(ov);
    return { el: ov, close };
  }

  // confirmBox(): หน้าต่างถามยืนยัน คืน Promise<true/false>
  // ใช้แบบ: if (await confirmBox({ title, message })) { ...ทำต่อ... }
  function confirmBox({ title, message, okText = "ยืนยัน", danger = false }) {
    return new Promise((resolve) => {
      const m = modal({
        title,
        body: `<p>${esc(message)}</p>`,
        footer: `<button class="btn" data-no>ยกเลิก</button><button class="btn ${danger ? "danger" : "primary"}" data-yes>${esc(okText)}</button>`,
        onClose: () => resolve(false),
      });
      m.el.querySelector("[data-no]").onclick = () => m.close();
      m.el.querySelector("[data-yes]").onclick = () => { m.el.remove(); resolve(true); };
    });
  }

  // ---------- Shell ----------
  // Shell.init({ page, title, search, allBranches, onBranch(branchId|null), onSearch(text) })
  // Shell = "โครง" ของทุกหน้า หน้าไหนก็เรียก Shell.init({...}) เป็นอย่างแรก มันจะ:
  //   1) ตรวจว่าล็อกอินอยู่ไหม (ไม่อยู่ -> ไปหน้า login)   2) ตรวจว่าบทบาทนี้เข้าหน้านี้ได้ไหม
  //   3) วาดแถบเมนูซ้ายเฉพาะเมนูที่บทบาทนี้ใช้ได้   4) วาดแถบบน (ชื่อหน้า ค้นหา ชื่อผู้ใช้ สาขา)
  //   5) โหลดรายชื่อสาขา แล้วเรียก onBranch(สาขา) ทุกครั้งที่เปลี่ยนสาขา เพื่อให้หน้านั้นโหลดข้อมูลใหม่
  const Shell = {
    branches: [],
    branchId: null,

    user: null,

    async init({ page, title, search = false, allBranches = false, onBranch, onSearch }) {
      document.title = `${title} · Baristech Cafe`;

      // ต้องล็อกอิน และต้องมีสิทธิ์เข้าหน้านี้
      try {
        Shell.user = await api("/api/auth/me");
      } catch {
        return; // api() redirect ไปหน้า login แล้ว
      }
      const u = Shell.user;
      const me = NAV.find((n) => n.id === page);
      if (!me.roles.includes(u.role)) {
        location.replace(HOME[u.role] || "/login.html");
        return;
      }

      document.getElementById("rail").innerHTML =
        `<div class="logo">${ICONS.logo}</div>` +
        NAV.filter((n) => n.roles.includes(u.role)).map((n) => `<a class="nav ${n.id === page ? "active" : ""}" href="${n.href}" data-label="${esc(n.label)}" aria-label="${esc(n.label)}">${ICONS[n.icon]}</a>`).join("") +
        `<div class="spacer"></div><button class="nav-btn" id="logoutBtn" data-label="ออกจากระบบ" aria-label="ออกจากระบบ">${ICONS.logout}</button>`;
      document.getElementById("logoutBtn").addEventListener("click", async () => {
        store.remove("cafe.token"); // JWT เป็น stateless — ออกจากระบบ = ทิ้ง token ฝั่ง client
        location.href = "/login.html";
      });

      const top = document.getElementById("topbar");
      top.innerHTML = `<h1>${esc(title)}</h1>
        ${search ? `<div class="search"><span class="icon">${ICONS.search}</span><input type="text" id="searchBox" placeholder="ค้นหาเมนู..." autocomplete="off"></div>` : ""}
        <div class="grow"></div>
        <div class="who"><b>${esc(u.name)}</b><span class="tag">${esc(ROLE_LABEL[u.role] || u.role)}</span></div>
        <div class="field-inline"><label for="branchSel">สาขา</label><select id="branchSel" style="width:180px"></select></div>`;
      if (search && onSearch) document.getElementById("searchBox").addEventListener("input", (e) => onSearch(e.target.value.trim()));

      const sel = document.getElementById("branchSel");
      try {
        Shell.branches = await api("/api/branches");
      } catch (e) {
        sel.innerHTML = '<option value="">โหลดสาขาไม่สำเร็จ</option>';
        sel.classList.add("invalid");
        toast(e.message + " — ตรวจสอบการเชื่อมต่อฐานข้อมูล (schema.sql / seed.sql)", "error");
        return;
      }
      if (!Shell.branches.length) {
        sel.innerHTML = '<option value="">ยังไม่มีข้อมูลสาขา</option>';
        sel.classList.add("invalid");
        toast("ยังไม่มีข้อมูลสาขาในฐานข้อมูล — รัน seed.sql ก่อน", "error");
        return;
      }

      // ตัวเลือก "ทุกสาขา" มีให้เฉพาะเจ้าของ และเฉพาะหน้าที่เปิดใช้ (หน้ารายงาน)
      const canAll = allBranches && u.role === "owner";
      sel.innerHTML =
        (canAll ? '<option value="all">ทุกสาขา</option>' : "") +
        Shell.branches.map((b) => `<option value="${b.branch_id}">${esc(b.name)}</option>`).join("");

      const saved = store.get("cafe.branchId");
      const valid = (v) => (v === "all" ? canAll : Shell.branches.some((b) => String(b.branch_id) === v));
      sel.value = saved && valid(saved) ? saved : (canAll ? "all" : String(Shell.branches[0].branch_id));
      if (u.role === "cashier") { sel.value = String(u.branchId); sel.disabled = true; } // แคชเชียร์ผูกกับสาขาตัวเอง

      // apply(): อ่านสาขาที่เลือกอยู่ -> จำไว้ใน localStorage -> แจ้งหน้าที่เรียกใช้ (onBranch) ให้โหลดข้อมูลใหม่
      const apply = () => {
        if (u.role !== "cashier") store.set("cafe.branchId", sel.value);
        Shell.branchId = sel.value === "all" ? null : Number(sel.value);
        if (onBranch) onBranch(Shell.branchId);
      };
      sel.addEventListener("change", apply);
      apply();
    },

    branchName(id) {
      const b = Shell.branches.find((x) => x.branch_id === id);
      return b ? b.name : "-";
    },
  };

  // ---------- Image helpers ----------
  const noImage = `<div class="noimg">${ICONS.cup}</div>`;
  // imgTag(): ถ้ามีรูปให้คืนแท็ก <img> ไม่มีก็คืนไอคอนแก้วแทน
  // data-fallback ใช้คู่กับตัวดักเหตุการณ์ error ด้านล่าง (กรณีมีลิงก์รูปแต่โหลดไม่ขึ้น)
  function imgTag(url, alt) {
    if (!url) return noImage;
    return `<img src="${esc(url)}" alt="${esc(alt)}" loading="lazy" data-fallback>`;
  }
  // รูปโหลดไม่ได้ → แสดงไอคอนแทน
  document.addEventListener("error", (e) => {
    const t = e.target;
    if (t && t.tagName === "IMG" && t.hasAttribute("data-fallback")) {
      t.outerHTML = noImage;
    }
  }, true);

  // ---------- Receipt ----------
  const UNIT_LABEL = { g: "กรัม", ml: "มล.", pcs: "ชิ้น" };
  const BARISTA_LABEL = { pending: "รอทำ", preparing: "กำลังทำ", completed: "เสร็จแล้ว" };
  const PAY_LABEL = { cash: "เงินสด", credit: "บัตรเครดิต", qr: "QR Code" };
  const TYPE_LABEL = { dine_in: "ทานที่ร้าน", takeaway: "กลับบ้าน" };

  // receiptHtml(): สร้าง HTML ของใบเสร็จจากข้อมูลออเดอร์ (ได้จาก GET /api/orders/:id)
  // ยอดรวม/ส่วนลด/ยอดสุทธิ/เงินทอน ใช้ค่าที่ server คำนวณมาให้ ไม่คำนวณซ้ำที่หน้าเว็บ
  function receiptHtml(o) {
    const b = o.branch || {};
    return `<div class="receipt" id="receiptPaper">
      <div class="c shop">Baristech Cafe</div>
      <div class="c">${esc(b.name || "")}</div>
      <div class="c">${esc(b.address || "")}</div>
      <hr>
      <div class="c">คิวที่</div>
      <div class="c queue">${esc(queueLabel(o))}</div>
      <hr>
      <div class="rw"><span>เลขที่</span><span>${esc(o.receipt ? o.receipt.receipt_number : "#" + o.order_id)}</span></div>
      <div class="rw"><span>วันที่</span><span>${esc(fmtDateTime(o.created_at))}</span></div>
      <div class="rw"><span>แคชเชียร์</span><span>${esc(o.employee_name || "-")}</span></div>
      <div class="rw"><span>ประเภท</span><span>${esc(TYPE_LABEL[o.order_type] || o.order_type)}${o.table_number ? " · โต๊ะ " + esc(o.table_number) : ""}</span></div>
      <hr>
      ${o.items.map((i) => `<div class="it"><div>${esc(i.name)}</div>
        <div class="rw sub"><span>${i.quantity} x ${Number(i.unit_price).toFixed(2)}</span><span>${Number(i.line_total).toFixed(2)}</span></div></div>`).join("")}
      <hr>
      <div class="rw"><span>รวม</span><span>${Number(o.subtotal_amount).toFixed(2)}</span></div>
      ${Number(o.discount_amount) > 0 ? `<div class="rw"><span>ส่วนลด</span><span>-${Number(o.discount_amount).toFixed(2)}</span></div>` : ""}
      <div class="rw b"><span>ยอดสุทธิ</span><span>${Number(o.total_amount).toFixed(2)}</span></div>
      <div class="rw"><span>${esc(PAY_LABEL[o.payment_method] || o.payment_method)}</span><span>${Number(o.amount_received).toFixed(2)}</span></div>
      <div class="rw"><span>เงินทอน</span><span>${Number(o.change_amount).toFixed(2)}</span></div>
      ${o.payment_status === "voided" ? '<div class="void">ยกเลิกแล้ว (VOID)</div>' : ""}
      <hr>
      <div class="c">ขอบคุณที่ใช้บริการ</div>
    </div>`;
  }

  // showReceipt(): โหลดออเดอร์ตามเลข แล้วเปิดใบเสร็จในหน้าต่างป๊อปอัป
  // ปุ่มพิมพ์ใช้ window.print() — CSS (@media print) จะซ่อนทุกอย่างยกเว้นใบเสร็จ
  async function showReceipt(orderId, { title = "ใบเสร็จรับเงิน" } = {}) {
    const order = await api(`/api/orders/${orderId}`);
    const m = modal({
      title,
      body: receiptHtml(order),
      footer: '<button class="btn" data-close>ปิด</button><button class="btn primary" data-print>พิมพ์ใบเสร็จ</button>',
    });
    // ใส่ป้ายไว้ให้ CSS ตอนพิมพ์รู้ว่าหน้าต่างไหนคือใบเสร็จ (หน้าต่างอื่นที่เปิดค้างอยู่ เช่น "ออเดอร์วันนี้" จะไม่ถูกพิมพ์)
    m.el.classList.add("print-target");
    m.el.querySelector("[data-close]").onclick = m.close;
    // พิมพ์ใบเสร็จ: เปิดโหมด print-receipt (CSS ซ่อนทุกอย่างยกเว้นใบเสร็จ) แล้วสั่งพิมพ์
    const printNow = () => {
      document.body.classList.add("print-receipt");
      window.addEventListener("afterprint", () => document.body.classList.remove("print-receipt"), { once: true });
      window.print();
    };
    m.el.querySelector("[data-print]").onclick = printNow;
    return m;
  }

  // ส่งออกฟังก์ชันทั้งหมดทางตัวแปร App เพื่อให้ไฟล์ของแต่ละหน้า (pos.js, menu.js ฯลฯ) เรียกใช้ได้
  window.App = { queueLabel, BARISTA_LABEL, ymdThai, UNIT_LABEL, ROLE_LABEL, HOME, api, toast, modal, confirmBox, Shell, esc, baht, fmtDateTime, imgTag, showReceipt, PAY_LABEL, TYPE_LABEL, ICONS, store };
})();
