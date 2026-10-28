// =====================================================================
// common/icons.js — ไอคอน SVG และรูปสินค้า (ถ้าไม่มีรูปจะแสดงไอคอนแก้วแทน)
// ต้องโหลดหลัง format.js
// =====================================================================
(function () {
  const esc = App.esc;

  // ไอคอน SVG ฝังในโค้ด
  const ICONS = {
    logo: '<svg viewBox="0 0 24 24"><path d="M4 8h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z"/><path d="M16 10h2a2 2 0 0 1 0 4h-2"/><path d="M8 3v2M12 3v2"/></svg>',
    pos: '<svg viewBox="0 0 24 24"><path d="M6 7h12l1 13H5L6 7z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/></svg>',
    menu: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>',
    stock: '<svg viewBox="0 0 24 24"><path d="M3 8l9-4 9 4-9 4-9-4z"/><path d="M3 8v8l9 4 9-4V8"/><path d="M12 12v8"/></svg>',
    report: '<svg viewBox="0 0 24 24"><path d="M5 20V10M12 20V4M19 20v-7"/></svg>',
    logout: '<svg viewBox="0 0 24 24"><path d="M9 4H5v16h4"/><path d="M16 8l4 4-4 4M20 12H10"/></svg>',
    orders: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z"/><path d="M9 8h6M9 12h6"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg>',
    cup: '<svg viewBox="0 0 24 24"><path d="M5 9h11v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V9z"/><path d="M16 11h1.5a2 2 0 0 1 0 4H16"/><path d="M9 4v2M12 4v2"/></svg>'
  };

  // ---------- รูปภาพ ----------
  const noImage = '<div class="noimg">' + ICONS.cup + "</div>";

  // imgTag(): มีรูปให้คืนแท็ก <img> ไม่มีก็คืนไอคอนแก้วแทน
  // data-fallback ใช้คู่กับตัวดักเหตุการณ์ error ด้านล่าง (กรณีมีลิงก์แต่โหลดไม่ขึ้น)
  function imgTag(url, alt) {
    if (!url) return noImage;
    return '<img src="' + esc(url) + '" alt="' + esc(alt) + '" loading="lazy" data-fallback>';
  }

  // รูปโหลดไม่ได้ -> แสดงไอคอนแทน
  document.addEventListener(
    "error",
    function (e) {
      const t = e.target;
      if (t && t.tagName === "IMG" && t.hasAttribute("data-fallback")) {
        t.outerHTML = noImage;
      }
    },
    true
  );

  // ส่งออกให้ไฟล์อื่นเรียกใช้ผ่าน App
  window.App = window.App || {};
  Object.assign(window.App, {
    ICONS: ICONS,
    imgTag: imgTag
  });
})();
