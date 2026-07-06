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
CREATE POLICY "prizes_self" ON public.prizes FOR ALL USING (created_by = auth.uid());

DROP POLICY IF EXISTS "prizes_read_children" ON public.prizes;
CREATE POLICY "prizes_read_children" ON public.prizes FOR SELECT USING (
  created_by IN (SELECT tutor_id FROM public.profiles WHERE id = auth.uid())
);

CREATE OR REPLACE FUNCTION public.create_prize(p_title text, p_description text, p_token_cost integer, p_created_by uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$DECLARE v_id uuid;BEGIN INSERT INTO public.prizes(title,description,token_cost,created_by)VALUES(p_title,p_description,p_token_cost,p_created_by)RETURNING id INTO v_id;RETURN jsonb_build_object('success',true,'id',v_id);END;$$;

CREATE OR REPLACE FUNCTION public.delete_prize(p_prize_id uuid, p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$BEGIN DELETE FROM public.prizes WHERE id=p_prize_id AND created_by=p_user_id;RETURN jsonb_build_object('success',true);END;$$;

CREATE OR REPLACE FUNCTION public.increment_prize_used(p_prize_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$BEGIN UPDATE public.prizes SET used_count=used_count+1 WHERE id=p_prize_id;RETURN jsonb_build_object('success',true);END;$$;
