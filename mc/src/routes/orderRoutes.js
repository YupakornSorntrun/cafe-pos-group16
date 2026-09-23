const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

router.post("/", orderController.createOrder);
router.get("/", orderController.getAllOrders);
router.delete("/:id", orderController.deleteOrder);
router.delete("/:orderId/items/:itemId", orderController.deleteOrderItem);

module.exports = router;
