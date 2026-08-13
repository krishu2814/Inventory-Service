import Inventory from "../model/inventory-model.js";

class InventoryRepository {
  // Create inventory
  async createInventory(data) {
    return await Inventory.create(data);
  }

  // Get inventory by product ID
  async getInventoryByProductId(productId) {
    return await Inventory.findOne({ productId });
  }

  // Reserve stock atomically (avilable stock > = quantity)
  async reserveStock(productId, quantity) {
    return await Inventory.findOneAndUpdate(
      {
        productId,

        $expr: {
          $gte: [
            {
              $subtract: ["$quantity", "$reservedQuantity"],
            },
            quantity,
          ],
        },
      },
      {
        $inc: {
          reservedQuantity: quantity,
        },
      },
      {
        new: true,
      },
    );
  }

  // Release previously reserved stock
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
        new: true,
      },
    );
  }

  // Confirm reservation
  // Physical stock decreases and reservation disappears
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
        new: true,
      },
    );
  }

  // Increase physical stock
  async increaseStock(productId, quantity) {
    return await Inventory.findOneAndUpdate(
      {
        productId,
      },
      {
        $inc: {
          quantity,
        },
      },
      {
        new: true,
      },
    );
  }
}

export default InventoryRepository;
