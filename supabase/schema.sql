-- Mapa de DEA y hospitales (Provincia de Buenos Aires)
-- Corré este script en el SQL Editor de Supabase.
-- Si lo corrés de nuevo, las políticas se reemplazan.
-- Las tablas que ya existen no se modifican.
--
-- Después:
-- 1. Authentication > Sign In / Providers > Email: dejá activado "Allow new users to sign up".
--    Quien se registra entra como miembro.
-- 2. Al primer usuario, descomentá y ejecutá el update de admin del final.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  full_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('dea', 'hospital_alta', 'hospital_media', 'hospital_baja', 'otra')),
  other_label text,
  lat double precision not null,
  lng double precision not null,
  address text,
  locality text,
  partido text,
  phone text,
  notes text,
  source text not null default 'user' check (source in ('import', 'user')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint locations_name_not_blank check (char_length(name) > 0 and char_length(name) <= 120),
  constraint locations_other_label_check check (
    (kind = 'otra' and other_label is not null and char_length(other_label) > 0 and char_length(other_label) <= 60)
    or (kind <> 'otra' and other_label is null)
  ),
  constraint locations_address_length check (address is null or char_length(address) <= 200),
  constraint locations_locality_length check (locality is null or char_length(locality) <= 120),
  constraint locations_partido_length check (partido is null or char_length(partido) <= 120),
  constraint locations_phone_length check (phone is null or char_length(phone) <= 40),
  constraint locations_notes_length check (notes is null or char_length(notes) <= 500),
  constraint locations_in_region check (
    lat between -41.3 and -33.0
    and lng between -63.9 and -56.4
  )
);

create index if not exists locations_viewport_idx on public.locations (lat, lng);
create index if not exists locations_kind_idx on public.locations (kind);

create or replace function public.normalize_location()
returns trigger
language plpgsql
as $$
begin
  new.name = btrim(new.name);
  if new.kind = 'otra' then
    new.other_label = nullif(btrim(coalesce(new.other_label, '')), '');
  else
    new.other_label = null;
  end if;
  new.address = nullif(btrim(coalesce(new.address, '')), '');
  new.locality = nullif(btrim(coalesce(new.locality, '')), '');
  new.partido = nullif(btrim(coalesce(new.partido, '')), '');
  new.phone = nullif(btrim(coalesce(new.phone, '')), '');
  new.notes = nullif(btrim(coalesce(new.notes, '')), '');
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists locations_normalize on public.locations;
create trigger locations_normalize
  before insert or update on public.locations
  for each row execute function public.normalize_location();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, full_name)
select id, coalesce(raw_user_meta_data ->> 'full_name', '')
from auth.users
where not exists (
  select 1 from public.profiles where profiles.id = auth.users.id
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.locations enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists locations_select on public.locations;
create policy locations_select
  on public.locations
  for select
  to authenticated
  using (true);

drop policy if exists locations_insert on public.locations;
create policy locations_insert
  on public.locations
  for insert
  to authenticated
  with check (created_by = auth.uid() and source = 'user');

drop policy if exists locations_update on public.locations;
create policy locations_update
  on public.locations
  for update
  to authenticated
  using (created_by = auth.uid() or public.is_admin())
  with check (
    (created_by = auth.uid() and source = 'user')
    or public.is_admin()
  );

drop policy if exists locations_delete on public.locations;
create policy locations_delete
  on public.locations
  for delete
  to authenticated
  using (created_by = auth.uid() or public.is_admin());

revoke all on public.locations from anon;
revoke all on public.profiles from anon;
grant select, insert, update, delete on public.locations to authenticated;
grant select on public.profiles to authenticated;

-- Primer administrador (reemplazá el uuid por el de Authentication > Users):
-- update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-000000000000';
