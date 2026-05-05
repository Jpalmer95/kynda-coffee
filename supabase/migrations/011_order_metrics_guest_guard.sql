-- Existing customer metrics trigger assumed every order has customer_id/profile_id.
-- QR walk-up orders can be guest orders with customer_id NULL, so skip metrics
-- until a profile/customer is attached.

CREATE OR REPLACE FUNCTION public.update_customer_metrics_on_order()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO customer_metrics (profile_id, lifetime_value_cents, total_orders, first_visit_at, last_visit_at)
  SELECT
    NEW.customer_id,
    NEW.total_cents,
    1,
    NEW.created_at,
    NEW.created_at
  ON CONFLICT (profile_id) DO UPDATE SET
    lifetime_value_cents = customer_metrics.lifetime_value_cents + NEW.total_cents,
    total_orders = customer_metrics.total_orders + 1,
    last_visit_at = NEW.created_at,
    days_since_last_visit = 0,
    average_ticket_cents = (customer_metrics.lifetime_value_cents + NEW.total_cents) / NULLIF(customer_metrics.total_orders + 1, 0),
    segment = CASE
      WHEN customer_metrics.total_orders + 1 >= 10 THEN 'vip'
      WHEN customer_metrics.total_orders + 1 >= 3 THEN 'regular'
      ELSE 'new'
    END,
    updated_at = NOW();
  RETURN NEW;
END;
$function$;
