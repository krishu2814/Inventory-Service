import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      index: true,
    },

    orderId: {
      type: String,
      required: true,
      index: true,
    },

    userId: {
      type: String,
      required: true,
      index: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    status: {
      type: String,
      enum: ["RESERVED", "CONFIRMED", "RELEASED", "CANCELLED"],
      default: "RESERVED",
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

reservationSchema.index(
  {
    orderId: 1,
    productId: 1,
  },
  {
    unique: true,
    name: "unique_order_product_reservation",
  },
);

const Reservation = mongoose.model("Reservation", reservationSchema);

export default Reservation;
