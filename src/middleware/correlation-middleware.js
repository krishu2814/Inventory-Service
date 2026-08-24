import crypto from "crypto";

export default function correlationMiddleware(req, res, next) {
  const correlationId =
    req.headers["x-correlation-id"] ||
    req.headers["x-request-id"] ||
    `corr_${crypto.randomUUID()}`;

  req.correlationId = correlationId;
  res.setHeader("X-Correlation-ID", correlationId);

  console.log(`[${correlationId}] [Inventory-Service] ${req.method} ${req.originalUrl}`);

  next();
}
