CREATE TABLE IF NOT EXISTS commerce_inventory (
 id uuid PRIMARY KEY, product_id text NOT NULL, email_hash text NOT NULL UNIQUE,
 credentials text NOT NULL, purchase_cost integer NOT NULL DEFAULT 0 CHECK(purchase_cost>=0), state text NOT NULL DEFAULT 'available'
 CHECK (state IN ('available','reserved','delivered','quarantined','withdrawn')), created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE commerce_inventory ADD COLUMN IF NOT EXISTS purchase_cost integer NOT NULL DEFAULT 0 CHECK(purchase_cost>=0);
ALTER TABLE commerce_inventory DROP CONSTRAINT IF EXISTS commerce_inventory_state_check;
ALTER TABLE commerce_inventory ADD CONSTRAINT commerce_inventory_state_check CHECK (state IN ('available','reserved','delivered','quarantined','withdrawn'));
CREATE TABLE IF NOT EXISTS commerce_orders (
 id uuid PRIMARY KEY, product_id text NOT NULL, amount integer NOT NULL CHECK(amount>=0),
 recovery_hash text NOT NULL, session_hash text NOT NULL, inventory_id uuid REFERENCES commerce_inventory(id),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','review','delivered','expired','cancelled')),
 transaction_id text, payer_name text, source_last4 text, created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '5 minutes', delivered_at timestamptz
);
CREATE TABLE IF NOT EXISTS commerce_coupons (
 id uuid PRIMARY KEY, code_hash text NOT NULL UNIQUE, code_display text NOT NULL, product_id text NOT NULL DEFAULT 'p093', discount numeric(5,2) NOT NULL DEFAULT 5,
 discount_percent numeric(5,2) NOT NULL DEFAULT 5 CHECK(discount_percent>0 AND discount_percent<=100),
 max_uses integer NOT NULL DEFAULT 10 CHECK(max_uses>0), used_count integer NOT NULL DEFAULT 0 CHECK(used_count>=0),
 enabled boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS supplier_product_id text;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS supplier_order_id text;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS supplier_delivery text;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS supplier_status text;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS supplier_cost_pkr integer CHECK(supplier_cost_pkr>=0);
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS coupon_id uuid;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS coupon_discount integer NOT NULL DEFAULT 0 CHECK(coupon_discount>=0);
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS coupon_usage_released boolean NOT NULL DEFAULT false;
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
 synced_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE commerce_supplier_products ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE commerce_supplier_products ADD COLUMN IF NOT EXISTS cost_manual boolean NOT NULL DEFAULT false;
ALTER TABLE commerce_supplier_products ADD COLUMN IF NOT EXISTS provider_id text NOT NULL DEFAULT 'dody';
ALTER TABLE commerce_supplier_products ADD COLUMN IF NOT EXISTS provider_name text NOT NULL DEFAULT 'Dody Store';
ALTER TABLE commerce_supplier_products ADD COLUMN IF NOT EXISTS external_product_id text;
ALTER TABLE commerce_supplier_products ADD COLUMN IF NOT EXISTS canonical_key text;
ALTER TABLE commerce_supplier_products ADD COLUMN IF NOT EXISTS canonical_manual boolean NOT NULL DEFAULT false;
UPDATE commerce_supplier_products SET external_product_id=id WHERE external_product_id IS NULL;
UPDATE commerce_supplier_products SET canonical_key=id WHERE canonical_key IS NULL;
UPDATE commerce_supplier_products SET provider_id='dodi',provider_name='DODI Store' WHERE provider_id='dody';
ALTER TABLE commerce_supplier_products ALTER COLUMN provider_id SET DEFAULT 'dodi';
ALTER TABLE commerce_supplier_products ALTER COLUMN provider_name SET DEFAULT 'DODI Store';
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
CREATE UNIQUE INDEX IF NOT EXISTS commerce_inventory_assignment ON commerce_orders(inventory_id) WHERE status IN ('pending','review','delivered');
CREATE TABLE IF NOT EXISTS commerce_payments (
 id uuid PRIMARY KEY, event_hash text NOT NULL UNIQUE, transaction_id text UNIQUE,
 amount integer, payer_name text, source_last4 text, received_at timestamptz, verified boolean NOT NULL DEFAULT false,
 subject text NOT NULL, encrypted_body text NOT NULL, source_message_id text,
 order_id uuid UNIQUE REFERENCES commerce_orders(id), created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS source_message_id text;
CREATE UNIQUE INDEX IF NOT EXISTS commerce_payments_source_message_id ON commerce_payments(source_message_id) WHERE source_message_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS commerce_limits (key text PRIMARY KEY, window_start timestamptz NOT NULL DEFAULT now(), hits integer NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS commerce_audit (id bigserial PRIMARY KEY, action text NOT NULL, object_id text, created_at timestamptz NOT NULL DEFAULT now());
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
