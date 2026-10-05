const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "..", "..", "public", "uploads");
const EXT_BY_TYPE = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

// POST /api/uploads/menu-image — ส่งไฟล์รูปเป็น raw body (Content-Type: image/*) ขนาดไม่เกิน 2MB
router.post(
  "/menu-image",
  express.raw({ type: Object.keys(EXT_BY_TYPE), limit: "2mb" }),
  async (req, res) => {
    const ext = EXT_BY_TYPE[req.headers["content-type"]];
    if (!ext || !Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: "รองรับเฉพาะไฟล์ JPG, PNG หรือ WEBP" });
    }
    try {
      await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });
      const filename = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
      await fs.promises.writeFile(path.join(UPLOAD_DIR, filename), req.body);
      res.status(201).json({ imageUrl: `/uploads/${filename}` });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "บันทึกไฟล์รูปไม่สำเร็จ" });
    }
  }
);

// รูปใหญ่เกิน limit → express.raw โยน error 413
router.use((err, req, res, next) => {
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "ไฟล์รูปต้องมีขนาดไม่เกิน 2MB" });
  }
  next(err);
});

module.exports = router;
