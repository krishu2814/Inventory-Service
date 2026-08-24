import ReservationService from "../service/reservation-service.js";

class ReservationExpiryJob {
  constructor(intervalMs = 60000, maxAgeMinutes = 15) {
    this.reservationService = new ReservationService();
    this.intervalMs = intervalMs;
    this.maxAgeMinutes =
      Number(process.env.RESERVATION_EXPIRY_MINUTES) || maxAgeMinutes;
    this.timer = null;
    this.isRunning = false;
  }

  start() {
    console.log(
      `[Inventory] Starting Reservation Expiry Job (interval: ${this.intervalMs / 1000}s, TTL: ${this.maxAgeMinutes}m)`,
    );

    this.timer = setInterval(async () => {
      if (this.isRunning) return;
      this.isRunning = true;

      try {
        const result =
          await this.reservationService.cleanupExpiredReservations(
            this.maxAgeMinutes,
          );
        if (result.expiredCount > 0) {
          console.log(
            `[Inventory] Periodic cleanup released ${result.expiredCount} expired reservation(s).`,
          );
        }
      } catch (err) {
        console.error(
          "[Inventory] Error during reservation expiry check:",
          err.message,
        );
      } finally {
        this.isRunning = false;
      }
    }, this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log("[Inventory] Stopped Reservation Expiry Job.");
    }
  }
}

export default ReservationExpiryJob;
