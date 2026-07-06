-- ==============================
-- TODO EN UNO: RPCs + Trigger + Demo users
-- ==============================

-- 1. RPC: buscar perfiles (registro: duplicados, codigo tutor, referido)
CREATE OR REPLACE FUNCTION public.lookup_profile(search_text TEXT)
RETURNS TABLE(user_id UUID, user_alias TEXT, user_phone TEXT, user_email TEXT, user_role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER STABLE
AS $$
DECLARE digits TEXT;
BEGIN
  digits := regexp_replace(search_text, '\D', '', 'g');
  RETURN QUERY
  SELECT p.id, p.alias, p.phone, p.email, p.role
  FROM public.profiles p
  WHERE p.email = search_text
     OR p.phone = search_text
     OR (length(digits) > 5 AND replace(p.phone, ' ', '') LIKE '%' || digits)
  LIMIT 1;
END;
$$;
GRANT EXECUTE ON FUNCTION public.lookup_profile TO anon;

-- 2. RPC: Busqueda para login
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
     OR p.phone = search_text
     OR (length(digits) > 5 AND replace(p.phone, ' ', '') LIKE '%' || digits)
  LIMIT 1;
END;
$$;
GRANT EXECUTE ON FUNCTION public.find_user_for_login TO anon;

-- 3. RPC: recuperacion de contrasena
CREATE OR REPLACE FUNCTION public.recover_password(user_id UUID, new_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE auth.users SET encrypted_password = crypt(new_password, gen_salt('bf')), updated_at = now() WHERE id = user_id;
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.recover_password TO anon;

-- 4. Trigger: crea perfil completo desde raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre, apellido, alias, phone, age, fecha_nac, role, created_at)
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
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


