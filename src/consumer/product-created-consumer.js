import { getChannel } from "../config/rabbitmq.js";
import { env } from "../config/serverConfig.js";
import InventoryRepository from "../repository/inventory-repository.js";

class ProductCreatedConsumer {
  constructor() {
    this.inventoryRepository = new InventoryRepository();
  }

  async start() {
    const channel = getChannel();

    const exchangeName = env.EXCHANGE_NAME;
    const queueName = "inventory_product_created_queue";
    const routingKey = "PRODUCT_CREATED";

    await channel.assertExchange(exchangeName, "topic", {
      durable: true,
    });

    await channel.assertQueue(queueName, {
      durable: true,
    });

    await channel.bindQueue(queueName, exchangeName, routingKey);

    await channel.prefetch(1);

    console.log(`Inventory consumer listening on ${queueName}`);

    await channel.consume(
      queueName,
      async (message) => {
        if (!message) return;

        try {
          const event = JSON.parse(message.content.toString());

          if (event.event !== "PRODUCT_CREATED" || !event.productId) {
            console.error("Invalid PRODUCT_CREATED event received");
            channel.ack(message);
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

          channel.ack(message);
        } catch (error) {
          console.error("PRODUCT_CREATED processing failed:", error.message);
          channel.nack(message, false, false);
        }
      },
      {
        noAck: false,
      },
    );
  }
}

export default ProductCreatedConsumer;
