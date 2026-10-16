-- =============================================================================
-- SHIFA A HAYAT — POSTGRESQL / SUPABASE PRODUCTION DATABASE SCHEMA
-- For Persistent Order Storage, Real Customer Tracking & Audit Logging
-- =============================================================================

-- Enable pgcrypto for UUID generation if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id VARCHAR(64) PRIMARY KEY, -- e.g. 'ORD-123456-7890'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    customer_email VARCHAR(255),
    shipping_address JSONB NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    shipping_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (shipping_charge >= 0),
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    applied_coupon VARCHAR(64),
    total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
    payment_method VARCHAR(64) NOT NULL DEFAULT 'WhatsApp Direct Order',
    payment_status VARCHAR(64) NOT NULL DEFAULT 'Pending Confirmation',
    order_status VARCHAR(64) NOT NULL DEFAULT 'Pending Confirmation',
    tracking_number VARCHAR(128) DEFAULT '',
    notes TEXT DEFAULT '',
    was_price_tampered BOOLEAN DEFAULT FALSE,
    tampering_details TEXT,
    is_whatsapp_confirmed_by_customer BOOLEAN DEFAULT FALSE
);

-- Indexes for lightning fast customer lookups and phone verification
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders (customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON public.orders (order_status);

-- 2. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id VARCHAR(128) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_image TEXT NOT NULL,
    pack_size VARCHAR(128) NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price > 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    line_total NUMERIC(10, 2) NOT NULL CHECK (line_total > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items (product_id);

-- 3. ORDER STATUS HISTORY (AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id BIGSERIAL PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    status VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    notes TEXT,
    updated_by VARCHAR(255) NOT NULL DEFAULT 'System'
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history (order_id, timestamp ASC);

-- 4. INVENTORY TABLE
CREATE TABLE IF NOT EXISTS public.inventory (
    product_id VARCHAR(128) PRIMARY KEY,
    stock_count INTEGER NOT NULL DEFAULT 50 CHECK (stock_count >= 0),
    in_stock BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. ADMIN AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    admin_email VARCHAR(255) NOT NULL,
    action VARCHAR(128) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(128) NOT NULL,
    details JSONB,
    ip_address VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_timestamp ON public.admin_audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_email ON public.admin_audit_logs (admin_email);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Anonymous users cannot browse all orders
-- Customer order tracking lookup is served via server-side verification:
-- SELECT ... FROM orders WHERE LOWER(id) = LOWER($1) AND customer_phone LIKE '%' || $2
-- Direct SELECT on orders is restricted to authenticated Service Role / Admin.

-- 6. PRODUCT REVIEWS TABLE (TRUSTWORTHY REVIEW SYSTEM)
CREATE TABLE IF NOT EXISTS public.product_reviews (
    id VARCHAR(64) PRIMARY KEY, -- e.g. 'rev-172901-4821'
    product_id VARCHAR(128) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(128) NOT NULL,
    comment TEXT NOT NULL,
    author_name VARCHAR(255) NOT NULL, -- Stored privately for moderation
    author_masked VARCHAR(255) NOT NULL, -- Publicly visible (e.g. M*** A***)
    city VARCHAR(128),
    is_verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
    verified_order_id VARCHAR(64) REFERENCES public.orders(id) ON DELETE SET NULL,
    verified_order_id_masked VARCHAR(64),
    customer_phone_masked VARCHAR(32),
    status VARCHAR(32) NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'rejected')),
    admin_reply TEXT,
    admin_reply_at TIMESTAMPTZ,
    ip_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Unique index to prevent duplicate verified reviews for the same order & product
CREATE UNIQUE INDEX IF NOT EXISTS uq_verified_review_order_product 
ON public.product_reviews (verified_order_id, product_id) 
WHERE verified_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reviews_product_status ON public.product_reviews (product_id, status);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.product_reviews (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.product_reviews (rating);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Public can only view approved reviews with masked author fields:
CREATE POLICY "Public can view approved reviews" 
ON public.product_reviews 
FOR SELECT 
USING (status = 'approved');

-- Admin can view and moderate all reviews:
CREATE POLICY "Admin full access to reviews" 
ON public.product_reviews 
FOR ALL 
USING (auth.jwt() ->> 'email' = 'inaytchaudhri@gmail.com');

