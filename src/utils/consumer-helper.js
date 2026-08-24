import { getChannel } from "../config/rabbitmq.js";
import { env } from "../config/serverConfig.js";

const DEFAULT_MAX_RETRIES = 3;
const DLX_EXCHANGE = env.DLX_EXCHANGE_NAME || "ecommerce_dlx";

/**
 * Creates and starts a resilient RabbitMQ consumer backed by:
 * 1. Dedicated Dead Letter Queue (DLQ)
 * 2. Exponential Backoff Retry mechanism with dedicated TTL-delay queues
 *
 * @param {Object} options
 * @param {string} options.queueName - Name of the primary consumer queue
 * @param {string} options.routingKey - Routing key to bind on the main exchange
 * @param {Function} options.handler - Async function processing parsed event data
 * @param {number} [options.maxRetries=3] - Maximum retry attempts before DLQ routing
 */
export async function createConsumerWithRetry({
  queueName,
  routingKey,
  handler,
  maxRetries = DEFAULT_MAX_RETRIES,
}) {
  const channel = getChannel();
  const exchangeName = env.EXCHANGE_NAME || "ecommerce_events";
  const dlqName = `${queueName}_dlq`;
  const dlqRoutingKey = `${queueName}.dead`;

  // 1. Assert Main and Dead-Letter Exchanges
  await channel.assertExchange(exchangeName, "topic", { durable: true });
  await channel.assertExchange(DLX_EXCHANGE, "topic", { durable: true });

  // 2. Assert Dedicated Dead Letter Queue (DLQ)
  await channel.assertQueue(dlqName, { durable: true });
  await channel.bindQueue(dlqName, DLX_EXCHANGE, dlqRoutingKey);

  // 3. Assert Primary Queue with Dead-Letter Exchange configuration
  await channel.assertQueue(queueName, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": DLX_EXCHANGE,
      "x-dead-letter-routing-key": dlqRoutingKey,
    },
  });

  // 4. Pre-declare all retry delay queues (1s, 2s, 4s...) to ensure immutable invariant definitions
  for (let i = 1; i <= maxRetries; i++) {
    const delayMs = Math.pow(2, i - 1) * 1000;
    const retryQueueName = `${queueName}_retry_${delayMs}ms`;
    await channel.assertQueue(retryQueueName, {
      durable: true,
      arguments: {
        "x-message-ttl": delayMs,
        "x-dead-letter-exchange": exchangeName,
        "x-dead-letter-routing-key": routingKey,
      },
    });
  }

  // 5. Bind Primary Queue to Main Topic Exchange
  await channel.bindQueue(queueName, exchangeName, routingKey);

  // 6. Fair dispatch (prefetch 1)
  await channel.prefetch(1);

  console.log(
    `[Consumer] Listening on ${queueName} (${routingKey}) [DLQ: ${dlqName}, Max Retries: ${maxRetries}]`,
  );

  // 7. Start Message Consumer
  await channel.consume(
    queueName,
    async (message) => {
      if (!message) return;

      const headers = message.properties.headers || {};
      const retryCount = Number(headers["x-retry-count"] || 0);

      try {
        const data = JSON.parse(message.content.toString());

        // Execute service business logic
        await handler(data, message);

        // Acknowledge successfully processed message
        channel.ack(message);
      } catch (error) {
        console.error(
          `[Consumer Error] Error processing ${routingKey} on ${queueName}: ${error.message}`,
        );

        if (retryCount < maxRetries) {
          const nextRetry = retryCount + 1;
          const delayMs = Math.pow(2, nextRetry - 1) * 1000;
          const retryQueueName = `${queueName}_retry_${delayMs}ms`;

          try {
            // Publish to dedicated delay queue with enriched headers
            channel.sendToQueue(retryQueueName, message.content, {
              persistent: true,
              contentType: "application/json",
              headers: {
                ...headers,
                "x-retry-count": nextRetry,
                "x-original-queue": queueName,
                "x-error-message": error.message,
                "x-retry-timestamp": new Date().toISOString(),
              },
            });

            console.warn(
              `[Retry ${nextRetry}/${maxRetries}] Message in ${queueName} scheduled for retry in ${delayMs}ms via ${retryQueueName}`,
            );

            // Acknowledge original message to prevent blocking the primary queue
            channel.ack(message);
          } catch (retryErr) {
            console.error(
              `[Retry Failure] Could not schedule retry for ${queueName}:`,
              retryErr.message,
            );
            routeToDLQ(channel, message, queueName, dlqRoutingKey, error, retryCount);
            channel.ack(message);
          }
        } else {
          // Max retries exceeded -> Route directly to Dead Letter Queue
          routeToDLQ(channel, message, queueName, dlqRoutingKey, error, retryCount);
          channel.ack(message);
        }
      }
    },
    { noAck: false },
  );
}

/**
 * Publishes failed message to DLX stamped with failure audit metadata.
 */
function routeToDLQ(channel, message, queueName, dlqRoutingKey, error, retryCount) {
  const headers = message.properties.headers || {};

  channel.publish(
    DLX_EXCHANGE,
    dlqRoutingKey,
    message.content,
    {
      persistent: true,
      contentType: "application/json",
      headers: {
        ...headers,
        "x-retry-count": retryCount,
        "x-original-queue": queueName,
        "x-error-message": error.message,
        "x-error-stack": error.stack || "",
        "x-dead-lettered-at": new Date().toISOString(),
      },
    },
  );

  console.error(
    `[DLQ ALERT] Retries exhausted for message in ${queueName}. Routed to ${queueName}_dlq with routing key ${dlqRoutingKey}`,
  );
}

export default createConsumerWithRetry;
