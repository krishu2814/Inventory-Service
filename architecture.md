## High-Level Architecture

```text
                              API Gateway
                                   │
             ┌─────────────────────┼─────────────────────┐
             │                     │                     │
             ▼                     ▼                     ▼
      Product Service        Order Service        Payment Service
             │                     │                     │
             │                     │                     │
             │                     │ ORDER_CREATED      │
             │                     └──────────┐          │
             │                                │          │
             │                                ▼          │
             │                       ┌──────────────────┐ │
             │                       │ Inventory Service │ │
             │                       │      :5016        │ │
             │                       └────────┬─────────┘ │
             │                                │           │
             │                    ┌───────────┴──────────┐│
             │                    │                      ││
             │                    ▼                      ▼│
             │              Inventory Model       Reservation Model
             │                    │                      │
             │                    └──────────┬───────────┘
             │                               │
             │                               ▼
             │                           MongoDB
             │
             └──────────────────────────────────────────────┐
                                                            │
                                                            ▼
                                                     RabbitMQ
                                                  ecommerce_events
                                                            │
                              ┌─────────────────────────────┼──────────────────────────┐
                              │                             │                          │
                              ▼                             ▼                          ▼
                       Inventory Service              Order Service              Cart Service
                              │                             │                          │
                              ▼                             ▼                          ▼
                         Reservations                 Order State                 Cart Cleanup
```
