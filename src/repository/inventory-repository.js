import Inventory from "../model/inventory-model.js";

class InventoryRepository {
  async createInventory(data) {
    return await Inventory.create(data);
  }

  async getInventoryByProductId(productId) {
    return await Inventory.findOne({ productId });
  }

  async reserveStock(productId, quantity) {
    return await Inventory.findOneAndUpdate(
      {
        productId,
        $expr: {
          $gte: [{ $subtract: ["$quantity", "$reservedQuantity"] }, quantity],
        },
      },
      {
        $inc: {
          reservedQuantity: quantity,
        },
      },
      {
        returnDocument: "after",
      },
    );
  }

  async releaseStock(productId, quantity) {
    return await Inventory.findOneAndUpdate(
      {
        productId,
        $expr: {
          $gte: ["$reservedQuantity", quantity],
        },
      },
      {
        $inc: {
          reservedQuantity: -quantity,
        },
      },
      {
        returnDocument: "after",
      },
    );
  }

  async confirmStock(productId, quantity) {
    return await Inventory.findOneAndUpdate(
      {
        productId,
        $expr: {
          $gte: ["$reservedQuantity", quantity],
        },
      },
      {
        $inc: {
          quantity: -quantity,
          reservedQuantity: -quantity,
        },
      },
      {
        returnDocument: "after",
      },
    );
  }

  async increaseStock(productId, quantity) {
    return await Inventory.findOneAndUpdate(
      { productId },
      {
        $inc: {
          quantity,
        },
      },
      {
        returnDocument: "after",
      },
    );
  }
}

export default InventoryRepository;
