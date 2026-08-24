import { getChannel } from "../config/rabbitmq.js";
import { env } from "../config/serverConfig.js";
import ReservationService from "../service/reservation-service.js";

class PaymentFailedConsumer {
  constructor() {
    this.reservationService = new ReservationService();
  }

  async start() {
    const channel = getChannel();

    const exchangeName = env.EXCHANGE_NAME;
    const queueName = "inventory_payment_failed_queue";
    const routingKey = "PAYMENT_FAILED";

    await channel.assertExchange(exchangeName, "topic", {
      durable: true,
    });

    await channel.assertQueue(queueName, {
      durable: true,
    });

    await channel.bindQueue(queueName, exchangeName, routingKey);

    await channel.prefetch(1);

    console.log(`Inventory consumer listening on ${queueName} with key ${routingKey}`);

    await channel.consume(
      queueName,
      async (message) => {
        if (!message) return;

        try {
          const event = JSON.parse(message.content.toString());

          if (event.event !== "PAYMENT_FAILED" || !event.orderId) {
            console.error("Invalid PAYMENT_FAILED event received");
            channel.ack(message);
            return;
          }

          console.log(`[Inventory] Received PAYMENT_FAILED for order: ${event.orderId}. Compensating reservations...`);

          /*
           * Release RESERVED inventory back into available stock.
           */
          await this.reservationService.releaseReservationsByOrderId(
            String(event.orderId),
          );

          console.log(`[Inventory] Compensated and released stock for order ${event.orderId}`);

          channel.ack(message);
        } catch (error) {
          console.error("PAYMENT_FAILED processing in Inventory Service failed:", error.message);

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

export default PaymentFailedConsumer;
