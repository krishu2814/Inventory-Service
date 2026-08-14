                         API Gateway
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
       Product Service   Order Service   Payment Service
              │               │               │
              │               │               │
              │          Reserve Stock         │
              │               │               │
              └───────────────┼───────────────┘
                              ▼
                    ┌──────────────────┐
                    │ Inventory Service│
                    │      :5016       │
                    └────────┬─────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
                Inventory        Reservations
                  Model              Model
                    │                 │
                    └────────┬────────┘
                             ▼
                          MongoDB
                             │
                             ▼
                          RabbitMQ
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
          Notifications   Analytics      Other Services

<!-- valid architecture for reserving products -->

                 Reservation Request
                         │
                         ▼
                Inventory Service
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
       Product Service         Order Service
       "Does product exist?"   "Does order exist?"
              │                     │
              ▼                     ▼
            Valid?               Valid?
              │                     │
              └──────────┬──────────┘
                         ▼
                 Validate Order Item
                         │
              Does order contain
                this product?
                         │
                         ▼
                 Check quantity
                         │
                         ▼
                  Reserve Stock
                         │
                         ▼
                  Reservation RESERVED
