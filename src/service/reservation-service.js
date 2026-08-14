import ReservationRepository from "../repository/reservation-repository.js";
import ProductClient from "../clients/product-client.js";
import InventoryRepository from "../repository/inventory-repository.js";
import mongoose from "mongoose";

class ReservationService {
  constructor() {
    this.reservationRepository = new ReservationRepository();
    this.productClient = new ProductClient();
    this.inventoryRepository = new InventoryRepository();
  }

  // CREATE RESERVATION
  async createReservation(data, authorization) {
    try {
      this.validateProductId(data.productId);
      this.validateOrderId(data.orderId);
      this.validateUserId(data.userId);
      this.validateQuantity(data.quantity);

      if (!authorization) {
        throw new Error("Authorization header is required");
      }

      /*
       * 1. Validate Product
       *
       * Inventory Service does not own product information.
       * Therefore it asks Product Service.
       *
       * JWT is forwarded to Product Service.
       */
      const product = await this.productClient.getProductById(
        data.productId,
        authorization,
      );

      if (!product) {
        throw new Error("Product not found");
      }

      /*
       * 2. Check whether reservation already exists
       *
       * Prevent duplicate reservation for same order/product.
       */
      const existingReservation =
        await this.reservationRepository.findByOrderId(data.orderId);

      if (existingReservation) {
        throw new Error("Reservation already exists for this order");
      }

      /*
       * 3. Reserve physical inventory
       */
      const inventory = await this.inventoryRepository.reserveStock(
        data.productId,
        data.quantity,
      );

      if (!inventory) {
        throw new Error("Insufficient stock or inventory not found");
      }

      /*
       * 4. Create reservation record
       */
      const reservation = await this.reservationRepository.createReservation({
        productId: data.productId,
        orderId: data.orderId,
        userId: data.userId,
        quantity: data.quantity,
        status: "RESERVED",
      });

      return this.formatReservation(reservation);
    } catch (error) {
      console.error("Error creating reservation:", error);

      throw error;
    }
  }

  // GET BY RESERVATION ID
  async getReservationById(reservationId) {
    this.validateObjectId(reservationId, "Reservation ID");

    const reservation =
      await this.reservationRepository.findById(reservationId);

    if (!reservation) {
      return null;
    }

    return this.formatReservation(reservation);
  }

  // GET BY ORDER ID
  async getReservationByOrderId(orderId) {
    this.validateObjectId(orderId, "Order ID");

    const reservation = await this.reservationRepository.findByOrderId(orderId);

    if (!reservation) {
      return null;
    }

    return this.formatReservation(reservation);
  }

  // GET BY USER ID
  async getReservationsByUserId(userId) {
    this.validateObjectId(userId, "User ID");

    const reservations = await this.reservationRepository.findByUserId(userId);

    return reservations.map((reservation) =>
      this.formatReservation(reservation),
    );
  }

  // CONFIRM RESERVATION
  async confirmReservation(reservationId) {
    this.validateObjectId(reservationId, "Reservation ID");

    const reservation =
      await this.reservationRepository.findById(reservationId);

    if (!reservation) {
      throw new Error("Reservation not found");
    }

    if (reservation.status !== "RESERVED") {
      throw new Error(
        `Cannot confirm reservation with status ${reservation.status}`,
      );
    }

    const inventory = await this.inventoryRepository.confirmStock(
      reservation.productId,
      reservation.quantity,
    );

    if (!inventory) {
      throw new Error("Unable to confirm inventory stock");
    }

    const updatedReservation = await this.reservationRepository.updateStatus(
      reservationId,
      "CONFIRMED",
    );

    return this.formatReservation(updatedReservation);
  }

  // RELEASE RESERVATION
  async releaseReservation(reservationId) {
    this.validateObjectId(reservationId, "Reservation ID");

    const reservation =
      await this.reservationRepository.findById(reservationId);

    if (!reservation) {
      throw new Error("Reservation not found");
    }

    if (reservation.status !== "RESERVED") {
      throw new Error(
        `Cannot release reservation with status ${reservation.status}`,
      );
    }

    const inventory = await this.inventoryRepository.releaseStock(
      reservation.productId,
      reservation.quantity,
    );

    if (!inventory) {
      throw new Error("Unable to release reserved inventory");
    }

    const updatedReservation = await this.reservationRepository.updateStatus(
      reservationId,
      "RELEASED",
    );

    return this.formatReservation(updatedReservation);
  }

  // CANCEL RESERVATION
  async cancelReservation(reservationId) {
    this.validateObjectId(reservationId, "Reservation ID");

    const reservation =
      await this.reservationRepository.findById(reservationId);

    if (!reservation) {
      throw new Error("Reservation not found");
    }

    if (reservation.status !== "RESERVED") {
      throw new Error(
        `Cannot cancel reservation with status ${reservation.status}`,
      );
    }

    await this.inventoryRepository.releaseStock(
      reservation.productId,
      reservation.quantity,
    );

    const updatedReservation = await this.reservationRepository.updateStatus(
      reservationId,
      "CANCELLED",
    );

    return this.formatReservation(updatedReservation);
  }

  // VALIDATION
  validateProductId(productId) {
    this.validateObjectId(productId, "Product ID");
  }

  validateOrderId(orderId) {
    this.validateObjectId(orderId, "Order ID");
  }

  validateUserId(userId) {
    this.validateObjectId(userId, "User ID");
  }

  validateQuantity(quantity) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("Quantity must be a positive integer");
    }
  }

  validateObjectId(id, fieldName) {
    if (!id) {
      throw new Error(`${fieldName} is required`);
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error(`Invalid ${fieldName}`);
    }
  }

  formatReservation(reservation) {
    return {
      id: reservation._id,
      productId: reservation.productId,
      orderId: reservation.orderId,
      userId: reservation.userId,
      quantity: reservation.quantity,
      status: reservation.status,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt,
    };
  }
}

export default ReservationService;
