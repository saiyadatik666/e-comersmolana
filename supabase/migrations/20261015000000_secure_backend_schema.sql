-- =============================================================================
-- SHIFA A HAYAT — SECURE BACKEND ARCHITECTURE MIGRATION
-- Migration: 20261015000000_secure_backend_schema.sql
-- Stack: PostgreSQL 15+, Supabase, Row-Level Security (RLS)
-- Objective: Transition from device-local storage to a secure shared backend.
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. STORE SETTINGS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.store_settings (
  id text PRIMARY KEY DEFAULT 'default',
  store_name text NOT NULL DEFAULT 'Shifa A Hayat',
  tagline text NOT NULL DEFAULT 'Shifa A Hayat Tibbi Unani Shifakhana & Ayurvedic Pharmacy',
  founder_name text NOT NULL DEFAULT 'Hakeem Mohammad Niyazuddin',
  phone text NOT NULL DEFAULT '+91 95860 37331',
  whatsapp text NOT NULL DEFAULT '+91 95860 37331',
  email text NOT NULL DEFAULT 'shifaahayat786@gmail.com',
  address text NOT NULL DEFAULT 'Near Civil Hospital Road',
  city text NOT NULL DEFAULT 'Palanpur',
  state text NOT NULL DEFAULT 'Gujarat',
  country text NOT NULL DEFAULT 'India',
  free_shipping_threshold integer NOT NULL DEFAULT 499 CHECK (free_shipping_threshold >= 0),
  standard_shipping_fee integer NOT NULL DEFAULT 50 CHECK (standard_shipping_fee >= 0),
  announcement_text text DEFAULT 'Shifa A Hayat — शुद्ध हर्बल व यूनानी औषधियों का विश्वसनीय केंद्र। पूरे भारत में सुरक्षित डिलीवरी।',
  cod_available boolean NOT NULL DEFAULT true,
  online_payment_available boolean NOT NULL DEFAULT true,
  upi_id text DEFAULT '9586037331@upi',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 2. PRODUCTS & INVENTORY TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id text PRIMARY KEY,
  name text NOT NULL,
  name_hindi text NOT NULL,
  description text NOT NULL,
  price integer NOT NULL CHECK (price > 0),
  compare_at_price integer CHECK (compare_at_price IS NULL OR compare_at_price >= price),
  category text NOT NULL,
  category_hindi text NOT NULL,
  in_stock boolean NOT NULL DEFAULT true,
  stock_count integer NOT NULL DEFAULT 50 CHECK (stock_count >= 0),
  image text NOT NULL,
  poster_image text,
  pack_size text NOT NULL,
  rating numeric(3,2) NOT NULL DEFAULT 4.8 CHECK (rating >= 1.0 AND rating <= 5.0),
  reviews_count integer NOT NULL DEFAULT 0 CHECK (reviews_count >= 0),
  benefits text[] DEFAULT ARRAY[]::text[],
  ingredients text[] DEFAULT ARRAY[]::text[],
  dosage text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_in_stock ON public.products(in_stock);

-- =============================================================================
-- 3. ORDERS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id text PRIMARY KEY,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  address_line text NOT NULL,
  landmark text,
  city_village text NOT NULL,
  state text NOT NULL,
  pincode text NOT NULL,
  country text NOT NULL DEFAULT 'India',
  subtotal integer NOT NULL CHECK (subtotal >= 0),
  shipping_charge integer NOT NULL CHECK (shipping_charge >= 0),
  discount integer NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total integer NOT NULL CHECK (total >= 0),
  payment_method text NOT NULL DEFAULT 'WhatsApp Direct Order',
  payment_status text NOT NULL DEFAULT 'Pending Confirmation',
  order_status text NOT NULL DEFAULT 'Pending Confirmation',
  tracking_number text,
  notes text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- =============================================================================
-- 4. ORDER ITEMS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name text NOT NULL,
  product_image text NOT NULL,
  price integer NOT NULL CHECK (price > 0),
  quantity integer NOT NULL CHECK (quantity > 0 AND quantity <= 99),
  pack_size text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- =============================================================================
-- 5. USER ROLES TABLE (RBAC)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'staff', 'customer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- =============================================================================
-- 6. ADMIN AUDIT LOGS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.admin_audit_logs(entity_type, entity_id);

-- =============================================================================
-- 7. SECURITY DEFINER HELPER: IS_ADMIN
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF check_user_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id AND role = 'admin'
  );
