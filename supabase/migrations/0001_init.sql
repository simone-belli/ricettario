-- Ricettario initial schema.
-- Run once in the Supabase SQL editor (or with `supabase db push`).

-- Who may use the app. Sign-ups are disabled in Supabase Auth; this table is a
-- second line of defence enforced by every RLS policy below.
create table public.allowed_emails (
  email text primary key
);

-- Replace with Simone's and Kat's real addresses.
insert into public.allowed_emails (email) values
  ('simone@example.com'),
  ('kat@example.com');

alter table public.allowed_emails enable row level security;
-- No policies: the table is only readable through is_allowed_user() below.

create or replace function public.is_allowed_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.allowed_emails
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

-- Recipes. Ingredients and steps are ordered lists, stored as JSON on the row so
-- a recipe is always read and written as one unit.
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  kind text not null default 'portion' check (kind in ('portion', 'batch')),
  -- Only for batch recipes, e.g. "1 cake, 24 cm tin".
  batch_yield text not null default '',
  notes text not null default '',
  tags text[] not null default '{}',
  -- [{ name, quantity (number | null), unit, scaling: linear|rounded|fixed, note }]
  -- Quantities are per adult portion (portion recipes) or per batch.
  ingredients jsonb not null default '[]' check (jsonb_typeof(ingredients) = 'array'),
  -- ["step one", "step two", ...]
  steps jsonb not null default '[]' check (jsonb_typeof(steps) = 'array'),
  source_url text,
  source_text text,
  -- Paths inside the recipe-photos storage bucket.
  photo_paths text[] not null default '{}',
  created_by uuid references auth.users (id) default auth.uid(),
  updated_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recipes_updated_at_idx on public.recipes (updated_at desc);

create or replace function public.touch_recipe()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger recipes_touch
  before update on public.recipes
  for each row execute function public.touch_recipe();

alter table public.recipes enable row level security;

create policy "allowed users read recipes" on public.recipes
  for select to authenticated using (public.is_allowed_user());
create policy "allowed users add recipes" on public.recipes
  for insert to authenticated with check (public.is_allowed_user());
create policy "allowed users edit recipes" on public.recipes
  for update to authenticated using (public.is_allowed_user()) with check (public.is_allowed_user());
create policy "allowed users delete recipes" on public.recipes
  for delete to authenticated using (public.is_allowed_user());

-- Household settings: a single shared row with the default family composition.
create table public.settings (
  id boolean primary key default true check (id),
  default_adults integer not null default 2 check (default_adults between 0 and 20),
  default_children integer not null default 2 check (default_children between 0 and 20)
);

insert into public.settings (id) values (true);

alter table public.settings enable row level security;

create policy "allowed users read settings" on public.settings
  for select to authenticated using (public.is_allowed_user());
create policy "allowed users edit settings" on public.settings
  for update to authenticated using (public.is_allowed_user()) with check (public.is_allowed_user());

-- Live updates: both phones see each other's changes immediately.
alter publication supabase_realtime add table public.recipes;
alter publication supabase_realtime add table public.settings;

-- Private bucket for the original notebook photos.
insert into storage.buckets (id, name, public)
values ('recipe-photos', 'recipe-photos', false);

create policy "allowed users read photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'recipe-photos' and public.is_allowed_user());
create policy "allowed users upload photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'recipe-photos' and public.is_allowed_user());
create policy "allowed users delete photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'recipe-photos' and public.is_allowed_user());
