import { createConsumerWithRetry } from "../utils/consumer-helper.js";
import ReservationService from "../service/reservation-service.js";

class OrderConfirmedConsumer {
  constructor() {
    this.reservationService = new ReservationService();
  }

  async start() {
    await createConsumerWithRetry({
      queueName: "inventory_order_confirmed_queue",
      routingKey: "ORDER_CONFIRMED",
      handler: async (event) => {
        if (event.event !== "ORDER_CONFIRMED" || !event.orderId) {
          console.error("Invalid ORDER_CONFIRMED event:", event);
          return;
        }

        /*
         * Convert RESERVED inventory into permanently CONFIRMED inventory.
         */
        await this.reservationService.confirmReservationsByOrderId(
          String(event.orderId),
        );
      },
    });
  }
}

export default OrderConfirmedConsumer;
