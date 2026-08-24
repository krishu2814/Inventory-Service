import { createConsumerWithRetry } from "../utils/consumer-helper.js";
import ReservationService from "../service/reservation-service.js";

class OrderConsumer {
  constructor() {
    this.reservationService = new ReservationService();
  }

  async start() {
    await createConsumerWithRetry({
      queueName: "inventory_order_queue",
      routingKey: "ORDER_CREATED",
      handler: async (event) => {
        if (
          event.event !== "ORDER_CREATED" ||
          !event.orderId ||
          !event.userId ||
          !Array.isArray(event.items) ||
          event.items.length === 0
        ) {
          console.error("Invalid ORDER_CREATED event:", event);
          return;
        }

        /*
         * ReservationService handles:
         * 1. Reserving all products atomically ($expr)
         * 2. Rolling back successful reservations if any product fails
         * 3. Publishing INVENTORY_RESERVED
         * 4. Publishing INVENTORY_FAILED
         */
        await this.reservationService.processOrderCreatedEvent(event);
      },
    });
  }
}

export default OrderConsumer;
