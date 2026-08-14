import InventoryRepository from "../repository/inventory-repository.js";
import ProductClient from "../clients/product-client.js";
import mongoose from "mongoose";

class InventoryService {
  constructor() {
    this.inventoryRepository = new InventoryRepository();
    this.productClient = new ProductClient();
  }

  // CREATE INVENTORY

  async createInventory(data) {
    try {
      this.validateProductId(data.productId);

      if (
        data.quantity === undefined ||
        !Number.isInteger(data.quantity) ||
        data.quantity < 0
      ) {
        throw new Error("Quantity must be a non-negative integer");
      }

      await this.productClient.getProductById(data.productId);

      const existingInventory =
        await this.inventoryRepository.getInventoryByProductId(data.productId);

      if (existingInventory) {
        throw new Error("Inventory already exists for this product");
      }

      const inventory = await this.inventoryRepository.createInventory({
        productId: data.productId,
        quantity: data.quantity,
        reservedQuantity: 0,
      });

      return this.formatInventory(inventory);
    } catch (error) {
      console.error("Error creating inventory:", error);
      throw error;
    }
  }

  // GET INVENTORY
  async getInventoryByProductId(productId) {
    try {
      // validate productId
      this.validateProductId(productId);

      const inventory =
        await this.inventoryRepository.getInventoryByProductId(productId);

      if (!inventory) {
        return null;
      }

      return this.formatInventory(inventory);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      throw error;
    }
  }

  // RESERVE STOCK
  async reserveStock(productId, quantity) {
    try {
      this.validateProductId(productId);
      this.validateQuantity(quantity);

      const inventory = await this.inventoryRepository.reserveStock(
        productId,
        quantity,
      );

      if (!inventory) {
        throw new Error("Insufficient stock or inventory not found");
      }

      return this.formatInventory(inventory);
    } catch (error) {
      console.error("Error reserving stock:", error);
      throw error;
    }
  }

  // RELEASE STOCK
  async releaseStock(productId, quantity) {
    try {
      this.validateProductId(productId);
      this.validateQuantity(quantity);

      const inventory = await this.inventoryRepository.releaseStock(
        productId,
        quantity,
      );

      if (!inventory) {
        throw new Error("Insufficient reserved stock or inventory not found");
      }

      return this.formatInventory(inventory);
    } catch (error) {
      console.error("Error releasing stock:", error);
      throw error;
    }
  }

  // CONFIRM STOCK
  async confirmStock(productId, quantity) {
    try {
      this.validateProductId(productId);
      this.validateQuantity(quantity);

      const inventory = await this.inventoryRepository.confirmStock(
        productId,
        quantity,
      );

      if (!inventory) {
        throw new Error("Insufficient reserved stock or inventory not found");
      }

      return this.formatInventory(inventory);
    } catch (error) {
      console.error("Error confirming stock:", error);
      throw error;
    }
  }

  // INCREASE STOCK
  async increaseStock(productId, quantity) {
    try {
      this.validateProductId(productId);
      this.validateQuantity(quantity);

      const inventory = await this.inventoryRepository.increaseStock(
        productId,
        quantity,
      );

      if (!inventory) {
        throw new Error("Inventory not found");
      }

      return this.formatInventory(inventory);
    } catch (error) {
      console.error("Error increasing stock:", error);
      throw error;
    }
  }

  // HELPERS
  validateProductId(productId) {
    if (!productId) {
      throw new Error("Product ID is required");
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error("Invalid Product ID");
    }
  }

  validateQuantity(quantity) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("Quantity must be a positive integer");
    }
  }

  formatInventory(inventory) {
    return {
      id: inventory._id,
      productId: inventory.productId,
      quantity: inventory.quantity,
      reservedQuantity: inventory.reservedQuantity,
      availableQuantity: inventory.quantity - inventory.reservedQuantity,
      createdAt: inventory.createdAt,
      updatedAt: inventory.updatedAt,
    };
  }
}

export default InventoryService;
