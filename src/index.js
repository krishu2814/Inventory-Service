import express from "express";
import { env } from "./config/serverConfig.js";
import connectDB from "./config/database.js";
import apiRoutes from "./routes/index.js";
import { connectRabbitMQ } from "./config/rabbitmq.js";
import OrderConsumer from "./consumer/order-consumer.js";
import OrderConfirmedConsumer from "./consumer/order-confirmed-consumer.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use("/api", apiRoutes);

const setUpAndStartServer = async () => {
  await connectDB();

  // Connect RabbitMQ
  await connectRabbitMQ();

  // Start ORDER_CREATED consumer
  const orderConsumer = new OrderConsumer();
  await orderConsumer.start();

  // Start ORDER_CONFIRMED consumer
  const orderConfirmedConsumer = new OrderConfirmedConsumer();
  await orderConfirmedConsumer.start();

  app.listen(env.PORT, () => {
    console.log(`Server is running on port ${env.PORT}`);
  });
};

// Handle startup errors
setUpAndStartServer().catch((error) => {
  console.error("Failed to start Inventory Service:", error);
  process.exit(1);
});