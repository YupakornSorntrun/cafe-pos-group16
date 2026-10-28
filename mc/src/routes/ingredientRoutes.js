const express = require("express");
const router = express.Router();
const ingredientController = require("../controllers/ingredientController");
const { authorizeRoles } = require("../middlewares/auth");

// วัตถุดิบใช้ร่วมกันทุกสาขา (ตาม schema) — จัดการได้เฉพาะเจ้าของ
router.use(authorizeRoles("owner"));

router.get("/", ingredientController.getIngredients);
router.post("/", ingredientController.createIngredient);
router.put("/:id", ingredientController.updateIngredient);
router.post("/:id/restock", ingredientController.restockIngredient);
router.delete("/:id", ingredientController.deleteIngredient);

module.exports = router;
