import { getChannel } from "../config/rabbitmq.js";
import { env } from "../config/serverConfig.js";
import ReservationService from "../service/reservation-service.js";

class OrderConsumer {
  constructor() {
    this.reservationService = new ReservationService();
  }

  async start() {
    const channel = getChannel();

    const exchangeName = env.EXCHANGE_NAME;
    const queueName = "inventory_order_queue";
    const routingKey = "ORDER_CREATED";

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

          if (
            event.event !== "ORDER_CREATED" ||
            !event.orderId ||
            !event.userId ||
            !Array.isArray(event.items) ||
            event.items.length === 0
          ) {
            console.error("Invalid ORDER_CREATED event");

            channel.ack(message);
            return;
          }

          /*
           * ReservationService handles:
           *
           * 1. Reserving all products
           * 2. Rolling back successful reservations
           *    if any product fails
           * 3. Publishing INVENTORY_RESERVED
           * 4. Publishing INVENTORY_FAILED
           */
          await this.reservationService.processOrderCreatedEvent(event);

          /*
           * The service has already handled the failure
           * and published INVENTORY_FAILED when necessary.
           *
           * Therefore we ACK the original event.
           */
          channel.ack(message);

          // console.log(`ORDER_CREATED processed successfully: ${event.orderId}`);
        } catch (error) {
          /*
           * This means the event itself could not be processed
           * or the failure event could not be published.
           *
           * Nack without requeue for now.
           *
           * Later this should be replaced with a DLQ.
           */
          console.error(`ORDER_CREATED processing failed:`, error.message);

          channel.nack(message, false, false);
        }
      },
      {
        noAck: false,
      },
    );
  }
}

export default OrderConsumer;
