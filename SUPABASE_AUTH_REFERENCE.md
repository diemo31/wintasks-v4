# Supabase Auth — Referencia Práctica

## auth.users — Columnas Reales vs. Metadata

### Columnas reales (UPDATE directo desde SQL Editor)

| Columna | Tipo | Uso |
|---------|------|-----|
| `id` | UUID | Primary key |
| `email` | text | Email del usuario |
| `phone` | text | Teléfono (setear via RPC `set_user_phone`, NO via signUp con email) |
| `encrypted_password` | text | Hash bcrypt |
| `confirmed_at` | timestamptz | Confirmación de email |
| `email_confirmed_at` | timestamptz | Confirmación de email |
| `phone_confirmed_at` | timestamptz | Confirmación de teléfono |
| `last_sign_in_at` | timestamptz | Último login |
| `raw_user_meta_data` | jsonb | **Acá va todo lo demás** (ver abajo) |
| `raw_app_meta_data` | jsonb | Metadata de la app (provider, etc) |
| `role` | text | `authenticated` |
| `aud` | text | `authenticated` |
| `is_anonymous` | boolean | |
| `is_sso_user` | boolean | |
| `updated_at` | timestamptz | |

### Lo que NO es columna (va en `raw_user_meta_data`)

- `display_name`
- `nombre`
- `apellido`
- `alias`
- `age`
- `fecha_nac`
- `phone` (también se guarda acá para el trigger)
- `role` (adulto/menor)
- `tutor_id`
- `email_verified`
- `phone_verified`

## Cómo actualizar metadata

```sql
-- Mergear/agregar campos
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"display_name": "Nuevo Nombre"}'::jsonb
WHERE id = 'uuid-del-usuario';

-- Reemplazar todo
UPDATE auth.users 
SET raw_user_meta_data = '{"display_name": "Nuevo", "alias": "nuevo"}'::jsonb
WHERE id = 'uuid-del-usuario';
```

## Cómo crear usuarios de prueba (SQL directo)

No se puede crear en `auth.users` directamente (tiene triggers y constraints internos). Usar:
1. Dashboard → Authentication → Users → Invite
2. O registrarse desde la app
3. O usar `supabase.auth.admin.createUser()` desde un backend con service_role

## El problema del teléfono

### Por qué no se guarda automáticamente

Supabase Auth NO permite `signUp({ email, password, phone })` — el SDK ignora `phone` cuando `email` está presente. Es una limitación de diseño de GoTrue (confirmado en issues #1305, #1694, #1840).

### Solución final (funcionando)

1. `signUp({ email, password, phone, options: { data: { phone } } })` — `phone` top-level registra el provider **phone** en `raw_app_meta_data.providers` (además de `email`). También va en `raw_user_meta_data` para el trigger.
2. Trigger `handle_new_user` lo copia a `profiles.phone`
3. `set_user_phone` RPC (SECURITY DEFINER) escribe directo en `auth.users.phone`

**Importante**: `phone` como parámetro top-level de `signUp` NO setea `auth.users.phone` (GoTrue lo ignora con email presente), pero SÍ registra el identity provider. Luego el RPC lo setea en la columna real.

### RPC `set_user_phone`

```sql
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
```

**Llamada desde el cliente:**
```js
const { error } = await supabase.rpc('set_user_phone', {
  user_id: data.user.id,
  phone_number: phone,
});
```

## Demo users (UUIDs)

| Alias | Email | UUID | Rol |
|-------|-------|------|-----|
| guillepadre | guilleadulto@gmail.com | `5c44f263-...` | adulto |
| anita123 | anita123@gmail.com | `3317ce61-...` | menor |
| lucasmayor | lucasmayor@gmail.com | `509876b9-...` | adulto |

## RPCs existentes

| RPC | Propósito | Grant |
|-----|-----------|-------|
| `lookup_profile(text)` | Buscar perfiles (registro, tutor, referido) | anon |
| `find_user_for_login(text)` | Resolver alias/phone a email para login | anon |
| `recover_password(uuid, text)` | Reset de contraseña sin auth | anon |
| `set_user_phone(uuid, text)` | Setear `auth.users.phone` directo | anon, authenticated |

## Scripts SQL

| Archivo | Contenido |
|---------|-----------|
| `scripts/setup_completo.sql` | Todos los RPCs + trigger en un solo archivo |
| `scripts/update_demo_metadata.sql` | INSERT/UPDATE de perfiles demo |
