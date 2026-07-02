-- Crear funcion publica para buscar usuarios al hacer login
-- SECURITY DEFINER = se ejecuta con permisos del creador (bypassea RLS)
CREATE OR REPLACE FUNCTION public.find_user_for_login(search_text TEXT)
RETURNS TABLE(user_id UUID, user_email TEXT, user_alias TEXT, user_phone TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  digits TEXT;
BEGIN
  digits := regexp_replace(search_text, '\D', '', 'g');

  RETURN QUERY
  SELECT p.id, p.email, p.alias, p.phone
  FROM public.profiles p
  WHERE p.email = search_text
     OR p.alias = search_text
     OR p.phone = search_text
     OR replace(p.phone, ' ', '') LIKE '%' || digits
  LIMIT 1;
END;
$$;

-- Permitir que usuarios anonimos llamen a esta funcion
GRANT EXECUTE ON FUNCTION public.find_user_for_login TO anon;
