Here is the complete Markdown code for your `README.md` file. You can copy the entire block below and paste it directly into your GitHub repository.

```markdown
# 📦 Inventory Service

A production-inspired **Inventory Service** for an E-Commerce Microservices Platform built using **Node.js, Express.js, MongoDB, Mongoose, RabbitMQ, and Microservices Architecture**.

The Inventory Service is responsible for managing physical stock, reserving inventory when an order is created, releasing reservations when an order/payment fails, and confirming reservations after successful payment.

---

## 🏗️ Inventory Service Architecture

```text
                         ┌──────────────────────┐
                         │      API Gateway     │
                         └──────────┬───────────┘
                                    │
                                    │ HTTP
                                    ▼
                    ┌──────────────────────────────┐
                    │      Inventory Service       │
                    │                              │
                    │  ┌────────────────────────┐  │
                    │  │       Routes           │  │
                    │  └────────────┬───────────┘  │
                    │               ▼              │
                    │  ┌────────────────────────┐  │
                    │  │     Controllers        │  │
                    │  └────────────┬───────────┘  │
                    │               ▼              │
                    │  ┌────────────────────────┐  │
                    │  │       Services         │  │
                    │  └────────────┬───────────┘  │
                    │               ▼              │
                    │  ┌────────────────────────┐  │
                    │  │     Repositories       │  │
                    │  └────────────┬───────────┘  │
                    │               ▼              │
                    │        ┌────────────┐        │
                    │        │  MongoDB   │        │
                    │        └────────────┘        │
                    └──────────────────────────────┘
                              ▲
                              │
                         RabbitMQ Events
                              │
                              │ ORDER_CREATED
                              │
                    ┌─────────┴──────────┐
                    │    Order Service   │
                    └────────────────────┘
```

## 🚀 Responsibilities

The Inventory Service owns all inventory-related operations.

**Core Responsibilities:**
* Create inventory for products
* Check available stock
* Reserve stock
* Release reserved stock
* Confirm reserved stock
* Increase physical stock
* Maintain reservation records
* Prevent duplicate reservations
* Atomically update stock
* Consume `ORDER_CREATED` events
* Communicate with Product Service
* Communicate with Order Service
* Maintain inventory consistency

---

## 🔄 Complete Inventory Flow

### 1. Order Creation
```text
Customer
   │
   ▼
API Gateway
   │
   ▼
Order Service
   │
   ├── Validate Cart
   ├── Validate Products
   ├── Create Order (status = PENDING)
   │
   └── Publish ORDER_CREATED
           │
           ▼
       RabbitMQ
           │
           ▼
   Inventory Service
```

### 2. ORDER_CREATED Event
Order Service publishes:
```json
{
  "event": "ORDER_CREATED",
  "orderId": "6a85ebbe22e1a12362038a96",
  "userId": "6a85ddcb0a2dbcc65403b621",
  "amount": 20366,
  "items": [
    {
      "productId": "6a85ddede284bfffbb8528bf",
      "name": "Theragun PRO Gen 5 Percussive Massage Gun",
      "quantity": 34,
      "price": 599
    }
  ]
}
```
RabbitMQ delivers this event to the Inventory Service.

### 📨 RabbitMQ Consumer Flow
```text
                 RabbitMQ
                    │ (ORDER_CREATED)
                    ▼
        ┌──────────────────────────┐
        │ Inventory Consumer       │
        └────────────┬─────────────┘
                     │
                     ▼
        Parse ORDER_CREATED event
                     │
                     ▼
        Validate event structure
                     │
                     ▼
        For each order item
                     │
                     ▼
        createReservationFromOrderEvent()
                     │
                     ▼
        Check duplicate reservation
                     │
                     ▼
        Reserve Inventory Atomically
                     │
                     ▼
        Create Reservation Record
                     │
                     ▼
                 ACK Message
