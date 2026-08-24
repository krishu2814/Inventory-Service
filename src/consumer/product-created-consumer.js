import { createConsumerWithRetry } from "../utils/consumer-helper.js";
import InventoryRepository from "../repository/inventory-repository.js";

class ProductCreatedConsumer {
  constructor() {
    this.inventoryRepository = new InventoryRepository();
  }

  async start() {
    await createConsumerWithRetry({
      queueName: "inventory_product_created_queue",
      routingKey: "PRODUCT_CREATED",
      handler: async (event) => {
        if (event.event !== "PRODUCT_CREATED" || !event.productId) {
          console.error("Invalid PRODUCT_CREATED event received:", event);
          return;
        }

        // Idempotency: Check if inventory already exists for this product
        const existingInventory =
          await this.inventoryRepository.getInventoryByProductId(
            event.productId,
          );

        if (!existingInventory) {
          const initialQuantity =
            Number(event.quantity) >= 0 ? Number(event.quantity) : 0;

          await this.inventoryRepository.createInventory({
            productId: String(event.productId),
            quantity: initialQuantity,
            reservedQuantity: 0,
          });

          console.log(
            `Initialized inventory for product ${event.productId} with ${initialQuantity} units`,
          );
        }
      },
    });
  }
}

export default ProductCreatedConsumer;
