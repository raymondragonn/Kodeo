ALTER TABLE orders
  ADD COLUMN stripe_payment_intent_id VARCHAR(255) NULL AFTER delivery_date,
  ADD UNIQUE KEY uq_orders_payment_intent (stripe_payment_intent_id);
