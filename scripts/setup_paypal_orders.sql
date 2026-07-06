-- paypal_orders: rastrea ordenes PayPal para escritura server-side en Supabase
CREATE TABLE IF NOT EXISTS public.paypal_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paypal_order_id text NOT NULL UNIQUE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_email text DEFAULT '',
  product_type text NOT NULL CHECK (product_type IN ('tokens', 'membership')),
  product_id text NOT NULL,
  amount_usd numeric NOT NULL,
  amount_ars numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'refunded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.paypal_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "paypal_orders_insert" ON public.paypal_orders;
CREATE POLICY "paypal_orders_insert" ON public.paypal_orders
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "paypal_orders_select" ON public.paypal_orders;
CREATE POLICY "paypal_orders_select" ON public.paypal_orders
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "paypal_orders_update" ON public.paypal_orders;
CREATE POLICY "paypal_orders_update" ON public.paypal_orders
  FOR UPDATE USING (user_id = auth.uid());
