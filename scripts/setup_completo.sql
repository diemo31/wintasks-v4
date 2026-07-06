-- ==============================
-- SETUP COMPLETO: RPCs y Triggers
-- ==============================

-- 1. RPC: Búsqueda general de perfiles (registro: duplicados, código tutor, referido)
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
     OR (length(digits) > 5 AND replace(p.phone, ' ', '') LIKE '%' || digits)
  LIMIT 1;
END;
$$;
GRANT EXECUTE ON FUNCTION public.lookup_profile TO anon;

-- 2. RPC: Búsqueda para login (alias, email o teléfono → email para signInWithPassword)
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
     OR (length(digits) > 5 AND replace(p.phone, ' ', '') LIKE '%' || digits)
  LIMIT 1;
END;
$$;
GRANT EXECUTE ON FUNCTION public.find_user_for_login TO anon;

-- 3. RPC: Recuperación de contraseña
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

-- 4. RPC: Setear teléfono en auth.users (bypass verificación SMS)
CREATE OR REPLACE FUNCTION public.set_user_phone(user_id UUID, phone_number TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE auth.users
  SET phone = phone_number,
      updated_at = now()
  WHERE id = user_id;
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_user_phone TO anon, authenticated;

-- 5. Trigger: crea perfil completo desde raw_user_meta_data al registrarse en Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre, apellido, alias, phone, age, fecha_nac, role, tutor_id, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
    COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
    COALESCE(NEW.raw_user_meta_data->>'alias', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE((NEW.raw_user_meta_data->>'age')::int, 0),
    COALESCE(to_date(NULLIF(NEW.raw_user_meta_data->>'fecha_nac', ''), 'DD/MM/YYYY'), NULL),
    COALESCE(NEW.raw_user_meta_data->>'role', 'adulto'),
    NULLIF(NEW.raw_user_meta_data->>'tutor_id', '')::uuid,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
