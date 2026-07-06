-- Stage 3: Migrar surprises, loyalty, memberships, invites a Supabase

-- ============================================================
-- 1. SURPRISES — agregar columnas faltantes
-- ============================================================
ALTER TABLE public.surprises ADD COLUMN IF NOT EXISTS expiration_date timestamptz;
ALTER TABLE public.surprises ADD COLUMN IF NOT EXISTS icon text DEFAULT 'gift';
ALTER TABLE public.surprises ADD COLUMN IF NOT EXISTS bg_color text DEFAULT '#2D1B69';
ALTER TABLE public.surprises ADD COLUMN IF NOT EXISTS bg_image_uri text;
ALTER TABLE public.surprises ADD COLUMN IF NOT EXISTS icon_image_uri text;
ALTER TABLE public.surprises ADD COLUMN IF NOT EXISTS sent_at timestamptz DEFAULT now();

-- ============================================================
-- 2. MEMBERSHIPS — agregar columnas faltantes + unique user_id
-- ============================================================
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS payment_ref text DEFAULT '';
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS amount_usd integer DEFAULT 0;
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS amount_ars numeric DEFAULT 0;
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS rate numeric DEFAULT 0;
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS user_email text DEFAULT '';
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Unique por usuario (upsert por user_id)
ALTER TABLE public.memberships DROP CONSTRAINT IF EXISTS memberships_user_id_key;
ALTER TABLE public.memberships ADD CONSTRAINT memberships_user_id_key UNIQUE (user_id);

-- ============================================================
-- 3. INVITES — crear tabla si no existe
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_alias text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invites_self" ON public.invites;
CREATE POLICY "invites_self" ON public.invites
  FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- 4. GRANTS
-- ============================================================
GRANT EXECUTE ON FUNCTION public.create_surprise TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_surprise TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_surprise TO anon, authenticated;
