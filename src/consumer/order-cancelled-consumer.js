import { createConsumerWithRetry } from "../utils/consumer-helper.js";
import ReservationService from "../service/reservation-service.js";

class OrderCancelledConsumer {
  constructor() {
    this.reservationService = new ReservationService();
  }

  async start() {
    await createConsumerWithRetry({
      queueName: "inventory_order_cancelled_queue",
      routingKey: "ORDER_CANCELLED",
      handler: async (event) => {
        if (event.event !== "ORDER_CANCELLED" || !event.orderId) {
          console.error("Invalid ORDER_CANCELLED event received:", event);
          return;
        }

        /*
         * Release RESERVED inventory back into available stock.
         */
        await this.reservationService.releaseReservationsByOrderId(
          String(event.orderId),
        );
      },
    });
  }
}

export default OrderCancelledConsumer;
