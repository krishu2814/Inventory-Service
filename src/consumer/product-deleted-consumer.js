import { getChannel } from "../config/rabbitmq.js";
import { env } from "../config/serverConfig.js";
import InventoryRepository from "../repository/inventory-repository.js";

class ProductDeletedConsumer {
  constructor() {
    this.inventoryRepository = new InventoryRepository();
  }

  async start() {
    const channel = getChannel();

    const exchangeName = env.EXCHANGE_NAME;
    const queueName = "inventory_product_deleted_queue";
    const routingKey = "PRODUCT_DELETED";

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

          if (event.event !== "PRODUCT_DELETED" || !event.productId) {
            console.error("Invalid PRODUCT_DELETED event received");
            channel.ack(message);
            return;
          }

          await this.inventoryRepository.deleteInventoryByProductId(
            String(event.productId),
          );

          console.log(`Deleted inventory for product ${event.productId}`);

          channel.ack(message);
        } catch (error) {
          console.error("PRODUCT_DELETED processing failed:", error.message);
          channel.nack(message, false, false);
        }
      },
      {
        noAck: false,
      },
    );
  }
}

export default ProductDeletedConsumer;
