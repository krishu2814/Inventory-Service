                    Order Service
                         │
                         │
                         │ ORDER_CREATED
                         ▼
                 ┌───────────────┐
                 │    RabbitMQ   │
                 │ecommerce_events│
                 └───────┬───────┘
                         │
                         │ routing key:
                         │ ORDER_CREATED
                         ▼
          inventory_order_queue
                         │
                         ▼
                  OrderConsumer
                         │
                         ▼
              ReservationService
                         │
                         ▼
                reserveInventory()
                         │
                         ▼
                 InventoryRepository
                         │
                         ▼
                 Reserve Stock
                         │
                         ▼
                  Create Reservation
                         │
                         ▼
                     RESERVED
