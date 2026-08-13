import InventoryService from "../service/inventory-service.js";

class InventoryController {
  constructor() {
    this.inventoryService = new InventoryService();
  }

  // CREATE INVENTORY
  async createInventory(req, res) {
    try {
      const inventory = await this.inventoryService.createInventory(req.body);

      return res.status(201).json({
        success: true,
        message: "Inventory created successfully",
        data: inventory,
        err: {},
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
        data: {},
        err: error,
      });
    }
  }

  // GET INVENTORY
  async getInventoryByProductId(req, res) {
    try {
      const inventory = await this.inventoryService.getInventoryByProductId(
        req.params.productId,
      );

      if (!inventory) {
        return res.status(404).json({
          success: false,
          message: "Inventory not found",
          data: {},
          err: {},
        });
      }

      return res.status(200).json({
        success: true,
        message: "Inventory fetched successfully",
        data: inventory,
        err: {},
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
        data: {},
        err: error,
      });
    }
  }

  // RESERVE STOCK
  async reserveStock(req, res) {
    try {
      const inventory = await this.inventoryService.reserveStock(
        req.params.productId,
        Number(req.body.quantity),
      );

      return res.status(200).json({
        success: true,
        message: "Stock reserved successfully",
        data: inventory,
        err: {},
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
        data: {},
        err: error,
      });
    }
  }

  // RELEASE STOCK
  async releaseStock(req, res) {
    try {
      const inventory = await this.inventoryService.releaseStock(
        req.params.productId,
        Number(req.body.quantity),
      );

      return res.status(200).json({
        success: true,
        message: "Reserved stock released successfully",
        data: inventory,
        err: {},
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
        data: {},
        err: error,
      });
    }
  }

  // CONFIRM STOCK
  async confirmStock(req, res) {
    try {
      const inventory = await this.inventoryService.confirmStock(
        req.params.productId,
        Number(req.body.quantity),
      );

      return res.status(200).json({
        success: true,
        message: "Stock confirmed successfully",
        data: inventory,
        err: {},
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
        data: {},
        err: error,
      });
    }
  }

  // INCREASE STOCK
  async increaseStock(req, res) {
    try {
      const inventory = await this.inventoryService.increaseStock(
        req.params.productId,
        Number(req.body.quantity),
      );

      return res.status(200).json({
        success: true,
        message: "Stock increased successfully",
        data: inventory,
        err: {},
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
        data: {},
        err: error,
      });
    }
  }
}

export default InventoryController;
