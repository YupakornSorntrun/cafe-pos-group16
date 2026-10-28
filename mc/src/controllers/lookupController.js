const lookupModel = require("../models/lookupModel");

// lookupController.js — สาขา/หมวดหมู่ สำหรับ dropdown (ผู้ที่ล็อกอินแล้วเรียกได้)

// GET /api/branches — เจ้าของเห็นทุกสาขา, แคชเชียร์เห็นเฉพาะสาขาตัวเอง
exports.getBranches = async (req, res) => {
  try {
    let branches;
    if (req.user.role === "owner") {
      branches = await lookupModel.findAllBranches();
    } else {
      branches = await lookupModel.findBranchById(req.user.branchId);
    }
    res.json(branches);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลสาขา" });
  }
};

// GET /api/categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await lookupModel.findAllCategories();
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลหมวดหมู่" });
  }
};
