-- Local development data. Loaded by `supabase start` and `supabase db reset`;
-- never run this against the real project.

insert into public.allowed_emails (email) values
  ('simone@example.com'),
  ('kat@example.com');

-- Two local accounts so the magic link / code sign-in works straight away.
-- Their emails arrive in the local inbox at http://127.0.0.1:54324.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated',
   'simone@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated',
   'kat@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text, jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users
where email in ('simone@example.com', 'kat@example.com');

insert into public.recipes (title, kind, batch_yield, notes, tags, ingredients, steps, created_by, updated_by) values
(
  'Ragù della nonna', 'portion', '', 'Cook it low and slow. Even better the next day.', '{pasta,sunday}',
  '[
    {"name": "minced beef", "quantity": 100, "unit": "g", "scaling": "linear", "note": ""},
    {"name": "onion", "quantity": 0.25, "unit": "", "scaling": "rounded", "note": "finely chopped"},
    {"name": "carrot", "quantity": 0.25, "unit": "", "scaling": "rounded", "note": "finely chopped"},
    {"name": "passata", "quantity": 125, "unit": "ml", "scaling": "linear", "note": ""},
    {"name": "olive oil", "quantity": 0.5, "unit": "tbsp", "scaling": "linear", "note": ""},
    {"name": "bay leaf", "quantity": 1, "unit": "", "scaling": "fixed", "note": ""},
    {"name": "salt", "quantity": null, "unit": "", "scaling": "fixed", "note": "to taste"}
  ]',
  '["Soften the onion and carrot in the oil over a low heat.", "Add the beef and brown it well.", "Add the passata and bay leaf, then simmer for 2 hours, stirring now and then."]',
  '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111'
),
(
  'Torta di mele', 'batch', '1 cake, 24 cm tin', '', '{cake}',
  '[
    {"name": "eggs", "quantity": 3, "unit": "", "scaling": "rounded", "note": ""},
    {"name": "sugar", "quantity": 150, "unit": "g", "scaling": "linear", "note": ""},
    {"name": "plain flour", "quantity": 250, "unit": "g", "scaling": "linear", "note": ""},
    {"name": "butter", "quantity": 100, "unit": "g", "scaling": "linear", "note": "melted"},
    {"name": "apples", "quantity": 3, "unit": "", "scaling": "rounded", "note": "peeled and sliced"},
    {"name": "baking powder", "quantity": 1, "unit": "tsp", "scaling": "linear", "note": ""},
    {"name": "24 cm cake tin", "quantity": null, "unit": "", "scaling": "fixed", "note": ""}
  ]',
  '["Whisk the eggs and sugar until pale.", "Fold in the flour, baking powder and melted butter.", "Pour into the tin, cover with the apple slices and bake at 180 °C for 40 minutes."]',
  '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'
);
