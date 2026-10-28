const express = require("express");
const router = express.Router();
const lookupController = require("../controllers/lookupController");

// ข้อมูลอ้างอิงที่หน้าเว็บใช้ทำ dropdown (app.js ตรวจ token ให้แล้ว ผู้ที่ล็อกอินแล้วเรียกได้)
router.get("/branches", lookupController.getBranches);
router.get("/categories", lookupController.getCategories);

module.exports = router;
