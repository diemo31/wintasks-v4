-- Agregar columna description si no existe
ALTER TABLE public.prizes ADD COLUMN IF NOT EXISTS description text DEFAULT '';

-- Grants para RPCs de premios
GRANT EXECUTE ON FUNCTION public.create_prize TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_prize TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_prize_used TO anon, authenticated;

-- Grants para sorpresas (cuando las migremos)
GRANT EXECUTE ON FUNCTION public.create_surprise TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_surprise TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_surprise TO anon, authenticated;
