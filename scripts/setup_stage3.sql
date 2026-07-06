-- Stage 3: Prizes, Surprises, Loyalty, Score, Memberships, Invites

-- ============================================================
-- 1. PRIZES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  token_cost integer NOT NULL CHECK (token_cost > 0),
  created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  used_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prizes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prizes_self" ON public.prizes;
CREATE POLICY "prizes_self" ON public.prizes
  FOR ALL USING (created_by = auth.uid());

DROP POLICY IF EXISTS "prizes_read_children" ON public.prizes;
CREATE POLICY "prizes_read_children" ON public.prizes
  FOR SELECT USING (
    created_by IN (
      SELECT tutor_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.create_prize(p_title text, p_description text, p_token_cost integer, p_created_by uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.prizes (title, description, token_cost, created_by)
  VALUES (p_title, p_description, p_token_cost, p_created_by)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_prize(p_prize_id uuid, p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.prizes WHERE id = p_prize_id AND created_by = p_user_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_prize_used(p_prize_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.prizes SET used_count = used_count + 1 WHERE id = p_prize_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 2. SURPRISES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.surprises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  token_reward integer NOT NULL CHECK (token_reward > 0),
  created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  for_all boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'opened', 'claimed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.surprises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "surprises_self" ON public.surprises;
CREATE POLICY "surprises_self" ON public.surprises
  FOR ALL USING (created_by = auth.uid() OR child_id = auth.uid());

CREATE OR REPLACE FUNCTION public.create_surprise(
  p_title text, p_description text, p_token_reward integer,
  p_created_by uuid, p_child_id uuid, p_for_all boolean
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.surprises (title, description, token_reward, created_by, child_id, for_all)
  VALUES (p_title, p_description, p_token_reward, p_created_by, p_child_id, p_for_all)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.open_surprise(p_surprise_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.surprises SET status = 'opened' WHERE id = p_surprise_id AND status = 'sent';
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_surprise(p_surprise_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sur record;
  v_result jsonb;
BEGIN
  SELECT * INTO v_sur FROM public.surprises WHERE id = p_surprise_id AND status IN ('opened', 'sent');
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sorpresa no encontrada');
  END IF;

  UPDATE public.surprises SET status = 'claimed' WHERE id = p_surprise_id;

  -- Crear redemption
  SELECT * INTO v_result FROM public.create_redemption(
    v_sur.child_id, v_sur.created_by,
    'surprise', v_sur.title, v_sur.token_reward
  );

  RETURN v_result;
END;
$$;

-- ============================================================
-- 3. LOYALTY POINTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.loyalty_points (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.loyalty_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  type text NOT NULL,
  description text DEFAULT '',
  date timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loyalty_self" ON public.loyalty_points;
CREATE POLICY "loyalty_self" ON public.loyalty_points
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "loyalty_history_self" ON public.loyalty_history;
CREATE POLICY "loyalty_history_self" ON public.loyalty_history
  FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- 4. SCORE GOALS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.score_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  month_key text NOT NULL,
  goal integer NOT NULL DEFAULT 0,
  UNIQUE (user_id, month_key)
);

ALTER TABLE public.score_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "score_goals_self" ON public.score_goals;
CREATE POLICY "score_goals_self" ON public.score_goals
  FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- 5. MEMBERSHIPS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'sent', 'verified')),
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "memberships_self" ON public.memberships;
CREATE POLICY "memberships_self" ON public.memberships
  FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- 6. INVITES — schema coincide con tabla existente
-- ============================================================
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invites_self" ON public.invites;
CREATE POLICY "invites_self" ON public.invites
  FOR ALL USING (user_id = auth.uid());
