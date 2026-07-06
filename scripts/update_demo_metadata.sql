-- Actualizar metadata de usuarios demo en auth.users
UPDATE auth.users
SET raw_user_meta_data = 
  CASE id
    WHEN '5c44f263-cb3d-4e4e-9d9d-97956bc882f3'::uuid THEN
      jsonb_build_object(
        'display_name', 'Guille Padre',
        'phone', '+541111111111',
        'alias', 'guillepadre',
        'role', 'adulto'
      )
    WHEN '3317ce61-1473-44e6-b5c5-5d5e4f140aa6'::uuid THEN
      jsonb_build_object(
        'display_name', 'Anita Hernandez',
        'phone', '+541122222222',
        'alias', 'anita123',
        'role', 'menor',
        'tutor_id', '5c44f263-cb3d-4e4e-9d9d-97956bc882f3'
      )
  END
WHERE id IN ('5c44f263-cb3d-4e4e-9d9d-97956bc882f3'::uuid, '3317ce61-1473-44e6-b5c5-5d5e4f140aa6'::uuid);

-- Insertar o actualizar perfiles en public.profiles
INSERT INTO public.profiles (id, nombre, apellido, email, alias, phone, age, fecha_nac, role, tutor_id, created_at)
VALUES
  ('5c44f263-cb3d-4e4e-9d9d-97956bc882f3'::uuid, 'Guille', 'Padre', 'guilleadulto@gmail.com', 'guillepadre', '+541111111111', 40, '1984-06-15', 'adulto', NULL, now()),
  ('3317ce61-1473-44e6-b5c5-5d5e4f140aa6'::uuid, 'Anita', 'Hernandez', 'anita123@gmail.com', 'anita123', '+541122222222', 10, '2016-05-20', 'menor', '5c44f263-cb3d-4e4e-9d9d-97956bc882f3'::uuid, now())
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre, apellido = EXCLUDED.apellido, email = EXCLUDED.email,
  alias = EXCLUDED.alias, phone = EXCLUDED.phone, age = EXCLUDED.age,
  fecha_nac = EXCLUDED.fecha_nac, role = EXCLUDED.role, tutor_id = EXCLUDED.tutor_id;
