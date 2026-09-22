CREATE TABLE IF NOT EXISTS commerce_inventory (
 id uuid PRIMARY KEY, product_id text NOT NULL, email_hash text NOT NULL UNIQUE,
 credentials text NOT NULL, purchase_cost integer NOT NULL DEFAULT 0 CHECK(purchase_cost>=0), state text NOT NULL DEFAULT 'available'
 CHECK (state IN ('available','reserved','delivered','quarantined','withdrawn')), created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE commerce_inventory ADD COLUMN IF NOT EXISTS purchase_cost integer NOT NULL DEFAULT 0 CHECK(purchase_cost>=0);
ALTER TABLE commerce_inventory DROP CONSTRAINT IF EXISTS commerce_inventory_state_check;
ALTER TABLE commerce_inventory ADD CONSTRAINT commerce_inventory_state_check CHECK (state IN ('available','reserved','delivered','quarantined','withdrawn'));
CREATE TABLE IF NOT EXISTS commerce_orders (
 id uuid PRIMARY KEY, product_id text NOT NULL, amount integer NOT NULL CHECK(amount>=0), listed_amount integer NOT NULL DEFAULT 0 CHECK(listed_amount>=0),
 customer_email text,
 recovery_hash text NOT NULL, session_hash text NOT NULL, inventory_id uuid REFERENCES commerce_inventory(id),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','review','delivered','expired','cancelled')),
 transaction_id text, payer_name text, source_last4 text, payment_submitted_at timestamptz, ip_address text,
 payment_method text NOT NULL DEFAULT 'wallet' CHECK(payment_method IN ('wallet','bank','binance','crypto')),
 payment_currency text NOT NULL DEFAULT 'PKR' CHECK(payment_currency IN ('PKR','USDT')),
 payment_amount numeric(20,8) NOT NULL DEFAULT 0 CHECK(payment_amount>=0),
 commission_code text, commission_rate numeric(5,2) NOT NULL DEFAULT 0 CHECK(commission_rate>=0 AND commission_rate<=100),
 commission_amount integer NOT NULL DEFAULT 0 CHECK(commission_amount>=0),
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '5 minutes', delivered_at timestamptz
);
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS payment_submitted_at timestamptz;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS ip_address text;
CREATE TABLE IF NOT EXISTS commerce_payment_claim_attempts (
 ip_hash text PRIMARY KEY, ip_address text NOT NULL, attempts integer NOT NULL DEFAULT 0,
 last_attempt_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'wallet';
ALTER TABLE commerce_orders DROP CONSTRAINT IF EXISTS commerce_orders_payment_method_check;
ALTER TABLE commerce_orders ADD CONSTRAINT commerce_orders_payment_method_check CHECK(payment_method IN ('wallet','bank','binance','crypto'));
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS payment_currency text NOT NULL DEFAULT 'PKR';
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS payment_amount numeric(20,8) NOT NULL DEFAULT 0;
UPDATE commerce_orders SET payment_amount=amount WHERE payment_amount=0 AND amount>0;
ALTER TABLE commerce_orders DROP CONSTRAINT IF EXISTS commerce_orders_payment_currency_check;
ALTER TABLE commerce_orders ADD CONSTRAINT commerce_orders_payment_currency_check CHECK(payment_currency IN ('PKR','USDT'));
ALTER TABLE commerce_orders DROP CONSTRAINT IF EXISTS commerce_orders_payment_amount_check;
ALTER TABLE commerce_orders ADD CONSTRAINT commerce_orders_payment_amount_check CHECK(payment_amount>=0);
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS listed_amount integer;
UPDATE commerce_orders SET listed_amount=amount WHERE listed_amount IS NULL OR (listed_amount=0 AND amount>0);
ALTER TABLE commerce_orders ALTER COLUMN listed_amount SET DEFAULT 0;
ALTER TABLE commerce_orders ALTER COLUMN listed_amount SET NOT NULL;
ALTER TABLE commerce_orders DROP CONSTRAINT IF EXISTS commerce_orders_listed_amount_check;
ALTER TABLE commerce_orders ADD CONSTRAINT commerce_orders_listed_amount_check CHECK(listed_amount>=0);
CREATE TABLE IF NOT EXISTS commerce_coupons (
 id uuid PRIMARY KEY, code_hash text NOT NULL UNIQUE, code_display text NOT NULL, product_id text NOT NULL DEFAULT 'p093', discount numeric(5,2) NOT NULL DEFAULT 5,
 discount_percent numeric(5,2) NOT NULL DEFAULT 5 CHECK(discount_percent>=0 AND discount_percent<=100),
 commission_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK(commission_percent>=0 AND commission_percent<=100),
 max_uses integer NOT NULL DEFAULT 10 CHECK(max_uses>0), used_count integer NOT NULL DEFAULT 0 CHECK(used_count>=0),
 enabled boolean NOT NULL DEFAULT true, unlimited boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE commerce_coupons ADD COLUMN IF NOT EXISTS unlimited boolean NOT NULL DEFAULT false;
ALTER TABLE commerce_coupons ADD COLUMN IF NOT EXISTS commission_percent numeric(5,2) NOT NULL DEFAULT 0;
ALTER TABLE commerce_coupons DROP CONSTRAINT IF EXISTS commerce_coupons_discount_percent_check;
ALTER TABLE commerce_coupons ADD CONSTRAINT commerce_coupons_discount_percent_check CHECK(discount_percent>=0 AND discount_percent<=100);
ALTER TABLE commerce_coupons DROP CONSTRAINT IF EXISTS commerce_coupons_discount_check;
ALTER TABLE commerce_coupons ADD CONSTRAINT commerce_coupons_discount_check CHECK(discount>=0 AND discount<=100);
ALTER TABLE commerce_coupons DROP CONSTRAINT IF EXISTS commerce_coupons_commission_percent_check;
ALTER TABLE commerce_coupons ADD CONSTRAINT commerce_coupons_commission_percent_check CHECK(commission_percent>=0 AND commission_percent<=100);
UPDATE commerce_coupons SET enabled=false,unlimited=true WHERE code_display='HOR';
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS supplier_product_id text;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS supplier_order_id text;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS supplier_delivery text;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS supplier_status text;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS supplier_cost_pkr integer CHECK(supplier_cost_pkr>=0);
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS fulfillment_cost_pkr integer CHECK(fulfillment_cost_pkr>=0);
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS shared_account_id uuid;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS shared_slot integer;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS shared_slot_released boolean NOT NULL DEFAULT false;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS coupon_id uuid;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS coupon_discount integer NOT NULL DEFAULT 0 CHECK(coupon_discount>=0);
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS coupon_usage_released boolean NOT NULL DEFAULT false;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS commission_code text;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2) NOT NULL DEFAULT 0;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS commission_amount integer NOT NULL DEFAULT 0;
ALTER TABLE commerce_orders DROP CONSTRAINT IF EXISTS commerce_orders_commission_rate_check;
ALTER TABLE commerce_orders ADD CONSTRAINT commerce_orders_commission_rate_check CHECK(commission_rate>=0 AND commission_rate<=100);
ALTER TABLE commerce_orders DROP CONSTRAINT IF EXISTS commerce_orders_commission_amount_check;
ALTER TABLE commerce_orders ADD CONSTRAINT commerce_orders_commission_amount_check CHECK(commission_amount>=0);
UPDATE commerce_orders SET commission_code='HOR',commission_rate=0,commission_amount=50
 WHERE status='delivered' AND COALESCE(commission_amount,0)=0
   AND coupon_id IN (SELECT id FROM commerce_coupons WHERE code_display='HOR');
CREATE UNIQUE INDEX IF NOT EXISTS commerce_supplier_order_id ON commerce_orders(supplier_order_id) WHERE supplier_order_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS commerce_supplier_products (
 id text PRIMARY KEY,
 name text NOT NULL,
 description text NOT NULL DEFAULT '',
 delivery_instruction text,
 wholesale_price numeric(12,4) NOT NULL CHECK(wholesale_price>=0),
 currency text NOT NULL,
 supplier_stock integer NOT NULL DEFAULT 0 CHECK(supplier_stock>=0),
 cost_pkr integer CHECK(cost_pkr>=0),
 cost_manual boolean NOT NULL DEFAULT false,
 selling_price integer CHECK(selling_price>0),
 enabled boolean NOT NULL DEFAULT false,
 name_manual boolean NOT NULL DEFAULT false,
 description_manual boolean NOT NULL DEFAULT false,
 requires_customer_email boolean NOT NULL DEFAULT false,
 first_seen_at timestamptz NOT NULL DEFAULT now(),
 synced_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE commerce_supplier_products ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE commerce_supplier_products ADD COLUMN IF NOT EXISTS requires_customer_email boolean NOT NULL DEFAULT false;
ALTER TABLE commerce_supplier_products ADD COLUMN IF NOT EXISTS first_seen_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE commerce_supplier_products ADD COLUMN IF NOT EXISTS cost_manual boolean NOT NULL DEFAULT false;
ALTER TABLE commerce_supplier_products ADD COLUMN IF NOT EXISTS provider_id text NOT NULL DEFAULT 'dody';
ALTER TABLE commerce_supplier_products ADD COLUMN IF NOT EXISTS provider_name text NOT NULL DEFAULT 'Dody Store';
ALTER TABLE commerce_supplier_products ADD COLUMN IF NOT EXISTS external_product_id text;
ALTER TABLE commerce_supplier_products ADD COLUMN IF NOT EXISTS canonical_key text;
ALTER TABLE commerce_supplier_products ADD COLUMN IF NOT EXISTS canonical_manual boolean NOT NULL DEFAULT false;
ALTER TABLE commerce_supplier_products ADD COLUMN IF NOT EXISTS name_manual boolean NOT NULL DEFAULT false;
ALTER TABLE commerce_supplier_products ADD COLUMN IF NOT EXISTS description_manual boolean NOT NULL DEFAULT false;
UPDATE commerce_supplier_products SET external_product_id=id WHERE external_product_id IS NULL;
UPDATE commerce_supplier_products SET canonical_key=id WHERE canonical_key IS NULL;
UPDATE commerce_supplier_products SET provider_id='dodi',provider_name='DODI Store' WHERE provider_id='dody';
ALTER TABLE commerce_supplier_products ALTER COLUMN provider_id SET DEFAULT 'dodi';
ALTER TABLE commerce_supplier_products ALTER COLUMN provider_name SET DEFAULT 'DODI Store';
CREATE TABLE IF NOT EXISTS commerce_supplier_catalog_meta (
 id boolean PRIMARY KEY DEFAULT true,
 first_seen_migrated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS commerce_supplier_external_offer ON commerce_supplier_products(provider_id,external_product_id);

CREATE TABLE IF NOT EXISTS commerce_provider_state (
 provider_id text PRIMARY KEY,
 provider_name text NOT NULL,
 balance numeric(14,4),
 currency text,
 synced_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS commerce_freebie_claims (
 id uuid PRIMARY KEY,
 provider_id text NOT NULL,
 provider_product_id text NOT NULL,
 device_hash text NOT NULL,
 ip_hash text NOT NULL,
 provider_order_id text,
 delivery_encrypted text,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','delivered','failed')),
 created_at timestamptz NOT NULL DEFAULT now(),
 delivered_at timestamptz
);
CREATE INDEX IF NOT EXISTS commerce_freebie_device_time ON commerce_freebie_claims(device_hash,created_at DESC);
CREATE INDEX IF NOT EXISTS commerce_freebie_ip_time ON commerce_freebie_claims(ip_hash,created_at DESC);
CREATE TABLE IF NOT EXISTS commerce_shared_accounts (
 id uuid PRIMARY KEY,
 inventory_id uuid NOT NULL UNIQUE REFERENCES commerce_inventory(id),
 slots_filled integer NOT NULL DEFAULT 0 CHECK(slots_filled>=0),
 max_slots integer NOT NULL DEFAULT 4 CHECK(max_slots=4),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','sold','withdrawn')),
 created_at timestamptz NOT NULL DEFAULT now(), sold_at timestamptz
);
ALTER TABLE commerce_shared_accounts ADD COLUMN IF NOT EXISTS slots_filled integer NOT NULL DEFAULT 0;
ALTER TABLE commerce_shared_accounts ADD COLUMN IF NOT EXISTS max_slots integer NOT NULL DEFAULT 4;
ALTER TABLE commerce_shared_accounts ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE commerce_shared_accounts ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE commerce_shared_accounts ADD COLUMN IF NOT EXISTS sold_at timestamptz;
CREATE INDEX IF NOT EXISTS commerce_shared_accounts_queue ON commerce_shared_accounts(status,created_at,id);
DROP INDEX IF EXISTS commerce_inventory_assignment;
CREATE UNIQUE INDEX IF NOT EXISTS commerce_inventory_assignment ON commerce_orders(inventory_id) WHERE shared_account_id IS NULL AND status IN ('pending','review','delivered');
CREATE TABLE IF NOT EXISTS commerce_two_factor_challenges (
 id uuid PRIMARY KEY,
 order_id uuid NOT NULL UNIQUE REFERENCES commerce_orders(id) ON DELETE CASCADE,
 device_hash text NOT NULL,
 code_hash text NOT NULL,
 issued_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 consumed_at timestamptz
);
CREATE INDEX IF NOT EXISTS commerce_two_factor_challenges_expiry ON commerce_two_factor_challenges(expires_at);
CREATE TABLE IF NOT EXISTS commerce_payments (
 id uuid PRIMARY KEY, event_hash text NOT NULL UNIQUE, transaction_id text UNIQUE,
 amount integer, payment_amount numeric(20,8), currency text NOT NULL DEFAULT 'PKR' CHECK(currency IN ('PKR','USDT')), payer_name text, source_last4 text, received_at timestamptz, verified boolean NOT NULL DEFAULT false,
 verification_reason text NOT NULL DEFAULT 'not_evaluated', verification_reason_before_manual text,
 fulfillment_error_code text, fulfillment_error_message text, fulfillment_error_stage text, fulfillment_error_at timestamptz,
 manual_approval_source text,
 subject text NOT NULL, encrypted_body text NOT NULL, source_message_id text,
 order_id uuid UNIQUE REFERENCES commerce_orders(id), created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS source_message_id text;
ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS payment_amount numeric(20,8);
ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'PKR';
ALTER TABLE commerce_payments DROP CONSTRAINT IF EXISTS commerce_payments_currency_check;
ALTER TABLE commerce_payments ADD CONSTRAINT commerce_payments_currency_check CHECK(currency IN ('PKR','USDT'));
ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS verification_reason text NOT NULL DEFAULT 'not_evaluated';
ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS verification_reason_before_manual text;
ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS fulfillment_error_code text;
ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS fulfillment_error_message text;
ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS fulfillment_error_stage text;
ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS fulfillment_error_at timestamptz;
ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS manual_approval_source text;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS receiver_id text;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS telegram_chat_id text;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS telegram_user_id text;
CREATE INDEX IF NOT EXISTS commerce_orders_telegram_chat ON commerce_orders(telegram_chat_id,created_at DESC);
ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS receiver_id text;
CREATE TABLE IF NOT EXISTS commerce_payment_receivers (
 id text PRIMARY KEY, label text NOT NULL, title text NOT NULL,
 account_number text NOT NULL, receiver_marker text NOT NULL,
 enabled boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS commerce_payment_receiver_state (
 id boolean PRIMARY KEY DEFAULT true CHECK(id),
 active_receiver_id text NOT NULL REFERENCES commerce_payment_receivers(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS commerce_telegram_sessions (
 chat_id text PRIMARY KEY,
 state jsonb NOT NULL DEFAULT '{}'::jsonb,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS commerce_payments_source_message_id ON commerce_payments(source_message_id) WHERE source_message_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS commerce_limits (key text PRIMARY KEY, window_start timestamptz NOT NULL DEFAULT now(), hits integer NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS commerce_audit (id bigserial PRIMARY KEY, action text NOT NULL, object_id text, details jsonb, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE commerce_audit ADD COLUMN IF NOT EXISTS details jsonb;
CREATE TABLE IF NOT EXISTS commerce_team_users (
 id boolean PRIMARY KEY DEFAULT true CHECK(id),
 email text NOT NULL,
 password_hash text NOT NULL,
 enabled boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS commerce_team_withdrawals (
 id uuid PRIMARY KEY,
 inventory_id uuid NOT NULL REFERENCES commerce_inventory(id),
 team_email text NOT NULL,
 commission_code text NOT NULL DEFAULT 'HOR',
 commission_amount integer NOT NULL DEFAULT 50 CHECK(commission_amount>=0),
 commission_paid boolean NOT NULL DEFAULT false,
 shared_slot integer,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS commerce_team_withdrawals_inventory_unique ON commerce_team_withdrawals(inventory_id) WHERE shared_slot IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS commerce_team_withdrawals_shared_slot_unique ON commerce_team_withdrawals(inventory_id,shared_slot) WHERE shared_slot IS NOT NULL;
CREATE INDEX IF NOT EXISTS commerce_team_withdrawals_created ON commerce_team_withdrawals(created_at DESC);
CREATE TABLE IF NOT EXISTS commerce_supplier_secrets (
 provider_id text PRIMARY KEY,
 encrypted_api_key text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS commerce_supplier_api_logs (
 id bigserial PRIMARY KEY,
 order_id uuid REFERENCES commerce_orders(id),
 provider_id text NOT NULL,
 operation text NOT NULL,
 endpoint text NOT NULL,
 request_method text NOT NULL DEFAULT 'GET',
 request_headers jsonb NOT NULL DEFAULT '{}'::jsonb,
 request_body jsonb,
 response_status integer,
 response_body jsonb,
 error_message text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS commerce_supplier_api_logs_order ON commerce_supplier_api_logs(order_id,created_at DESC);
CREATE INDEX IF NOT EXISTS commerce_supplier_api_logs_created ON commerce_supplier_api_logs(created_at DESC);
CREATE TABLE IF NOT EXISTS commerce_scam_reports (
 id uuid PRIMARY KEY, name text NOT NULL, description text NOT NULL, amount_pkr integer CHECK(amount_pkr>=0),
 identifiers jsonb NOT NULL DEFAULT '[]'::jsonb, payment_methods jsonb NOT NULL DEFAULT '[]'::jsonb,
 evidence jsonb NOT NULL DEFAULT '[]'::jsonb, submitter_contact text,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','removed')),
 created_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz
);
ALTER TABLE commerce_scam_reports ADD COLUMN IF NOT EXISTS amount_pkr integer CHECK(amount_pkr>=0);
CREATE INDEX IF NOT EXISTS commerce_scam_reports_status_created ON commerce_scam_reports(status, created_at DESC);
CREATE TABLE IF NOT EXISTS commerce_tool_requests (
 id uuid PRIMARY KEY,
 tool_name text NOT NULL,
 requirement text NOT NULL,
 priority text NOT NULL DEFAULT 'moderate' CHECK(priority IN ('urgent','moderate','low')),
 contact_number text NOT NULL,
 status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','fulfilled','closed')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS commerce_tool_requests_created ON commerce_tool_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS commerce_tool_requests_queue ON commerce_tool_requests(status, priority, created_at DESC);
CREATE TABLE IF NOT EXISTS commerce_google_reviews (
 id text PRIMARY KEY, name text NOT NULL, quote text NOT NULL, language text NOT NULL DEFAULT 'en',
 rating integer NOT NULL CHECK(rating BETWEEN 1 AND 5), excerpt boolean NOT NULL DEFAULT true,
 source_url text NOT NULL, profile_url text NOT NULL, photo_url text NOT NULL DEFAULT '', photo_path text NOT NULL DEFAULT '',
 review_created_at timestamptz, review_updated_at timestamptz, synced_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS commerce_google_reviews_updated ON commerce_google_reviews(review_updated_at DESC NULLS LAST, synced_at DESC);
CREATE TABLE IF NOT EXISTS commerce_google_review_sync (
 id boolean PRIMARY KEY DEFAULT true CHECK(id), total_review_count integer NOT NULL DEFAULT 0 CHECK(total_review_count>=0),
 average_rating numeric(3,2) NOT NULL DEFAULT 0 CHECK(average_rating>=0 AND average_rating<=5),
 synced_at timestamptz, last_error text
);
