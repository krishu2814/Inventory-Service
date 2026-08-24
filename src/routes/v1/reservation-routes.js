import express from "express";
import ReservationController from "../../controller/reservation-controller.js";

const router = express.Router();

const reservationController = new ReservationController();

// Create reservation
router.post(
  "/",
  reservationController.createReservation.bind(reservationController),
);

// Get reservation by reservation ID
router.get(
  "/:reservationId",
  reservationController.getReservationById.bind(reservationController),
);

// Get reservation by order ID
router.get(
  "/order/:orderId",
  reservationController.getReservationByOrderId.bind(reservationController),
);

// Get all reservations for a user
router.get(
  "/user/:userId",
  reservationController.getReservationsByUserId.bind(reservationController),
);

// Confirm reservation
router.post(
  "/:reservationId/confirm",
  reservationController.confirmReservation.bind(reservationController),
);

// Release reservation
router.post(
  "/:reservationId/release",
  reservationController.releaseReservation.bind(reservationController),
);

// Cancel reservation
router.post(
  "/:reservationId/cancel",
  reservationController.cancelReservation.bind(reservationController),
);

// Cleanup expired reservations
router.post(
  "/cleanup-expired",
  reservationController.cleanupExpiredReservations.bind(reservationController),
);

export default router;
