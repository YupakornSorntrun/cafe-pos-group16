const menuModel = require("../models/menuModel");

exports.getMenus = async (req, res) => {
  const branchId = parseInt(req.query.branchId, 10);
  if (Number.isNaN(branchId) || branchId <= 0) {
    return res.status(400).json({ error: "ต้องระบุ branchId" });
  }

  try {
    const menus = await menuModel.findByBranchId(branchId);
    res.json(menus);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลเมนู" });
  }
};

exports.getMenuById = async (req, res) => {
  const menuId = parseInt(req.params.id, 10);
  const branchId = parseInt(req.query.branchId, 10);

  if (Number.isNaN(branchId) || branchId <= 0) {
    return res.status(400).json({ error: "ต้องระบุ branchId" });
  }

  try {
    const menu = await menuModel.findByIdAndBranchId(menuId, branchId);
    if (!menu) {
      return res.status(404).json({ error: "ไม่พบเมนูในสาขานี้" });
    }
    res.json(menu);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลเมนู" });
  }
};

exports.createMenu = async (req, res) => {
  const { branchId, categoryId, name, price } = req.body;

  if (!Number.isInteger(branchId) || branchId <= 0) {
    return res.status(400).json({ error: "ต้องระบุ branchId" });
  }
  if (!name || typeof name !== 'string' || name.trim() === "") {
    return res.status(400).json({ error: "ต้องระบุชื่อเมนู" });
  }
  if (!Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ error: "ราคาสินค้าต้องมากกว่า 0" });
  }

  const catId = Number.isInteger(categoryId) ? categoryId : 1; 

  try {
    const menuId = await menuModel.create(branchId, catId, name, price);
    res.status(201).json({ message: "สร้างเมนูสำเร็จ", menuId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
  }
};

exports.updateMenu = async (req, res) => {
  const menuId = parseInt(req.params.id, 10);
  const { branchId, categoryId, name, price } = req.body;

  if (!Number.isInteger(branchId) || branchId <= 0) {
    return res.status(400).json({ error: "ต้องระบุ branchId" });
  }
  if (!name || typeof name !== 'string' || name.trim() === "") {
    return res.status(400).json({ error: "ต้องระบุชื่อเมนู" });
  }
  if (!Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ error: "ราคาสินค้าต้องมากกว่า 0" });
  }

  const catId = Number.isInteger(categoryId) ? categoryId : 1;

  try {
    const affectedRows = await menuModel.update(menuId, branchId, catId, name, price);
    if (affectedRows === 0) {
      return res.status(404).json({ error: "ไม่พบเมนูในสาขานี้" });
    }
    res.json({ message: "แก้ไขเมนูสำเร็จ" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการแก้ไขข้อมูล" });
  }
};

exports.deleteMenu = async (req, res) => {
  const menuId = parseInt(req.params.id, 10);
  
  // รองรับ branchId จาก query string
  const branchId = parseInt(req.query.branchId, 10);

  if (Number.isNaN(branchId) || branchId <= 0) {
    return res.status(400).json({ error: "ต้องระบุ branchId" });
  }

  try {
    const affectedRows = await menuModel.deleteMenu(menuId, branchId);
    if (affectedRows === 0) {
      return res.status(404).json({ error: "ไม่พบเมนูในสาขานี้" });
    }
    res.json({ message: "ลบเมนูสำเร็จ" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบข้อมูล" });
  }
};
