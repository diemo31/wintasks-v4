-- Stage 2: Tasks + TokenBatches + TaskPhotos
-- Ejecutar en SQL Editor de Supabase

-- 1. TABLAS

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  child_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  token_reward integer NOT NULL CHECK (token_reward > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','approved','rejected','expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  approved_at timestamptz,
  expires_at timestamptz NOT NULL,
  started_at timestamptz,
  last_reminder_at timestamptz,
  redone_at timestamptz,
  deduction_details jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.token_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount > 0),
  remaining integer NOT NULL CHECK (remaining >= 0),
  source text NOT NULL,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  from_child_transfer boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.task_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  photo_uri text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Migracion para tablas existentes (ejecutar sin errores si ya existe)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS deduction_details jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. INDICES

CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_child_id ON public.tasks(child_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_token_batches_user_id ON public.token_batches(user_id);
CREATE INDEX IF NOT EXISTS idx_token_batches_expires ON public.token_batches(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_task_photos_task_id ON public.task_photos(task_id);

-- 3. RLS

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_photos ENABLE ROW LEVEL SECURITY;

-- Políticas: los usuarios autenticados pueden leer/escribir sus propios datos
DROP POLICY IF EXISTS "tasks_self" ON public.tasks;
CREATE POLICY "tasks_self" ON public.tasks
  FOR ALL USING (
    created_by = auth.uid()
    OR child_id = auth.uid()
    OR created_by = (SELECT tutor_id FROM public.profiles WHERE id = auth.uid())
    OR child_id IN (SELECT id FROM public.profiles WHERE tutor_id = (SELECT tutor_id FROM public.profiles WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "token_batches_self" ON public.token_batches;
CREATE POLICY "token_batches_self" ON public.token_batches
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "task_photos_self" ON public.task_photos;
CREATE POLICY "task_photos_self" ON public.task_photos
  FOR ALL USING (
    task_id IN (SELECT id FROM public.tasks WHERE created_by = auth.uid() OR child_id = auth.uid())
  );

-- 4. RPCs

-- getUserTokens: suma remaining de lotes no vencidos
CREATE OR REPLACE FUNCTION public.get_user_tokens(p_user_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total integer;
BEGIN
  SELECT COALESCE(SUM(remaining), 0) INTO v_total
  FROM public.token_batches
  WHERE user_id = p_user_id AND remaining > 0 AND expires_at > now();
  RETURN v_total;
END;
$$;

-- addTokens: crea un nuevo lote
CREATE OR REPLACE FUNCTION public.add_tokens(
  p_user_id uuid,
  p_amount integer,
  p_source text DEFAULT 'generic',
  p_expires_at timestamptz DEFAULT NULL,
  p_from_child_transfer boolean DEFAULT false
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_expires_at timestamptz;
  v_id uuid;
BEGIN
  v_expires_at := COALESCE(p_expires_at, now() + interval '6 months');
  INSERT INTO public.token_batches (user_id, amount, remaining, source, acquired_at, expires_at, from_child_transfer)
  VALUES (p_user_id, p_amount, p_amount, p_source, now(), v_expires_at, p_from_child_transfer)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- createTask: deduce tokens del adulto y crea tarea
CREATE OR REPLACE FUNCTION public.create_task(
  p_title text,
  p_description text,
  p_child_id uuid,
  p_created_by uuid,
  p_token_reward integer,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_task_id uuid;
  v_expires_at timestamptz;
  v_deducted integer := 0;
  v_batch record;
  v_details jsonb := '[]'::jsonb;
BEGIN
  v_expires_at := COALESCE(p_expires_at, now() + interval '7 days');

  -- Deduct tokens del adulto (FIFO, batches no vencidos, sin from_child_transfer)
  FOR v_batch IN
    SELECT id, remaining, expires_at
    FROM public.token_batches
    WHERE user_id = p_created_by AND remaining > 0 AND expires_at > now() AND from_child_transfer = false
    ORDER BY expires_at ASC, acquired_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_deducted >= p_token_reward;
    DECLARE
      v_needed integer := p_token_reward - v_deducted;
      v_take integer := LEAST(v_needed, v_batch.remaining);
    BEGIN
      UPDATE public.token_batches SET remaining = remaining - v_take WHERE id = v_batch.id;
      v_deducted := v_deducted + v_take;
      v_details := v_details || jsonb_build_array(jsonb_build_object('amount', v_take, 'expires_at', v_batch.expires_at));
    END;
  END LOOP;

  IF v_deducted < p_token_reward THEN
    RAISE EXCEPTION 'Saldo insuficiente: necesita % tokens, tiene %', p_token_reward, v_deducted;
  END IF;

  INSERT INTO public.tasks (title, description, child_id, created_by, token_reward, status, expires_at, deduction_details)
  VALUES (p_title, p_description, p_child_id, p_created_by, p_token_reward, 'pending', v_expires_at, v_details)
  RETURNING id INTO v_task_id;

  RETURN jsonb_build_object(
    'id', v_task_id,
    'deducted', v_deducted
  );
END;
$$;

-- completeTask: menor marca como completada
CREATE OR REPLACE FUNCTION public.complete_task(p_task_id uuid, p_child_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.tasks
  SET status = 'completed', completed_at = now()
  WHERE id = p_task_id AND child_id = p_child_id AND status IN ('pending', 'in_progress');
  RETURN FOUND;
END;
$$;

-- approveTask: adulto aprueba y acredita tokens al menor
CREATE OR REPLACE FUNCTION public.approve_task(p_task_id uuid, p_adult_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_task record;
  v_detail jsonb;
  v_batch_id uuid;
  v_first_batch_id uuid;
BEGIN
  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id AND created_by = p_adult_id AND status = 'completed';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tarea no encontrada o no completada');
  END IF;

  UPDATE public.tasks SET status = 'approved', approved_at = now() WHERE id = p_task_id;

  -- Crear un batch por cada entrada en deduction_details, preservando expires_at original
  IF jsonb_array_length(v_task.deduction_details) > 0 THEN
    FOR v_detail IN SELECT * FROM jsonb_array_elements(v_task.deduction_details)
    LOOP
      INSERT INTO public.token_batches (user_id, amount, remaining, source, acquired_at, expires_at)
      VALUES (v_task.child_id, (v_detail->>'amount')::int, (v_detail->>'amount')::int, 'task_reward', now(), (v_detail->>'expires_at')::timestamptz)
      RETURNING id INTO v_batch_id;
      IF v_first_batch_id IS NULL THEN v_first_batch_id := v_batch_id; END IF;
    END LOOP;
  ELSE
    -- Fallback para tareas legacy sin deduction_details
    INSERT INTO public.token_batches (user_id, amount, remaining, source, acquired_at, expires_at)
    VALUES (v_task.child_id, v_task.token_reward, v_task.token_reward, 'task_reward', now(), now() + interval '6 months')
    RETURNING id INTO v_first_batch_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'batch_id', v_first_batch_id);
END;
$$;

-- rejectTask
CREATE OR REPLACE FUNCTION public.reject_task(p_task_id uuid, p_adult_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.tasks
  SET status = 'rejected'
  WHERE id = p_task_id AND created_by = p_adult_id AND status = 'completed';
  RETURN FOUND;
END;
$$;

-- transferTokens: núcleo de transferencias
CREATE OR REPLACE FUNCTION public.transfer_tokens(
  p_from_user_id uuid,
  p_to_user_id uuid,
  p_amount integer,
  p_expiry_mode text DEFAULT 'transfer',
  p_lock_tokens boolean DEFAULT false,
  p_source text DEFAULT 'transfer'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_from_role text;
  v_to_role text;
  v_is_cross_child boolean;
  v_never_return boolean;
  v_rem integer := p_amount;
  v_transferred integer := 0;
  v_expired_lost integer := 0;
  v_transfer_lost integer := 0;
  v_expired_skipped integer := 0;
  v_transfer_skipped integer := 0;
  v_batch record;
  v_new_id uuid;
BEGIN
  SELECT role INTO v_from_role FROM public.profiles WHERE id = p_from_user_id;
  SELECT role INTO v_to_role FROM public.profiles WHERE id = p_to_user_id;
  v_is_cross_child := v_from_role = 'menor' AND v_to_role = 'menor';
  v_never_return := v_is_cross_child OR p_lock_tokens;

  FOR v_batch IN
    SELECT id, remaining, expires_at, from_child_transfer
    FROM public.token_batches
    WHERE user_id = p_from_user_id AND remaining > 0
    ORDER BY
      CASE
        WHEN p_expiry_mode = 'consume' AND expires_at <= now() THEN 0
        WHEN p_expiry_mode = 'consume' AND from_child_transfer THEN 1
        WHEN p_expiry_mode = 'consume' THEN 2
        WHEN (v_is_cross_child OR p_lock_tokens) AND NOT from_child_transfer THEN 1
        ELSE 0
      END ASC,
      expires_at ASC,
      acquired_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_rem <= 0;

    DECLARE
      v_take integer := LEAST(v_rem, v_batch.remaining);
      v_is_expired boolean := v_batch.expires_at <= now();
    BEGIN
      -- Skip mode: saltar vencidos y de transferencia
      IF p_expiry_mode = 'transfer' AND (v_is_expired OR v_batch.from_child_transfer) THEN
        IF v_is_expired THEN v_expired_skipped := v_expired_skipped + v_batch.remaining;
        ELSE v_transfer_skipped := v_transfer_skipped + v_batch.remaining; END IF;
        CONTINUE;
      END IF;

      -- Deduct del origen
      UPDATE public.token_batches SET remaining = remaining - v_take WHERE id = v_batch.id;
      v_rem := v_rem - v_take;

      -- Consume mode: vencidos/transfer se pierden
      IF p_expiry_mode = 'consume' AND (v_is_expired OR v_batch.from_child_transfer) THEN
        IF v_is_expired THEN v_expired_lost := v_expired_lost + v_take;
        ELSE v_transfer_lost := v_transfer_lost + v_take; END IF;
        CONTINUE;
      END IF;

      -- Transferir al destino
      v_transferred := v_transferred + v_take;
      INSERT INTO public.token_batches (user_id, amount, remaining, source, acquired_at, expires_at, from_child_transfer)
      VALUES (p_to_user_id, v_take, v_take, p_source, now(), v_batch.expires_at, v_never_return OR v_batch.from_child_transfer);
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', (v_rem <= 0),
    'transferred', v_transferred,
    'expired_lost', v_expired_lost,
    'transfer_lost', v_transfer_lost,
    'expired_skipped', v_expired_skipped,
    'transfer_skipped', v_transfer_skipped,
    'remaining', GREATEST(v_rem, 0)
  );
END;
$$;

-- spendTokens: consume lotes sin retorno (para canje de premios)
CREATE OR REPLACE FUNCTION public.spend_tokens(p_user_id uuid, p_amount integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_rem integer := p_amount;
  v_spent integer := 0;
  v_expired_lost integer := 0;
  v_transfer_lost integer := 0;
  v_batch record;
BEGIN
  FOR v_batch IN
    SELECT id, remaining, expires_at, from_child_transfer
    FROM public.token_batches
    WHERE user_id = p_user_id AND remaining > 0
    ORDER BY
      CASE WHEN from_child_transfer THEN 1 ELSE 0 END DESC,
      expires_at ASC,
      acquired_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_rem <= 0;
    DECLARE
      v_take integer := LEAST(v_rem, v_batch.remaining);
      v_is_expired boolean := v_batch.expires_at <= now();
    BEGIN
      UPDATE public.token_batches SET remaining = remaining - v_take WHERE id = v_batch.id;
      v_rem := v_rem - v_take;
      IF v_is_expired THEN v_expired_lost := v_expired_lost + v_take;
      ELSIF v_batch.from_child_transfer THEN v_transfer_lost := v_transfer_lost + v_take;
      ELSE v_spent := v_spent + v_take; END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', (v_rem <= 0),
    'spent', v_spent,
    'expired_lost', v_expired_lost,
    'transfer_lost', v_transfer_lost,
    'remaining', GREATEST(v_rem, 0)
  );
END;
$$;

-- expireOverdueTasks: vence tareas pendientes vencidas, devuelve tokens al adulto
CREATE OR REPLACE FUNCTION public.expire_overdue_tasks()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count integer := 0;
  v_task record;
  v_detail jsonb;
BEGIN
  FOR v_task IN
    SELECT * FROM public.tasks
    WHERE status = 'pending' AND expires_at <= now()
    FOR UPDATE
  LOOP
    UPDATE public.tasks SET status = 'expired' WHERE id = v_task.id;

    -- Refund usando deduction_details para preservar expires_at original
    IF jsonb_array_length(v_task.deduction_details) > 0 THEN
      FOR v_detail IN SELECT * FROM jsonb_array_elements(v_task.deduction_details)
      LOOP
        INSERT INTO public.token_batches (user_id, amount, remaining, source, acquired_at, expires_at)
        VALUES (v_task.created_by, (v_detail->>'amount')::int, (v_detail->>'amount')::int, 'expired_refund', now(), (v_detail->>'expires_at')::timestamptz);
      END LOOP;
    ELSE
      -- Fallback para tareas legacy sin deduction_details
      INSERT INTO public.token_batches (user_id, amount, remaining, source, acquired_at, expires_at)
      VALUES (v_task.created_by, v_task.token_reward, v_task.token_reward, 'expired_refund', now(), now() + interval '6 months');
    END IF;

    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- getPendingTaskTokens: suma rewards de tareas pendientes de un adulto
CREATE OR REPLACE FUNCTION public.get_pending_task_tokens(p_adult_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total integer;
BEGIN
  SELECT COALESCE(SUM(token_reward), 0) INTO v_total
  FROM public.tasks
  WHERE created_by = p_adult_id AND status = 'pending';
  RETURN v_total;
END;
$$;

-- Tabla de canjes (premios y sorpresas pendientes de entrega)
CREATE TABLE IF NOT EXISTS public.redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  adult_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('prize', 'surprise')),
  title text NOT NULL,
  token_cost integer NOT NULL CHECK (token_cost > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered')),
  redemption_details jsonb NOT NULL DEFAULT '[]'::jsonb,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_redemptions_adult ON public.redemptions(adult_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_child ON public.redemptions(child_id);

ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "redemptions_self" ON public.redemptions;
CREATE POLICY "redemptions_self" ON public.redemptions
  FOR ALL USING (child_id = auth.uid() OR adult_id = auth.uid());

-- create_redemption: descuenta tokens del menor y crea registro de canje (sin devolver al tutor)
CREATE OR REPLACE FUNCTION public.create_redemption(
  p_child_id uuid,
  p_adult_id uuid,
  p_type text,
  p_title text,
  p_token_cost integer
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_rem integer := p_token_cost;
  v_spent integer := 0;
  v_expired_lost integer := 0;
  v_transfer_lost integer := 0;
  v_details jsonb := '[]'::jsonb;
  v_batch record;
  v_redemption_id uuid;
  v_recoverable integer := 0;
BEGIN
  -- Consumir lotes del menor priorizando: vencidos → from_child_transfer → vigentes
  FOR v_batch IN
    SELECT id, remaining, expires_at, from_child_transfer
    FROM public.token_batches
    WHERE user_id = p_child_id AND remaining > 0
    ORDER BY
      CASE
        WHEN expires_at <= now() THEN 0
        WHEN from_child_transfer THEN 1
        ELSE 2
      END ASC,
      expires_at ASC,
      acquired_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_rem <= 0;

    DECLARE
      v_take integer := LEAST(v_rem, v_batch.remaining);
      v_is_expired boolean := v_batch.expires_at <= now();
    BEGIN
      UPDATE public.token_batches SET remaining = remaining - v_take WHERE id = v_batch.id;
      v_rem := v_rem - v_take;

      -- Guardar detalle del lote consumido
      v_details := v_details || jsonb_build_array(jsonb_build_object(
        'amount', v_take,
        'expires_at', v_batch.expires_at,
        'from_child_transfer', v_batch.from_child_transfer
      ));

      IF v_is_expired THEN
        v_expired_lost := v_expired_lost + v_take;
      ELSIF v_batch.from_child_transfer THEN
        v_transfer_lost := v_transfer_lost + v_take;
      ELSE
        v_spent := v_spent + v_take;
        v_recoverable := v_recoverable + v_take;
      END IF;
    END;
  END LOOP;

  IF v_rem > 0 THEN
    RETURN jsonb_build_object(
      'success', false, 'error', 'Saldo insuficiente',
      'remaining', v_rem
    );
  END IF;

  INSERT INTO public.redemptions (child_id, adult_id, type, title, token_cost, redemption_details)
  VALUES (p_child_id, p_adult_id, p_type, p_title, p_token_cost, v_details)
  RETURNING id INTO v_redemption_id;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_redemption_id,
    'spent', v_spent,
    'expired_lost', v_expired_lost,
    'transfer_lost', v_transfer_lost,
    'recoverable', v_recoverable
  );
END;
$$;

-- deliver_redemption: entrega premio, recupera tokens vigentes al tutor
CREATE OR REPLACE FUNCTION public.deliver_redemption(p_redemption_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_red record;
  v_detail jsonb;
  v_recovered integer := 0;
  v_expired_lost integer := 0;
  v_transfer_lost integer := 0;
  v_fulfilled_source text;
BEGIN
  SELECT * INTO v_red FROM public.redemptions WHERE id = p_redemption_id AND status = 'pending';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Canje no encontrado o ya entregado');
  END IF;

  v_fulfilled_source := CASE v_red.type
    WHEN 'prize' THEN 'prize_fulfilled'
    WHEN 'surprise' THEN 'surprise_fulfilled'
  END;

  -- Recorrer lotes retenidos
  FOR v_detail IN SELECT * FROM jsonb_array_elements(v_red.redemption_details)
  LOOP
    DECLARE
      v_amount integer := (v_detail->>'amount')::int;
      v_expires_at timestamptz := (v_detail->>'expires_at')::timestamptz;
      v_from_child_transfer boolean := COALESCE((v_detail->>'from_child_transfer')::boolean, false);
    BEGIN
      IF v_expires_at > now() AND NOT v_from_child_transfer THEN
        -- Recuperable: crear batch para el tutor
        INSERT INTO public.token_batches (user_id, amount, remaining, source, acquired_at, expires_at)
        VALUES (v_red.adult_id, v_amount, v_amount, v_fulfilled_source, now(), v_expires_at);
        v_recovered := v_recovered + v_amount;
      ELSIF v_expires_at <= now() THEN
        v_expired_lost := v_expired_lost + v_amount;
      ELSE
        v_transfer_lost := v_transfer_lost + v_amount;
      END IF;
    END;
  END LOOP;

  UPDATE public.redemptions
  SET status = 'delivered', delivered_at = now()
  WHERE id = p_redemption_id;

  RETURN jsonb_build_object(
    'success', true,
    'recovered', v_recovered,
    'expired_lost', v_expired_lost,
    'transfer_lost', v_transfer_lost
  );
END;
$$;
