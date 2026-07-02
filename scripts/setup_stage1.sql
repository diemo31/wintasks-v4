-- RPC: Busqueda general de perfiles (para registro: duplicados, codigo tutor, referido)
CREATE OR REPLACE FUNCTION public.lookup_profile(search_text TEXT)
RETURNS TABLE(user_id UUID, user_alias TEXT, user_phone TEXT, user_email TEXT, user_role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  digits TEXT;
BEGIN
  digits := regexp_replace(search_text, '\D', '', 'g');
  RETURN QUERY
  SELECT p.id, p.alias, p.phone, p.email, p.role
  FROM public.profiles p
  WHERE p.email = search_text
     OR p.alias = search_text
     OR p.phone = search_text
     OR replace(p.phone, ' ', '') LIKE '%' || digits
  LIMIT 1;
END;
$$;
GRANT EXECUTE ON FUNCTION public.lookup_profile TO anon;

-- RPC: Recuperacion de contrasena (actualiza auth.users via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.recover_password(user_id UUID, new_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = user_id;
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.recover_password TO anon;
