-- Apply once before deploying the backend that supports order status `confirmed`.
ALTER TABLE orders
  MODIFY COLUMN status ENUM('pending', 'confirmed', 'processing', 'ready', 'completed', 'cancelled')
  NOT NULL DEFAULT 'pending';
