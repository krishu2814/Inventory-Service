import { createConsumerWithRetry } from "../utils/consumer-helper.js";
import ReservationService from "../service/reservation-service.js";

class PaymentFailedConsumer {
  constructor() {
    this.reservationService = new ReservationService();
  }

  async start() {
    await createConsumerWithRetry({
      queueName: "inventory_payment_failed_queue",
      routingKey: "PAYMENT_FAILED",
      handler: async (event) => {
        if (event.event !== "PAYMENT_FAILED" || !event.orderId) {
          console.error("Invalid PAYMENT_FAILED event received:", event);
          return;
        }

        console.log(
          `[Inventory] Received PAYMENT_FAILED for order: ${event.orderId}. Compensating reservations...`,
        );

        /*
         * Release RESERVED inventory back into available stock.
         */
        await this.reservationService.releaseReservationsByOrderId(
          String(event.orderId),
        );

        console.log(
          `[Inventory] Compensated and released stock for order ${event.orderId}`,
        );
      },
    });
  }
}

export default PaymentFailedConsumer;
