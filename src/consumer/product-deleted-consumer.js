import { createConsumerWithRetry } from "../utils/consumer-helper.js";
import InventoryRepository from "../repository/inventory-repository.js";

class ProductDeletedConsumer {
  constructor() {
    this.inventoryRepository = new InventoryRepository();
  }

  async start() {
    await createConsumerWithRetry({
      queueName: "inventory_product_deleted_queue",
      routingKey: "PRODUCT_DELETED",
      handler: async (event) => {
        if (event.event !== "PRODUCT_DELETED" || !event.productId) {
          console.error("Invalid PRODUCT_DELETED event received:", event);
          return;
        }

        await this.inventoryRepository.deleteInventoryByProductId(
          String(event.productId),
        );

        console.log(`Deleted inventory for product ${event.productId}`);
      },
    });
  }
}

export default ProductDeletedConsumer;
