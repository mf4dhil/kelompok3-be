-- Apply once before deploying the iPaymu integration.
-- Keep existing manual cash/transfer payments intact and identify legacy order methods.
ALTER TABLE orders
  ADD COLUMN payment_method ENUM('cash', 'transfer', 'ipaymu') NOT NULL DEFAULT 'cash';

UPDATE orders
SET payment_method = CASE WHEN rekening_id IS NOT NULL THEN 'transfer' ELSE 'cash' END;

ALTER TABLE payments
  MODIFY COLUMN payment_method ENUM('cash', 'transfer', 'ipaymu') NOT NULL,
  ADD COLUMN payment_provider VARCHAR(30) NOT NULL DEFAULT 'manual',
  ADD COLUMN gateway_reference_id VARCHAR(100) NULL,
  ADD COLUMN gateway_transaction_id VARCHAR(100) NULL,
  ADD COLUMN gateway_session_id VARCHAR(100) NULL,
  ADD COLUMN gateway_url TEXT NULL,
  ADD COLUMN gateway_channel VARCHAR(50) NULL,
  ADD COLUMN gateway_payment_no VARCHAR(100) NULL,
  ADD COLUMN expires_at DATETIME NULL,
  ADD UNIQUE INDEX payments_gateway_reference_id_unique (gateway_reference_id);
