import Reservation from "../model/reservation-model.js";

class ReservationRepository {
  // Create reservation
  async createReservation(data) {
    return await Reservation.create(data);
  }

  // Find reservation by reservation ID
  async findById(reservationId) {
    return await Reservation.findById(reservationId);
  }

  // Find reservation by order ID
  async findByOrderId(orderId) {
    return await Reservation.findOne({ orderId });
  }

  // Find all reservations for a user
  async findByUserId(userId) {
    return await Reservation.find({ userId }).sort({ createdAt: -1 });
  }

  // Find reservation by order + product
  async findByOrderIdAndProductId(orderId, productId) {
    return await Reservation.findOne({
      orderId,
      productId,
    });
  }

  // Update reservation
  async updateReservation(reservationId, data) {
    return await Reservation.findByIdAndUpdate(reservationId, data, {
      new: true,
      runValidators: true,
    });
  }

  // Update reservation status
  async updateStatus(reservationId, status) {
    return await Reservation.findByIdAndUpdate(
      reservationId,
      { status },
      {
        new: true,
        runValidators: true,
      },
    );
  }
}

export default ReservationRepository;
