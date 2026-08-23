import { getChannel } from "../config/rabbitmq.js";
import { env } from "../config/serverConfig.js";
import ReservationService from "../service/reservation-service.js";

class OrderConfirmedConsumer {
  constructor() {
    this.reservationService = new ReservationService();
  }

  async start() {
    const channel = getChannel();

    const exchangeName = env.EXCHANGE_NAME;
    const queueName = "inventory_order_confirmed_queue";
    const routingKey = "ORDER_CONFIRMED";

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

          // console.log(`Received ${routingKey}: ${event.orderId}`);

          if (event.event !== "ORDER_CONFIRMED" || !event.orderId) {
            console.error("Invalid ORDER_CONFIRMED event");

            channel.ack(message);
            return;
          }

          /*
           * Convert RESERVED inventory into
           * permanently CONFIRMED inventory.
           */
          await this.reservationService.confirmReservationsByOrderId(
            String(event.orderId),
          );

          channel.ack(message);

          // console.log(
          //   `ORDER_CONFIRMED processed successfully: ${event.orderId}`,
          // );
        } catch (error) {
          console.error("ORDER_CONFIRMED processing failed:", error.message);

          /*
           * Do not requeue indefinitely.
           *
           * Later:
           * add DLQ/retry strategy.
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

export default OrderConfirmedConsumer;
