-- Seed data: 200 tokens de bienvenida para cada adulto demo
-- Los menores empiezan sin tokens (los ganan haciendo tareas)
-- Ejecutar DESPUÉS de setup_stage2.sql

-- Analia Mayor
INSERT INTO public.token_batches (user_id, amount, remaining, source, acquired_at, expires_at)
SELECT 'dcdbbed7-9fc4-48e2-84ba-be603fb8cbe0', 200, 200, 'signup', now(), now() + interval '6 months'
WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = 'dcdbbed7-9fc4-48e2-84ba-be603fb8cbe0');

-- Guille Mayor
INSERT INTO public.token_batches (user_id, amount, remaining, source, acquired_at, expires_at)
SELECT '5c44f263-cb3d-4e4e-9d9d-97956bc882f3', 200, 200, 'signup', now(), now() + interval '6 months'
WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = '5c44f263-cb3d-4e4e-9d9d-97956bc882f3');

-- Lucas Mayor
INSERT INTO public.token_batches (user_id, amount, remaining, source, acquired_at, expires_at)
SELECT '509876b9-20a6-4266-8ff5-b7a487d5b1cd', 200, 200, 'signup', now(), now() + interval '6 months'
WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = '509876b9-20a6-4266-8ff5-b7a487d5b1cd');

-- Mario Mayor
INSERT INTO public.token_batches (user_id, amount, remaining, source, acquired_at, expires_at)
SELECT 'bba4cd82-021e-473a-89ba-66492fed8d8b', 200, 200, 'signup', now(), now() + interval '6 months'
WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = 'bba4cd82-021e-473a-89ba-66492fed8d8b');
