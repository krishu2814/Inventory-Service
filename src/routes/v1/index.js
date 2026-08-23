import express from "express";

import InventoryController from "../../controller/inventory-controller.js";

const router = express.Router();

const inventoryController = new InventoryController();

// Create inventory
router.post("/", inventoryController.createInventory.bind(inventoryController));

// Get inventory by product ID
router.get(
  "/:productId",
  inventoryController.getInventoryByProductId.bind(inventoryController),
);

// Reserve stock
router.post(
  "/:productId/reserve",
  inventoryController.reserveStock.bind(inventoryController),
);

// Release reserved stock
router.post(
  "/:productId/release",
  inventoryController.releaseStock.bind(inventoryController),
);

// Confirm reserved stock
// manual testing/debugging in Postman to simulate what happens after a successful payment.
router.post(
  "/:productId/confirm",
  inventoryController.confirmStock.bind(inventoryController),
);

// Increase physical stock
router.patch(
  "/:productId/stock",
  inventoryController.increaseStock.bind(inventoryController),
);

export default router;
