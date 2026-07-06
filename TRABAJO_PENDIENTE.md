# Trabajo Pendiente

## TP000: Crear menor vía RPC admin (evitar session flicker)
- Usar `auth.admin.create_user()` en un RPC SECURITY DEFINER desde el servidor
- Nunca toca la sesión del adulto — elimina la necesidad de save/restore session
- Pendiente de implementar (actualmente se hace con save/restore + loading overlay para ocultar el flicker)

## TP001: Validación de email en producción (Registro)

1. **DNS lookup (registro MX)**: verificar que el dominio del email tenga servidores de correo configurados
2. **SMTP handshake**: verificar que la casilla exista sin enviar un mensaje

> Referencia: comportamiento de servidores de correo reales para validación de direcciones.

## TP002: Servicio de verificación SMS para números de teléfono

Configurar un servicio de verificación por SMS de números de teléfono. Esto nos va a asegurar que el teléfono existe.

## TP003: Refactorizar phone en signUp si se implementa Auth SMS

Si TP002 se implementa con Supabase Auth SMS (`signInWithOtp` + `verifyOtp`), el teléfono ya queda autenticado en `auth.users.phone`. En ese caso:

- Eliminar `phone` como parámetro directo de `signUp({ email, password, phone })` (no hace falta, ya lo tiene Auth)
- Mantener `phone` dentro de `options.data` para que el trigger lo guarde en `profiles.phone`

Si TP02 se implementa con un servicio externo (Twilio, etc.), dejar `phone` como está ahora (parámetro directo + options.data).

