-- ============================================================
-- MVP v1 — Esquema inicial
-- App de organización de eventos gastronómicos
-- ============================================================

-- ---------- Enums ----------
create type public.eater_type_default as enum ('low', 'normal', 'high');
create type public.participant_eater_type as enum ('low', 'normal', 'high', 'vegetarian', 'child');
create type public.event_status as enum ('draft', 'active', 'cancelled', 'archived');
create type public.rsvp_status as enum ('pending', 'yes', 'no', 'maybe');
create type public.split_mode as enum ('equal', 'custom');

-- ---------- Helper: updated_at ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  default_eater_type public.eater_type_default not null default 'normal',
  dietary_restrictions jsonb not null default '{}',
  locale text not null default 'es',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Crear perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- event_types ----------
create table public.event_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text,
  is_global boolean not null default false,
  created_by uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_types_owner check (is_global = true or created_by is not null)
);

create trigger event_types_updated_at before update on public.event_types
  for each row execute function public.set_updated_at();

-- ---------- event_type_presets ----------
create table public.event_type_presets (
  id uuid primary key default gen_random_uuid(),
  event_type_id uuid not null references public.event_types(id) on delete cascade,
  item_name text not null,
  unit text not null,
  qty_per_adult_low numeric not null,
  qty_per_adult_normal numeric not null,
  qty_per_adult_high numeric not null,
  qty_per_child numeric not null default 0,
  is_vegetarian_safe boolean not null default true,
  category text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger event_type_presets_updated_at before update on public.event_type_presets
  for each row execute function public.set_updated_at();

create index event_type_presets_type_idx on public.event_type_presets (event_type_id);

-- ---------- events ----------
create or replace function public.generate_share_token()
returns text
language sql
volatile
as $$
  select substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
$$;

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_type_id uuid references public.event_types(id) on delete set null,
  host_id uuid not null references public.profiles(id) on delete cascade,
  event_date date not null,
  event_time time,
  location_text text,
  currency char(3) not null default 'UYU',
  status public.event_status not null default 'active',
  rsvp_deadline timestamptz,
  share_token text unique not null default public.generate_share_token(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();

create index events_host_idx on public.events (host_id);
create index events_share_token_idx on public.events (share_token);

-- ---------- event_co_organizers ----------
create table public.event_co_organizers (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- ---------- event_participants ----------
create table public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rsvp_status public.rsvp_status not null default 'pending',
  eater_type public.participant_eater_type not null,
  guest_count int not null default 0,
  guest_breakdown jsonb not null default '[]',
  notes text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create trigger event_participants_updated_at before update on public.event_participants
  for each row execute function public.set_updated_at();

create index event_participants_event_idx on public.event_participants (event_id);
create index event_participants_user_idx on public.event_participants (user_id);

-- ---------- event_items ----------
-- Los campos qty_per_* se copian del preset al instanciar el ítem,
-- para que el recálculo automático sea autocontenido. Si son null,
-- el ítem no participa del cálculo automático.
create table public.event_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  item_name text not null,
  unit text not null,
  quantity_needed numeric not null default 0,
  category text not null,
  notes text,
  sort_order int not null default 0,
  auto_calculated boolean not null default true,
  qty_per_adult_low numeric,
  qty_per_adult_normal numeric,
  qty_per_adult_high numeric,
  qty_per_child numeric,
  is_vegetarian_safe boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger event_items_updated_at before update on public.event_items
  for each row execute function public.set_updated_at();

create index event_items_event_idx on public.event_items (event_id);

-- ---------- item_assignments ----------
create table public.item_assignments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.event_items(id) on delete cascade,
  participant_id uuid not null references public.event_participants(id) on delete cascade,
  quantity numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, participant_id)
);

create trigger item_assignments_updated_at before update on public.item_assignments
  for each row execute function public.set_updated_at();

create index item_assignments_item_idx on public.item_assignments (item_id);
create index item_assignments_participant_idx on public.item_assignments (participant_id);

-- ---------- expenses ----------
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  paid_by uuid not null references public.profiles(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  amount numeric(12,2) not null check (amount > 0),
  currency char(3) not null,
  description text not null,
  item_id uuid references public.event_items(id) on delete set null,
  split_mode public.split_mode not null default 'equal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger expenses_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();

create index expenses_event_idx on public.expenses (event_id);

-- ---------- expense_shares ----------
create table public.expense_shares (
  expense_id uuid not null references public.expenses(id) on delete cascade,
  participant_id uuid not null references public.event_participants(id) on delete cascade,
  share_amount numeric(12,2) not null check (share_amount >= 0),
  primary key (expense_id, participant_id)
);

-- ---------- settlements ----------
create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  currency char(3) not null,
  note text,
  settled_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index settlements_event_idx on public.settlements (event_id);

-- ============================================================
-- Recálculo automático de cantidades (spec 5.5)
-- ============================================================
-- quantity_needed = Σ (qty según eater_type de cada confirmado y acompañantes).
-- Vegetarianos cuentan como 'normal' en ítems veg-safe y 0 en los demás.
-- Solo se recalculan ítems con auto_calculated = true y qty_per_* definidos.

create or replace function public.recalc_event_quantities(p_event_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.event_items i
  set quantity_needed = coalesce(totals.total, 0)
  from (
    select
      it.id as item_id,
      sum(
        case p.eater
          when 'low' then it.qty_per_adult_low
          when 'normal' then it.qty_per_adult_normal
          when 'high' then it.qty_per_adult_high
          when 'child' then coalesce(it.qty_per_child, 0)
          when 'vegetarian' then case when it.is_vegetarian_safe then it.qty_per_adult_normal else 0 end
          else 0
        end
      ) as total
    from public.event_items it
    cross join (
      -- participantes confirmados
      select ep.eater_type::text as eater
      from public.event_participants ep
      where ep.event_id = p_event_id and ep.rsvp_status = 'yes'
      union all
      -- acompañantes de confirmados
      select coalesce(g ->> 'eater_type', 'normal') as eater
      from public.event_participants ep,
           jsonb_array_elements(ep.guest_breakdown) as g
      where ep.event_id = p_event_id and ep.rsvp_status = 'yes'
    ) p
    where it.event_id = p_event_id
      and it.auto_calculated = true
      and it.qty_per_adult_normal is not null
    group by it.id
  ) totals
  where i.id = totals.item_id;

  -- Si no queda ningún confirmado, las cantidades auto vuelven a 0
  if not exists (
    select 1 from public.event_participants
    where event_id = p_event_id and rsvp_status = 'yes'
  ) then
    update public.event_items
    set quantity_needed = 0
    where event_id = p_event_id
      and auto_calculated = true
      and qty_per_adult_normal is not null;
  end if;
end;
$$;

create or replace function public.trigger_recalc_event_quantities()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.recalc_event_quantities(coalesce(new.event_id, old.event_id));
  return coalesce(new, old);
end;
$$;

create trigger recalc_on_participant_change
  after insert or update or delete on public.event_participants
  for each row execute function public.trigger_recalc_event_quantities();

-- Recalcular un ítem recién creado o re-activado como auto
create or replace function public.trigger_recalc_single_event()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.auto_calculated = true and new.qty_per_adult_normal is not null then
    perform public.recalc_event_quantities(new.event_id);
  end if;
  return new;
end;
$$;

create trigger recalc_on_item_insert
  after insert on public.event_items
  for each row execute function public.trigger_recalc_single_event();
