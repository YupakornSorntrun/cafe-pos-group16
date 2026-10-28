const reportModel = require("../models/reportModel");

// reportController.js — ตรวจ query แล้วเรียก reportModel

// GET /api/reports/sales?branchId=&from=&to=
// สรุปยอดขายรวมต่อเมนู (ไม่ส่ง branchId = ทุกสาขา, ไม่ส่งวันที่ = ทุกช่วงเวลา)
exports.getSalesReport = async (req, res) => {
  const { from, to } = req.query;

  // branchId ถ้าส่งมาต้องเป็นเลขจำนวนเต็มบวก
  let branchId;
  if (req.query.branchId !== undefined && req.query.branchId !== "") {
    branchId = parseInt(req.query.branchId, 10);
    if (Number.isNaN(branchId) || branchId <= 0) {
      return res.status(400).json({ error: "branchId ไม่ถูกต้อง" });
    }
  }

  // วันที่ถ้าส่งมาต้องเป็นรูปแบบ YYYY-MM-DD
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if ((from && !datePattern.test(from)) || (to && !datePattern.test(to))) {
    return res.status(400).json({ error: "รูปแบบวันที่ต้องเป็น YYYY-MM-DD" });
  }

  try {
    const sales = await reportModel.salesByMenu({ branchId, from, to });
    res.json(sales);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน" });
  }
};
