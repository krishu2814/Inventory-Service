import ReservationService from "../service/reservation-service.js";

class ReservationController {
  constructor() {
    this.reservationService = new ReservationService();
  }

  // CREATE RESERVATION
  async createReservation(req, res) {
    try {
      const reservation = await this.reservationService.createReservation(
        req.body,
        req.headers.authorization,
      );

      return res.status(201).json({
        success: true,
        message: "Reservation created successfully",
        data: reservation,
        err: {},
      });
    } catch (error) {
      console.error("Error creating reservation:", error);

      return res.status(400).json({
        success: false,
        message: error.message,
        data: {},
        err: {},
      });
    }
  }

  // GET RESERVATION BY ID
  async getReservationById(req, res) {
    try {
      const reservation = await this.reservationService.getReservationById(
        req.params.reservationId,
      );

      if (!reservation) {
        return res.status(404).json({
          success: false,
          message: "Reservation not found",
          data: {},
          err: {},
        });
      }

      return res.status(200).json({
        success: true,
        message: "Reservation fetched successfully",
        data: reservation,
        err: {},
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
        data: {},
        err: {},
      });
    }
  }

  // GET RESERVATION BY ORDER ID
  async getReservationByOrderId(req, res) {
    try {
      const reservation = await this.reservationService.getReservationByOrderId(
        req.params.orderId,
      );

      if (!reservation) {
        return res.status(404).json({
          success: false,
          message: "Reservation not found",
          data: {},
          err: {},
        });
      }

      return res.status(200).json({
        success: true,
        message: "Reservation fetched successfully",
        data: reservation,
        err: {},
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
        data: {},
        err: {},
      });
    }
  }

  // GET RESERVATIONS BY USER
  async getReservationsByUserId(req, res) {
    try {
      const reservations =
        await this.reservationService.getReservationsByUserId(
          req.params.userId,
        );

      return res.status(200).json({
        success: true,
        message: "Reservations fetched successfully",
        data: reservations,
        err: {},
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
        data: {},
        err: {},
      });
    }
  }

  // CONFIRM RESERVATION
  async confirmReservation(req, res) {
    try {
      const reservation = await this.reservationService.confirmReservation(
        req.params.reservationId,
      );

      return res.status(200).json({
        success: true,
        message: "Reservation confirmed successfully",
        data: reservation,
        err: {},
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
        data: {},
        err: {},
      });
    }
  }

  // RELEASE RESERVATION
  async releaseReservation(req, res) {
    try {
      const reservation = await this.reservationService.releaseReservation(
        req.params.reservationId,
      );

      return res.status(200).json({
        success: true,
        message: "Reservation released successfully",
        data: reservation,
        err: {},
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
        data: {},
        err: {},
      });
    }
  }

  // CANCEL RESERVATION
  async cancelReservation(req, res) {
    try {
      const reservation = await this.reservationService.cancelReservation(
        req.params.reservationId,
      );

      return res.status(200).json({
        success: true,
        message: "Reservation cancelled successfully",
        data: reservation,
        err: {},
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
        data: {},
        err: {},
      });
    }
  }
}

export default ReservationController;