END;
$$;

-- Trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_store_settings_updated_at ON public.store_settings;
CREATE TRIGGER trg_store_settings_updated_at
BEFORE UPDATE ON public.store_settings
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- PRODUCTS:
-- Anyone can view products
DROP POLICY IF EXISTS "Public can view products" ON public.products;
CREATE POLICY "Public can view products"
  ON public.products FOR SELECT
  USING (true);

-- Only verified admins can insert, update, or delete products
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- STORE SETTINGS:
-- Anyone can view store settings
DROP POLICY IF EXISTS "Public can view store settings" ON public.store_settings;
CREATE POLICY "Public can view store settings"
  ON public.store_settings FOR SELECT
  USING (true);

-- Only verified admins can update store settings
DROP POLICY IF EXISTS "Admins can update store settings" ON public.store_settings;
CREATE POLICY "Admins can update store settings"
  ON public.store_settings FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ORDERS:
-- Customers can submit orders (insert)
DROP POLICY IF EXISTS "Anyone can submit orders" ON public.orders;
CREATE POLICY "Anyone can submit orders"
  ON public.orders FOR INSERT
  WITH CHECK (true);

-- Admins can view and manage all orders; users can view their own orders
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()) OR (user_id IS NOT NULL AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ORDER ITEMS:
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
CREATE POLICY "Anyone can insert order items"
  ON public.order_items FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view order items" ON public.order_items;
CREATE POLICY "Admins can view order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- USER ROLES:
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ADMIN AUDIT LOGS:
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can insert audit logs"
  ON public.admin_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- =============================================================================
-- 9. SEED DATA — 21 AUTHENTIC SHIFA A HAYAT PRODUCTS & DEFAULT SETTINGS
-- =============================================================================

INSERT INTO public.store_settings (id, store_name, tagline, phone, whatsapp, email, free_shipping_threshold, standard_shipping_fee)
VALUES ('default', 'Shifa A Hayat', 'Shifa A Hayat Tibbi Unani Shifakhana & Ayurvedic Pharmacy', '+91 95860 37331', '+91 95860 37331', 'shifaahayat786@gmail.com', 499, 50)
ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  whatsapp = EXCLUDED.whatsapp,
  free_shipping_threshold = EXCLUDED.free_shipping_threshold,
  standard_shipping_fee = EXCLUDED.standard_shipping_fee;

INSERT INTO public.products (id, name, name_hindi, description, price, compare_at_price, category, category_hindi, in_stock, stock_count, image, poster_image, pack_size, rating, reviews_count)
VALUES
  ('shifa-zafrani-gold', 'Capsule Zafrani Gold', 'कैप्सूल ज़ाफरानी गोल्ड', 'A royal heritage Unani formulation enriched with pure saffron (Zafran), gold calx (Swarna Bhasm), and revitalizing herbs. Designed to enhance vigor, stamina, and physical strength while eliminating nervous exhaustion.', 1450, 1850, 'mens-wellness', 'पुरुष स्वास्थ्य एवं मर्दाना ताकत', true, 45, '/assets/products/zafrani-gold.jpg', '/assets/molana/IMG-20261009-WA0003.jpg', '60 Capsules (30 White + 30 Black-Orange)', 4.9, 38),
  ('shifa-pehlwan-capsule', 'Pehlwan Capsule', 'पहलवान कैप्सूल', 'Time-honored herbal formula prepared with traditional Indian forest herbs. Designed for married men seeking enhanced physical endurance, natural vigor, and long-lasting energy throughout daily activities.', 990, 1250, 'mens-wellness', 'पुरुष स्वास्थ्य एवं मर्दाना ताकत', true, 60, '/assets/products/pehlwan-capsule.jpg', '/assets/molana/IMG-20261009-WA0004.jpg', '60 Red-Gold Capsules Jar', 4.8, 42),
  ('shifa-habbe-hawa', 'Habbe Hawa', 'हब्बे हवा', 'A signature formulation by Hakeem Inayat Ahmadi that targets stubborn gastric flatulence, bloating, chronic constipation, and abdominal discomfort. Also provides remarkable relief from ''vayu'' related radiating joint stiffness.', 350, 450, 'digestive-care', 'पेट एवं पाचन समस्या', true, 85, '/assets/products/habbe-hawa.jpg', '/assets/molana/IMG-20261009-WA0005.jpg', 'Jar containing ~60 herbal pills', 4.9, 76),
  ('shifa-santaan-course', 'Santaan Sukh Desi Jadi-Booti Course', 'संतान ना रुकने का खास देसी जड़ी-बूटी कोर्स', 'A comprehensive reproductive wellness system curated for couples facing delays in conception. Addresses underlying hormonal imbalances, uterine weakness, ovarian cysts/PCOS, and supports male sperm count and motility.', 3200, 3800, 'womens-health', 'स्त्री रोग व स्वास्थ्य', true, 20, '/assets/products/santaan-course.jpg', '/assets/molana/IMG-20261009-WA0006.jpg', 'Complete 1-Month Kit (Herbal Arq Bottle + 3 Specialized Capsule Jars)', 5, 29),
  ('shifa-hoor-night-cream', 'Hoor Night Cream', 'हूर नाईट क्रीम', 'A rich Ayurvedic facial repair cream blended with saffron, sandalwood, and herbal extracts. Clears stubborn dark spots, under-eye circles, hyperpigmentation, and restores an even, luminous complexion overnight.', 499, 650, 'skin-hair', 'त्वचा एवं बालों की देखभाल', true, 70, '/assets/products/hoor-night-cream.jpg', '/assets/molana/IMG-20261009-WA0007.jpg', '50g Luxury Jar', 4.8, 54),
  ('shifa-majun-mardangi', 'Majun Mardangi Sona Chandi Wala', 'माजून मर्दानगी सोना चांदी वाला', 'The pinnacle of Unani classical medicine. Prepared strictly according to classical formulations with pure silver leaves (Chandi Vark), gold calx (Kushta Tila), amber, and potent wild roots to revitalize nervous vigor and marital vitality.', 1850, 2200, 'classical-tonics', 'शास्त्रीय अर्क व टॉनिक', true, 30, '/assets/products/majun-mardangi.jpg', '/assets/molana/IMG-20261009-WA0008.jpg', '250g Glass Jar with Vark', 4.9, 61),
  ('shifa-dimagi-tonic', 'Dimagi Tonic - Bachhon Ke Liye', 'दिमागी कमजोरी - बच्चों के लिए खास', 'A gentle brain-enhancing herbal lehyam specially formulated for growing children and students. Improves memory retention, mental sharpness, study focus, and helps overcome childhood nocturnal enuresis (bed-wetting).', 420, 550, 'classical-tonics', 'शास्त्रीय अर्क व टॉनिक', true, 40, '/assets/products/dimagi-tonic.jpg', '/assets/molana/IMG-20261009-WA0009.jpg', '200g Paste Jar', 4.9, 33),
  ('shifa-jiriyan-timing-pearls', 'Jiriyan Ahtelam Timing Pearls', 'जिरियान अहतिलाम टाइमिंग गोलियां', 'Silver-coated botanical pearls formulated to control involuntary seminal discharge, excessive urethral leakage (dhat/jiriyan), and performance anxiety by firming up autonomic nervous control.', 850, 1100, 'mens-wellness', 'पुरुष स्वास्थ्य एवं मर्दाना ताकत', true, 50, '/assets/molana/IMG-20261009-WA0010.jpg', '/assets/molana/IMG-20261009-WA0010.jpg', 'Bowl Jar containing 120 Silver Coated Pearls', 4.7, 47),
  ('shifa-weight-cutter', 'Weight Cutter Herbal Capsules', 'वेट कटर हर्बल कैप्सूल', 'An Ayurvedic lipid-metabolizing formula that mobilizes stubborn visceral belly fat, curbs excessive sweet cravings, and tones the waistline without causing weakness or loose motions.', 799, 999, 'metabolic-care', 'वजन एवं मेटाबोलिक केयर', true, 55, '/assets/products/weight-cutter.jpg', '/assets/molana/IMG-20261009-WA0011.jpg', '60 Red-White Capsules Jar', 4.6, 39),
  ('shifa-pait-samasya-set', 'Pait Ki Samasya Unani Herbal Set', 'पेट की समस्याओं के लिए यूनानी हर्बल सेट', 'Complete comprehensive care for chronic liver sluggishness, fatty liver tendencies, severe indigestion, sour belching, hyperacidity, and abdominal fullness after eating.', 650, 850, 'digestive-care', 'पेट एवं पाचन समस्या', true, 40, '/assets/molana/IMG-20261009-WA0012.jpg', '/assets/molana/IMG-20261009-WA0012.jpg', '500ml Distilled Arq Bottle + 2 x 100g Digestive Herbal Powder Jars', 4.9, 58),
  ('shifa-arq-abe-hayat', 'Arq Abe Hayat Drops', 'इर्क आबे हयात', 'The legendary household first-aid remedy of Shifa A Hayat. Verified price printed directly on poster (₹250). A potent distilled herbal essence for colds, sudden toothaches, severe headaches, chest congestion, stomach gripes, and insect stings.', 250, 300, 'classical-tonics', 'शास्त्रीय अर्क व टॉनिक', true, 120, '/assets/products/arq-abe-hayat.jpg', '/assets/molana/IMG-20261009-WA0013.jpg', '15ml Amber Dropper Bottle', 5, 112),
  ('shifa-arq-e-amber', 'Arq-e-Amber Tonic', 'अर्क़-ए-अंबर', 'A classical Unani elixir distilled with pure Ambergris, musk substitutes, and heart-calming botanicals. Provides supreme nourishment to the heart, brain, vital organs, and replenishes iron, calcium, and vitality.', 890, 1150, 'classical-tonics', 'शास्त्रीय अर्क व टॉनिक', true, 45, '/assets/molana/IMG-20261009-WA0014.jpg', '/assets/molana/IMG-20261009-WA0014.jpg', '500ml Glass Bottle', 4.8, 41),
  ('shifa-hair-oil', 'Herbal Hair Oil', 'हर्बल हेअर ऑयल', 'Authentic herbal hair oil prepared in pure cold-pressed sesame and coconut oil with 18 time-tested Himalayan and Gir forest herbs. Halts heavy hair fall, eliminates stubborn dandruff, and stimulates dormant roots.', 380, 480, 'skin-hair', 'त्वचा एवं बालों की देखभाल', true, 95, '/assets/products/hair-oil.jpg', '/assets/molana/IMG-20261009-WA0015.jpg', '200ml Glass/PET Dispenser Bottle', 4.9, 88),
  ('shifa-gas-ki-goliyan', 'Gas Ki Goliyan', 'गैस की गोलियां', 'A fast-acting Ayurvedic digestive tablet made from pure herbal digestives and rock salts. Relieves acidity, heavy bloated abdomen, burning reflux, and irregular digestion swiftly.', 199, 260, 'digestive-care', 'पेट एवं पाचन समस्या', true, 110, '/assets/molana/IMG-20261009-WA0016.jpg', '/assets/molana/IMG-20261009-WA0016.jpg', 'Container with 60 Tablets', 4.9, 104),
  ('shifa-rahat-e-dard', 'Rahat-e-Dard', 'राहते दर्द', 'Specially formulated for patients suffering from persistent lumbar backache, nerve compression (L4-L5 disc bulges), shooting sciatica pain, and calcium deficiency bone aches. Provides rapid comfort from early doses.', 590, 750, 'joint-pain', 'जोड़ों व कमर दर्द निवारण', true, 65, '/assets/products/rahat-e-dard.jpg', '/assets/molana/IMG-20261009-WA0017.jpg', 'Jar of ~80 Herbal Relief Pills', 4.9, 65),
  ('shifa-tiger-suwarna-bhasm', 'Tiger Suwarna Bhasm Boost Tablet', 'टाइगर सुवर्ण भस्म बूस्ट टैबलेट', 'A royal supreme Rasayana prepared with real Suwarna (Gold) Bhasm, diamond calx, and Himalayan herbs. Created to eliminate acute sexual debility, size dissatisfaction, lack of erection firmness, and exhaustion.', 2490, 2990, 'mens-wellness', 'पुरुष स्वास्थ्य एवं मर्दाना ताकत', true, 25, '/assets/products/tiger-bhasm.jpg', '/assets/molana/IMG-20261009-WA0018.jpg', 'Jar with 60 Gold-Coated Ayurvedic Tablets', 5, 36),
  ('shifa-va-rog-relief', 'Va Rog Gathiya Relief', 'वा और जोड़ों के दर्द की बेस्ट दवा', 'A dedicated herbal cure for knee friction, wandering joint pain (Gathiya/Sandhivata), pinched nerves, and stiffness that prevents elderly individuals from offering Namaz on the floor or climbing stairs.', 680, 890, 'joint-pain', 'जोड़ों व कमर दर्द निवारण', true, 50, '/assets/molana/IMG-20261009-WA0019.jpg', '/assets/molana/IMG-20261009-WA0019.jpg', 'Course Pack with 90 Herbal Pills', 4.8, 52),
  ('shifa-diabetes-care', 'Diabetes Care Herbal Solution', 'डायबिटीज केयर - विशेष हर्बल समाधान', 'An Ayurvedic herbal formulation designed to naturally support healthy glucose metabolism, protect peripheral nerves, prevent eye fatigue, and fight the general weakness associated with high sugar levels.', 750, 950, 'metabolic-care', 'वजन एवं मेटाबोलिक केयर', true, 50, '/assets/molana/IMG-20261009-WA0020.jpg', '/assets/molana/IMG-20261009-WA0020.jpg', '60 Blue-White Capsules Jar', 4.8, 44),
  ('shifa-tanavai-tel', 'Tanavai Nabhi Tel', 'तनावई तेल (नाभि में डालने का तेल)', 'Verified price printed on poster (₹200). In traditional science, the navel connects to 72,000 vital nerves (Pechoti method). Regular navel application helps lubricate internal dry veins, relieving backache, knee pain, and promoting glowing skin.', 200, 250, 'classical-tonics', 'शास्त्रीय अर्क व टॉनिक', true, 150, '/assets/products/tanavai-tel.jpg', '/assets/molana/IMG-20261009-WA0021.jpg', '30ml Dropper Bottle', 4.9, 91),
  ('shifa-likoriya-care', 'Likoriya Care Herbal Powder', 'स्त्री रोग - लिकोरिया विशेष हर्बल दवा', 'A dedicated Ayurvedic remedy for women suffering from chronic leucorrhoea (white discharge), back weakness, leg cramps, anemia, and chronic fatigue. Restores vitality and peace of mind naturally.', 490, 650, 'womens-health', 'स्त्री रोग व स्वास्थ्य', true, 45, '/assets/molana/IMG-20261009-WA0022.jpg', '/assets/molana/IMG-20261009-WA0022.jpg', 'Jar Stack containing 150g Herbal Churna', 4.9, 48),
  ('shifa-shabab-avar', 'Shabab Avar Powder', 'शबाब आवर पाउडर', 'The flagship masculine tonic formulated by Hakeem Inayat Palanpuri (Aapka Dua-go). Revered across Gujarat for infusing unstoppable physical power, sustained timing, firm erection, and lasting marital satisfaction.', 1150, 1450, 'mens-wellness', 'पुरुष स्वास्थ्य एवं मर्दाना ताकत', true, 35, '/assets/molana/IMG-20261009-WA0023.jpg', '/assets/molana/IMG-20261009-WA0023.jpg', '200g Airtight Jar', 5, 68)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_hindi = EXCLUDED.name_hindi,
  price = EXCLUDED.price,
  compare_at_price = EXCLUDED.compare_at_price,
  pack_size = EXCLUDED.pack_size,
  image = EXCLUDED.image,
  poster_image = EXCLUDED.poster_image;
