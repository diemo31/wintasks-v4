CREATE OR REPLACE FUNCTION public.get_score_goal(p_user_id uuid, p_month_key text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_goal integer;
BEGIN
  SELECT goal INTO v_goal FROM public.score_goals
    WHERE user_id = p_user_id AND month_key = p_month_key;
  RETURN v_goal;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_score_goal(p_user_id uuid, p_month_key text, p_goal integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.score_goals (user_id, month_key, goal)
    VALUES (p_user_id, p_month_key, p_goal)
    ON CONFLICT (user_id, month_key) DO UPDATE SET goal = p_goal;
  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_score_goal TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_score_goal TO anon, authenticated;