```

---

## 📦 Inventory Model

The Inventory collection represents the physical stock owned by the Inventory Service.

```json
{
  "productId": "String",
  "quantity": "Number",
  "reservedQuantity": "Number",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

**Example:**
```json
{
  "productId": "6a85ddede284bfffbb8528bf",
  "quantity": 147,
  "reservedQuantity": 34
}
```
*Available stock:* `quantity - reservedQuantity = 147 - 34 = 113`

---

## 🧾 Reservation Model

Reservations represent stock temporarily locked for an order.

```json
{
  "productId": "String",
  "orderId": "String",
  "userId": "String",
  "quantity": "Number",
  "status": "String",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

**Possible reservation states:**
```text
RESERVED
    │
    ├──────────────► CONFIRMED
    │
    ├──────────────► RELEASED
    │
    └──────────────► CANCELLED
```

---

## 🔐 Reservation Lifecycle

### RESERVED
When an order is created:
* **Before:** Physical Stock = 147, Reserved = 0, Available = 147
* **Customer orders:** Quantity = 34
* **After reservation:** Physical Stock = 147, Reserved = 34, Available = 113
*(The physical stock has NOT been removed yet. It has only been locked.)*

### CONFIRMED
After successful payment:
* **Before:** quantity = 147, reservedQuantity = 34
* **After:** quantity = 113, reservedQuantity = 0
*(The reserved stock becomes sold stock.)*

### RELEASED
If payment fails:
* **Before:** quantity = 147, reservedQuantity = 34
* **After:** quantity = 147, reservedQuantity = 0
*(The stock becomes available again.)*

---

## ⚡ Atomic Stock Reservation

Inventory reservation is performed atomically to prevent overselling.

```javascript
await Inventory.findOneAndUpdate(
  {
    productId,
    $expr: {
      $gte: [
        { $subtract: ["$quantity", "$reservedQuantity"] },
        quantity,
      ],
    },
  },
  {
    $inc: { reservedQuantity: quantity },
  },
  { new: true }
);
```
The condition ensures `quantity - reservedQuantity >= requestedQuantity`. Concurrent requests cannot reserve stock beyond the available quantity.

---

## 🛡️ Idempotency

RabbitMQ can deliver messages more than once. Therefore, the Inventory Service checks `orderId + productId` before creating a reservation.

```javascript
const existingReservation = await this.reservationRepository.findByOrderIdAndProductId(
  data.orderId,
  data.productId
);
```

This prevents duplicate reservations on multiple event deliveries. Duplicate events return the existing reservation instead of reserving stock twice.

---

## 🧩 Service Architecture

```bash
src/
├── clients/
│   ├── order-client.js
│   └── product-client.js
├── config/
│   ├── database.js
│   ├── rabbitmq.js
│   └── serverConfig.js
├── consumer/
│   └── order-consumer.js
├── controller/
│   ├── inventory-controller.js
│   └── reservation-controller.js
├── model/
│   ├── inventory-model.js
│   └── reservation-model.js
├── repository/
│   ├── inventory-repository.js
│   └── reservation-repository.js
├── routes/
│   ├── index.js
│   └── v1/
│       ├── index.js
│       └── reservation-routes.js
├── service/
│   ├── inventory-service.js
│   └── reservation-service.js
└── index.js
```

---

## 🧱 Layer Responsibilities

* **Routes:** HTTP Endpoints (e.g., `POST /api/v1/inventory/:productId/reserve`) mapped to Controllers.
* **Controllers:** HTTP request handling, reading params/body, calling services, returning HTTP responses. (No business logic).
* **Services:** Business logic, validation, calling repositories, and handling workflows (Inventory & Reservation lifecycle).
* **Repositories:** Database access and MongoDB/Mongoose operations.
* **Models:** Define MongoDB schemas.

---

## 🔌 Inter-Service Communication

### REST (Synchronous)
Used for synchronous validation.
* **Product Service:** Verify product exists (`productClient.getProductById(productId)`)
* **Order Service:** Verify order info (`orderClient.getOrderById(orderId)`)

### RabbitMQ (Asynchronous)
Used for loosely coupled event-driven communication.
```text
Order Service ──(Publish Event)──► RabbitMQ ──► Inventory Service
```

---

## 📊 Inventory State Machine

```text
                 ORDER_CREATED
                      │
                      ▼
                 ┌─────────┐
                 │ RESERVED│
                 └────┬────┘
                      │
             ┌────────┴────────┐
             │                 │
             ▼                 ▼
        PAYMENT SUCCESS    PAYMENT FAILED
             │                 │
             ▼                 ▼
        ┌───────────┐      ┌─────────┐
        │ CONFIRMED │      │ RELEASED│
        └───────────┘      └─────────┘
```

---

## 🌐 REST API Endpoints

### Inventory APIs

* **Create Inventory:** `POST /api/v1/inventory`
* **Get Inventory:** `GET /api/v1/inventory/:productId`
* **Reserve Stock:** `POST /api/v1/inventory/:productId/reserve`
* **Release Stock:** `POST /api/v1/inventory/:productId/release`
* **Confirm Stock:** `POST /api/v1/inventory/:productId/confirm`
* **Increase Stock:** `PATCH /api/v1/inventory/:productId/stock`

### Reservation APIs

* **Create Reservation:** `POST /api/v1/reservations`
* **Get Reservation:** `GET /api/v1/reservations/:reservationId`
* **Get Reservation By Order:** `GET /api/v1/reservations/order/:orderId`
* **Get User Reservations:** `GET /api/v1/reservations/user/:userId`
* **Confirm Reservation:** `POST /api/v1/reservations/:reservationId/confirm`
* **Release Reservation:** `POST /api/v1/reservations/:reservationId/release`
* **Cancel Reservation:** `POST /api/v1/reservations/:reservationId/cancel`

---

## 🗄️ Database Design

**Inventory Collection**
```javascript
{
  _id: ObjectId,
  productId: { type: String, required: true, unique: true, index: true },
  quantity: Number,
  reservedQuantity: Number,
  createdAt: Date,
  updatedAt: Date
}
```

**Reservation Collection**
```javascript
{
  _id: ObjectId,
  productId: String,
  orderId: String,
  userId: String,
  quantity: Number,
  status: String,
  createdAt: Date,
  updatedAt: Date
}
```
*Compound Unique Index:* Ensures one reservation per `Order + Product`.
```javascript
reservationSchema.index({ orderId: 1, productId: 1 }, { unique: true });
```

---

## 🛠️ Tech Stack

* **Runtime:** Node.js
* **Framework:** Express.js
* **Language:** JavaScript (ES Modules)
* **Database:** MongoDB, Mongoose
* **Messaging:** RabbitMQ, AMQP, amqplib
* **HTTP Communication:** Axios
* **Architecture:** Microservices, Repository Pattern, Service Layer Pattern, Event-Driven, API Gateway Pattern
* **Tools:** Nodemon, Postman, MongoDB Compass, RabbitMQ Management UI, Git, GitHub

---

## 🔐 Data Consistency & Scalability

* **Atomic MongoDB Updates:** Ensures safe updates for reserving/releasing stock.
* **Compensation:** If reservation creation fails after inventory reservation, the inventory is automatically released.
* **Scalability:** Multiple Inventory instances can run concurrently, as RabbitMQ distributes messages across consumers while MongoDB acts as the single source of truth.

---

## 🚀 Future Improvements

* **RabbitMQ:** Retry Queue, Dead Letter Queue, Exponential Backoff, Publisher Confirms
* **Inventory:** Reservation expiration/timeout, distributed locking, multi-location inventory, low-stock alerts
* **Infrastructure:** Docker, Kubernetes, Redis, Prometheus, Grafana
* **Reliability:** Transactional Outbox Pattern, Saga Pattern, Circuit Breaker

---

## 👨‍💻 Author

**Krishu Kumar**
* GitHub: [krishu2814](https://github.com/krishu2814)
* Email: [krishukumarsingh06@gmail.com](mailto:krishukumarsingh06@gmail.com)

```