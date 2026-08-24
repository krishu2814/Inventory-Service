import { getChannel } from "../config/rabbitmq.js";
import { env } from "../config/serverConfig.js";
import ReservationService from "../service/reservation-service.js";

class OrderCancelledConsumer {
  constructor() {
    this.reservationService = new ReservationService();
  }

  async start() {
    const channel = getChannel();

    const exchangeName = env.EXCHANGE_NAME;
    const queueName = "inventory_order_cancelled_queue";
    const routingKey = "ORDER_CANCELLED";

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

          if (event.event !== "ORDER_CANCELLED" || !event.orderId) {
            console.error("Invalid ORDER_CANCELLED event received");
            channel.ack(message);
            return;
          }

          /*
           * Release RESERVED inventory back into available stock.
           */
          await this.reservationService.releaseReservationsByOrderId(
            String(event.orderId),
          );

          channel.ack(message);
        } catch (error) {
          console.error("ORDER_CANCELLED processing failed:", error.message);

          /*
           * Do not requeue indefinitely.
           */
          channel.nack(message, false, false);
        }
      },
      {
        noAck: false,
      },
    );
  }
}

export default OrderCancelledConsumer;
