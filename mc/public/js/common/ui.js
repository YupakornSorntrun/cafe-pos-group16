// =====================================================================
// common/ui.js — กล่องข้อความและหน้าต่างป๊อปอัป
//   toast()       ข้อความเล็ก ๆ มุมขวาล่าง
//   modal()       หน้าต่างป๊อปอัป
//   confirmBox()  หน้าต่างถามยืนยัน
// ต้องโหลดหลัง format.js
// =====================================================================
(function () {
  const esc = App.esc;

  // ---------- toast: กล่องข้อความเล็ก ๆ มุมขวาล่าง หายไปเอง ----------
  // kind = "error" (สีแดง) หรือ "warn" (สีเหลือง)
  function toast(msg, kind) {
    if (!kind) kind = "";

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

    const ms = kind === "error" ? 5000 : 3200;
    setTimeout(function () {
      el.remove();
    }, ms);
  }

  // ---------- modal: หน้าต่างป๊อปอัป ----------
  // ปิดได้ด้วยปุ่ม x, กด Esc หรือคลิกพื้นหลัง
  // modal({ title, body(html), footer(html), onClose }) -> { el, close }
  function modal(options) {
    const title = options.title;
    const body = options.body;
    const footer = options.footer;
    const onClose = options.onClose;

    const overlay = document.createElement("div");
    overlay.className = "overlay";

    let footerHtml = "";
    if (footer) footerHtml = '<div class="modal-foot">' + footer + "</div>";

    overlay.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true">' +
      '<div class="modal-head"><h3>' + esc(title) + '</h3><button class="x" aria-label="ปิด">&times;</button></div>' +
      '<div class="modal-body">' + body + "</div>" +
      footerHtml +
      "</div>";

    function onKey(e) {
      if (e.key === "Escape") close();
    }

    function close() {
      overlay.remove();
      document.removeEventListener("keydown", onKey);
      if (onClose) onClose();
    }

    overlay.addEventListener("mousedown", function (e) {
      if (e.target === overlay) close();
    });
    overlay.querySelector(".x").addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    document.body.appendChild(overlay);

    return { el: overlay, close: close };
  }

  // ---------- confirmBox: หน้าต่างถามยืนยัน คืน Promise<true/false> ----------
  // ใช้แบบ: if (await confirmBox({ title, message })) { ...ทำต่อ... }
  function confirmBox(options) {
    const title = options.title;
    const message = options.message;
    const okText = options.okText || "ยืนยัน";
    const danger = options.danger || false;

    return new Promise(function (resolve) {
      const okClass = danger ? "danger" : "primary";
      const m = modal({
        title: title,
        body: "<p>" + esc(message) + "</p>",
        footer:
          '<button class="btn" data-no>ยกเลิก</button>' +
          '<button class="btn ' + okClass + '" data-yes>' + esc(okText) + "</button>",
        onClose: function () {
          resolve(false);
        }
      });
      m.el.querySelector("[data-no]").onclick = function () {
        m.close();
      };
      m.el.querySelector("[data-yes]").onclick = function () {
        m.el.remove();
        resolve(true);
      };
    });
  }

  // ส่งออกให้ไฟล์อื่นเรียกใช้ผ่าน App
  window.App = window.App || {};
  Object.assign(window.App, {
    toast: toast,
    modal: modal,
    confirmBox: confirmBox
  });
})();
