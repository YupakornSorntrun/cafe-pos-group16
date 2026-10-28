const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const { authorizeRoles } = require("../middlewares/auth");

// รายงานดูได้เฉพาะเจ้าของ
router.get("/sales", authorizeRoles("owner"), reportController.getSalesReport);

module.exports = router;
