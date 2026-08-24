import ReservationRepository from "../repository/reservation-repository.js";
import ProductClient from "../clients/product-client.js";
import OrderClient from "../clients/order-client.js";
import InventoryRepository from "../repository/inventory-repository.js";
import mongoose from "mongoose";
import { publishEvent } from "../config/rabbitmq.js";

class ReservationService {
  constructor() {
    this.reservationRepository = new ReservationRepository();
    this.productClient = new ProductClient();
    this.orderClient = new OrderClient();
    this.inventoryRepository = new InventoryRepository();
  }

  async processOrderCreatedEvent(data) {
    if (!data) {
      throw new Error("ORDER_CREATED event data is required");
    }

    this.validateOrderId(data.orderId);
    this.validateUserId(data.userId);

    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new Error("Order must contain at least one item");
    }

    const createdReservations = [];

    try {
      for (const item of data.items) {
        if (!item.productId) {
          throw new Error("Product ID is required");
        }

        const quantity = Number(item.quantity);

        this.validateProductId(item.productId);
        this.validateQuantity(quantity);

        // console.log(`Reserving ${quantity} units of ${item.productId}`);

        const reservation = await this.createReservationFromOrderEvent({
          productId: String(item.productId),
          orderId: String(data.orderId),
          userId: String(data.userId),
          quantity,
        });

        createdReservations.push(reservation);
      }

      await publishEvent("INVENTORY_RESERVED", {
        event: "INVENTORY_RESERVED",
        orderId: String(data.orderId),
        userId: String(data.userId),
        reservations: createdReservations,
        timestamp: new Date().toISOString(),
      });

      // console.log(`Inventory successfully reserved for order ${data.orderId}`);

      return createdReservations;
    } catch (error) {
      console.error(
        `Inventory reservation failed for order ${data.orderId}:`,
        error.message,
      );

      // Release reservations created during this transaction.
      for (const reservation of createdReservations) {
        try {
          await this.releaseReservation(reservation.id);

          // console.log(
          //   `Compensation successful for reservation ${reservation.id}`,
          // );
        } catch (releaseError) {
          console.error(
            `Failed to compensate reservation ${reservation.id}:`,
            releaseError.message,
          );
        }
      }

      try {
        await publishEvent("INVENTORY_FAILED", {
          event: "INVENTORY_FAILED",
          orderId: String(data.orderId),
          userId: String(data.userId),
          reason: error.message,
          timestamp: new Date().toISOString(),
        });

        // console.log(`INVENTORY_FAILED published for order ${data.orderId}`);
      } catch (publishError) {
        console.error(
          "Failed to publish INVENTORY_FAILED:",
          publishError.message,
        );

        throw publishError;
      }

      return null;
    }
  }

  async confirmReservationsByOrderId(orderId) {
    this.validateOrderId(orderId);

    const reservations =
      await this.reservationRepository.findAllByOrderId(orderId);

    if (!reservations.length) {
      throw new Error(`No reservations found for order ${orderId}`);
    }

    const confirmedReservations = [];

    for (const reservation of reservations) {
      // Idempotency
      if (reservation.status === "CONFIRMED") {
        confirmedReservations.push(this.formatReservation(reservation));
        continue;
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
        throw new Error(
          `Unable to confirm inventory for product ${reservation.productId}`,
        );
      }

      const updatedReservation = await this.reservationRepository.updateStatus(
        reservation._id,
        "CONFIRMED",
      );

      confirmedReservations.push(this.formatReservation(updatedReservation));
    }

    return confirmedReservations;
  }

  async releaseReservationsByOrderId(orderId) {
    this.validateOrderId(orderId);

    const reservations =
      await this.reservationRepository.findAllByOrderId(orderId);

    if (!reservations.length) {
      return [];
    }

    const releasedReservations = [];

    for (const reservation of reservations) {
      // Idempotency
      if (
        reservation.status === "RELEASED" ||
        reservation.status === "CANCELLED"
      ) {
        releasedReservations.push(this.formatReservation(reservation));
        continue;
      }

      if (reservation.status !== "RESERVED") {
        continue;
      }

      const inventory = await this.inventoryRepository.releaseStock(
        reservation.productId,
        reservation.quantity,
      );

      if (!inventory) {
        throw new Error(
          `Unable to release inventory for product ${reservation.productId}`,
        );
      }

      const updatedReservation = await this.reservationRepository.updateStatus(
        reservation._id,
        "RELEASED",
      );

      releasedReservations.push(this.formatReservation(updatedReservation));
    }

    return releasedReservations;
  }

  async createReservation(data, authorization) {
    this.validateReservationData(data);

    const product = await this.productClient.getProductById(
      data.productId,
      authorization,
    );

    if (!product) {
      throw new Error("Product not found");
    }

    const order = await this.orderClient.getOrderById(
      data.orderId,
      authorization,
    );

    if (!order) {
      throw new Error("Order not found");
    }

    if (String(order.userId) !== String(data.userId)) {
      throw new Error("Order does not belong to this user");
    }

    const orderItem = order.items?.find(
      (item) => String(item.productId) === String(data.productId),
    );

    if (!orderItem) {
      throw new Error("Product does not belong to this order");
    }

    if (data.quantity > orderItem.quantity) {
      throw new Error("Reservation quantity cannot exceed ordered quantity");
    }

    return this.reserveInventory(data);
  }

  async createReservationFromOrderEvent(data) {
    this.validateReservationData(data);

    return this.reserveInventory(data);
  }

  async reserveInventory(data) {
    const existingReservation =
      await this.reservationRepository.findByOrderIdAndProductId(
        data.orderId,
        data.productId,
      );

    // RabbitMQ may deliver the same ORDER_CREATED event more than once.
    if (existingReservation) {
      // console.log(
      //   `Reservation already exists for order ${data.orderId}, product ${data.productId}`,
      // );

      return this.formatReservation(existingReservation);
    }

    const inventory = await this.inventoryRepository.reserveStock(
      data.productId,
      data.quantity,
    );

    if (!inventory) {
      throw new Error(
        `Insufficient stock or inventory not found for product ${data.productId}`,
      );
    }

    try {
      const reservation = await this.reservationRepository.createReservation({
        productId: data.productId,
        orderId: data.orderId,
        userId: data.userId,
        quantity: data.quantity,
        status: "RESERVED",
      });

      return this.formatReservation(reservation);
    } catch (error) {
      // Reservation creation failed after inventory was reserved.
      await this.inventoryRepository.releaseStock(
        data.productId,
        data.quantity,
      );

      throw error;
    }
  }

  async getReservationById(reservationId) {
    this.validateObjectId(reservationId, "Reservation ID");

    const reservation =
      await this.reservationRepository.findById(reservationId);

    return reservation ? this.formatReservation(reservation) : null;
  }

  async getReservationByOrderId(orderId) {
    this.validateObjectId(orderId, "Order ID");

    const reservation = await this.reservationRepository.findByOrderId(orderId);

    return reservation ? this.formatReservation(reservation) : null;
  }

  async getReservationsByUserId(userId) {
    this.validateObjectId(userId, "User ID");

    const reservations = await this.reservationRepository.findByUserId(userId);

    return reservations.map((reservation) =>
      this.formatReservation(reservation),
    );
  }

  async confirmReservation(reservationId) {
    this.validateObjectId(reservationId, "Reservation ID");

    const reservation =
      await this.reservationRepository.findById(reservationId);

    if (!reservation) {
      throw new Error("Reservation not found");
    }

    // Idempotency
    if (reservation.status === "CONFIRMED") {
      return this.formatReservation(reservation);
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

  async releaseReservation(reservationId) {
    this.validateObjectId(reservationId, "Reservation ID");

    const reservation =
      await this.reservationRepository.findById(reservationId);

    if (!reservation) {
      throw new Error("Reservation not found");
    }

    // Idempotency
    if (reservation.status === "RELEASED") {
      return this.formatReservation(reservation);
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

  async cancelReservation(reservationId) {
    this.validateObjectId(reservationId, "Reservation ID");

    const reservation =
      await this.reservationRepository.findById(reservationId);

    if (!reservation) {
      throw new Error("Reservation not found");
    }

    // Idempotency
    if (reservation.status === "CANCELLED") {
      return this.formatReservation(reservation);
    }

    if (reservation.status !== "RESERVED") {
      throw new Error(
        `Cannot cancel reservation with status ${reservation.status}`,
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
      "CANCELLED",
    );

    return this.formatReservation(updatedReservation);
  }

  validateReservationData(data) {
    if (!data) {
      throw new Error("Reservation data is required");
    }

    this.validateProductId(data.productId);
    this.validateOrderId(data.orderId);
    this.validateUserId(data.userId);
    this.validateQuantity(data.quantity);
  }

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
