import Reservation from "../model/reservation-model.js";

class ReservationRepository {
  async createReservation(data) {
    return await Reservation.create(data);
  }

  async findById(reservationId) {
    return await Reservation.findById(reservationId);
  }

  async findByOrderId(orderId) {
    return await Reservation.findOne({ orderId });
  }

  async findAllByOrderId(orderId) {
    return await Reservation.find({ orderId });
  }

  async findByUserId(userId) {
    return await Reservation.find({ userId }).sort({ createdAt: -1 });
  }

  async findByOrderIdAndProductId(orderId, productId) {
    return await Reservation.findOne({
      orderId,
      productId,
    });
  }

  async updateReservation(reservationId, data) {
    return await Reservation.findByIdAndUpdate(
      reservationId,
      data,
      {
        returnDocument: "after",
        runValidators: true,
      },
    );
  }

  async updateStatus(reservationId, status) {
    return await Reservation.findByIdAndUpdate(
      reservationId,
      { status },
      {
        returnDocument: "after",
        runValidators: true,
      },
    );
  }

  async findExpiredReservations(olderThanDate) {
    return await Reservation.find({
      status: "RESERVED",
      createdAt: { $lt: olderThanDate },
    });
  }
}

export default ReservationRepository;