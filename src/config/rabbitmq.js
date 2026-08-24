import amqp from "amqplib";
import { env } from "./serverConfig.js";

let connection;
let channel;

export async function connectRabbitMQ() {
  try {
    connection = await amqp.connect(env.RABBITMQ_URL);

    channel = await connection.createChannel();

    await channel.assertExchange(env.EXCHANGE_NAME, "topic", {
      durable: true,
    });

    console.log("Connected to RabbitMQ successfully");
    console.log(`Exchange: ${env.EXCHANGE_NAME}`);

    connection.on("error", (error) => {
      console.error("RabbitMQ connection error:", error);
    });

    connection.on("close", () => {
      console.error("RabbitMQ connection closed");
    });

    return channel;
  } catch (error) {
    console.error("Failed to connect to RabbitMQ:", error.message);

    throw error;
  }
}

export function getChannel() {
  if (!channel) {
    throw new Error("RabbitMQ channel is not initialized");
  }

  return channel;
}

import crypto from "crypto";

export async function publishEvent(routingKey, data, options = {}) {
  const rabbitChannel = getChannel();

  if (!routingKey || typeof routingKey !== "string") {
    throw new Error(`Invalid routing key: ${routingKey}`);
  }

  const correlationId =
    options.correlationId ||
    data.correlationId ||
    `amqp_${crypto.randomUUID()}`;

  data.correlationId = correlationId;

  rabbitChannel.publish(
    env.EXCHANGE_NAME,
    routingKey,
    Buffer.from(JSON.stringify(data)),
    {
      persistent: true,
      contentType: "application/json",
      correlationId,
      headers: {
        "x-correlation-id": correlationId,
        ...(options.headers || {}),
      },
    },
  );

  console.log(`[${correlationId}] [Inventory-Service] Event published: ${routingKey}`);
}

export async function closeRabbitMQ() {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }

    if (connection) {
      await connection.close();
      connection = null;
    }

    console.log("RabbitMQ connection closed");
  } catch (error) {
    console.error("Error closing RabbitMQ:", error.message);
  }
}
