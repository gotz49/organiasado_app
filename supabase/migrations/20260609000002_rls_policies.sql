-- ============================================================
-- MVP v1 — Row Level Security (spec 4.12 y sección 7)
-- ============================================================

-- ---------- Funciones helper (SECURITY DEFINER para evitar recursión) ----------

create or replace function public.is_event_host(p_event_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id and e.host_id = p_user_id
  );
$$;

create or replace function public.is_event_organizer(p_event_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id and e.host_id = p_user_id
  ) or exists (
    select 1 from public.event_co_organizers co
    where co.event_id = p_event_id and co.user_id = p_user_id
  );
$$;

create or replace function public.is_event_participant(p_event_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.event_participants ep
    where ep.event_id = p_event_id and ep.user_id = p_user_id
  );
$$;

create or replace function public.can_view_event(p_event_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select public.is_event_organizer(p_event_id, p_user_id)
      or public.is_event_participant(p_event_id, p_user_id);
$$;

create or replace function public.is_confirmed_participant(p_event_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.event_participants ep
    where ep.event_id = p_event_id
      and ep.user_id = p_user_id
      and ep.rsvp_status = 'yes'
  );
$$;

-- El participante (yes/maybe) puede asignarse ítems
create or replace function public.can_assign_items(p_event_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.event_participants ep
    where ep.event_id = p_event_id
      and ep.user_id = p_user_id
      and ep.rsvp_status in ('yes', 'maybe')
  );
$$;

-- ---------- Vista pública por share_token ----------
-- Devuelve el preview del evento sin requerir sesión.
create or replace function public.get_public_event(p_share_token text)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'id', e.id,
    'title', e.title,
    'description', e.description,
    'event_date', e.event_date,
    'event_time', e.event_time,
    'location_text', e.location_text,
    'currency', e.currency,
    'status', e.status,
    'rsvp_deadline', e.rsvp_deadline,
    'event_type_name', et.name,
    'event_type_icon', et.icon,
    'host_name', p.display_name,
    'confirmed_count', (
      select count(*) + coalesce(sum(ep.guest_count), 0)
      from public.event_participants ep
      where ep.event_id = e.id and ep.rsvp_status = 'yes'
    ),
    'is_participant', case
      when auth.uid() is null then false
      else public.is_event_participant(e.id, auth.uid())
    end
  )
  into result
  from public.events e
  left join public.event_types et on et.id = e.event_type_id
  join public.profiles p on p.id = e.host_id
  where e.share_token = p_share_token
    and e.status in ('active', 'cancelled', 'archived');

  return result; -- null si no existe
end;
$$;

grant execute on function public.get_public_event(text) to anon, authenticated;

-- ---------- RSVP vía share_token ----------
-- Único camino para que un usuario se sume a un evento sin ser invitado nominalmente.
create or replace function public.rsvp_via_token(
  p_share_token text,
  p_rsvp_status public.rsvp_status,
  p_eater_type public.participant_eater_type,
  p_guest_count int default 0,
  p_guest_breakdown jsonb default '[]',
  p_notes text default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_event_id uuid;
  v_participant_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select id into v_event_id
  from public.events
  where share_token = p_share_token and status = 'active';

  if v_event_id is null then
    raise exception 'event not found or not active';
  end if;

  insert into public.event_participants
    (event_id, user_id, rsvp_status, eater_type, guest_count, guest_breakdown, notes, responded_at)
  values
    (v_event_id, auth.uid(), p_rsvp_status, p_eater_type, p_guest_count,
     coalesce(p_guest_breakdown, '[]'::jsonb), p_notes, now())
  on conflict (event_id, user_id) do update set
    rsvp_status = excluded.rsvp_status,
    eater_type = excluded.eater_type,
    guest_count = excluded.guest_count,
    guest_breakdown = excluded.guest_breakdown,
    notes = excluded.notes,
    responded_at = now()
  returning id into v_participant_id;

  return v_participant_id;
end;
$$;

grant execute on function public.rsvp_via_token(text, public.rsvp_status, public.participant_eater_type, int, jsonb, text) to authenticated;

-- ---------- Habilitar RLS ----------
alter table public.profiles enable row level security;
alter table public.event_types enable row level security;
alter table public.event_type_presets enable row level security;
alter table public.events enable row level security;
alter table public.event_co_organizers enable row level security;
alter table public.event_participants enable row level security;
alter table public.event_items enable row level security;
alter table public.item_assignments enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_shares enable row level security;
alter table public.settlements enable row level security;

-- ---------- profiles ----------
-- Cualquier usuario autenticado puede ver perfiles (necesario para listas de participantes).
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---------- event_types ----------
create policy "event_types_select" on public.event_types
  for select to authenticated
  using (is_global = true or created_by = auth.uid());

create policy "event_types_insert" on public.event_types
  for insert to authenticated
  with check (created_by = auth.uid() and is_global = false);

create policy "event_types_update_own" on public.event_types
  for update to authenticated
  using (created_by = auth.uid() and is_global = false)
  with check (created_by = auth.uid() and is_global = false);

create policy "event_types_delete_own" on public.event_types
  for delete to authenticated
  using (created_by = auth.uid() and is_global = false);

-- ---------- event_type_presets ----------
create policy "presets_select" on public.event_type_presets
  for select to authenticated
  using (exists (
    select 1 from public.event_types et
    where et.id = event_type_id and (et.is_global or et.created_by = auth.uid())
  ));

create policy "presets_write_own" on public.event_type_presets
  for all to authenticated
  using (exists (
    select 1 from public.event_types et
    where et.id = event_type_id and et.created_by = auth.uid() and et.is_global = false
  ))
  with check (exists (
    select 1 from public.event_types et
    where et.id = event_type_id and et.created_by = auth.uid() and et.is_global = false
  ));

-- ---------- events ----------
create policy "events_select" on public.events
  for select to authenticated
  using (public.can_view_event(id, auth.uid()));

create policy "events_insert" on public.events
  for insert to authenticated
  with check (host_id = auth.uid());

create policy "events_update" on public.events
  for update to authenticated
  using (public.is_event_organizer(id, auth.uid()));

create policy "events_delete" on public.events
  for delete to authenticated
  using (host_id = auth.uid());

-- ---------- event_co_organizers ----------
create policy "co_orgs_select" on public.event_co_organizers
  for select to authenticated
  using (public.can_view_event(event_id, auth.uid()));

create policy "co_orgs_insert" on public.event_co_organizers
  for insert to authenticated
  with check (public.is_event_host(event_id, auth.uid()));

create policy "co_orgs_delete" on public.event_co_organizers
  for delete to authenticated
  using (public.is_event_host(event_id, auth.uid()));

-- ---------- event_participants ----------
create policy "participants_select" on public.event_participants
  for select to authenticated
  using (public.can_view_event(event_id, auth.uid()));

-- Inserción directa solo por organizadores (invitación nominal).
-- Los usuarios comunes entran por rsvp_via_token (SECURITY DEFINER).
create policy "participants_insert_organizer" on public.event_participants
  for insert to authenticated
  with check (public.is_event_organizer(event_id, auth.uid()));

create policy "participants_update" on public.event_participants
  for update to authenticated
  using (user_id = auth.uid() or public.is_event_organizer(event_id, auth.uid()));

create policy "participants_delete" on public.event_participants
  for delete to authenticated
  using (user_id = auth.uid() or public.is_event_host(event_id, auth.uid()));

-- ---------- event_items ----------
create policy "items_select" on public.event_items
  for select to authenticated
  using (public.can_view_event(event_id, auth.uid()));

create policy "items_write" on public.event_items
  for insert to authenticated
  with check (public.is_event_organizer(event_id, auth.uid()));

create policy "items_update" on public.event_items
  for update to authenticated
  using (public.is_event_organizer(event_id, auth.uid()));

create policy "items_delete" on public.event_items
  for delete to authenticated
  using (public.is_event_organizer(event_id, auth.uid()));

-- ---------- item_assignments ----------
create policy "assignments_select" on public.item_assignments
  for select to authenticated
  using (exists (
    select 1 from public.event_items i
    where i.id = item_id and public.can_view_event(i.event_id, auth.uid())
  ));

-- Solo el propio participante (yes/maybe) se asigna; el organizador puede reasignar.
create policy "assignments_insert" on public.item_assignments
  for insert to authenticated
  with check (
    exists (
      select 1 from public.event_participants ep
      join public.event_items i on i.id = item_id and i.event_id = ep.event_id
      where ep.id = participant_id
        and (
          (ep.user_id = auth.uid() and ep.rsvp_status in ('yes', 'maybe'))
          or public.is_event_organizer(ep.event_id, auth.uid())
        )
    )
  );

create policy "assignments_update" on public.item_assignments
  for update to authenticated
  using (
    exists (
      select 1 from public.event_participants ep
      where ep.id = participant_id
        and (ep.user_id = auth.uid() or public.is_event_organizer(ep.event_id, auth.uid()))
    )
  );

create policy "assignments_delete" on public.item_assignments
  for delete to authenticated
  using (
    exists (
      select 1 from public.event_participants ep
      where ep.id = participant_id
        and (ep.user_id = auth.uid() or public.is_event_organizer(ep.event_id, auth.uid()))
    )
  );

-- ---------- expenses ----------
create policy "expenses_select" on public.expenses
  for select to authenticated
  using (public.can_view_event(event_id, auth.uid()));

-- Registrar gasto: participante confirmado u organizador.
create policy "expenses_insert" on public.expenses
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      public.is_confirmed_participant(event_id, auth.uid())
      or public.is_event_organizer(event_id, auth.uid())
    )
  );

-- Editar/eliminar: quien lo creó + host.
create policy "expenses_update" on public.expenses
  for update to authenticated
  using (created_by = auth.uid() or public.is_event_host(event_id, auth.uid()));

create policy "expenses_delete" on public.expenses
  for delete to authenticated
  using (created_by = auth.uid() or public.is_event_host(event_id, auth.uid()));

-- ---------- expense_shares ----------
create policy "shares_select" on public.expense_shares
  for select to authenticated
  using (exists (
    select 1 from public.expenses x
    where x.id = expense_id and public.can_view_event(x.event_id, auth.uid())
  ));

create policy "shares_write" on public.expense_shares
  for all to authenticated
  using (exists (
    select 1 from public.expenses x
    where x.id = expense_id
      and (x.created_by = auth.uid() or public.is_event_host(x.event_id, auth.uid()))
  ))
  with check (exists (
    select 1 from public.expenses x
    where x.id = expense_id
      and (x.created_by = auth.uid() or public.is_event_host(x.event_id, auth.uid()))
  ));

-- ---------- settlements ----------
create policy "settlements_select" on public.settlements
  for select to authenticated
  using (public.can_view_event(event_id, auth.uid()));

-- Registra el que paga o el que recibe; ambos deben ser participantes del evento.
create policy "settlements_insert" on public.settlements
  for insert to authenticated
  with check (
    (from_user_id = auth.uid() or to_user_id = auth.uid())
    and public.can_view_event(event_id, auth.uid())
  );

create policy "settlements_delete" on public.settlements
  for delete to authenticated
  using (
    from_user_id = auth.uid()
    or to_user_id = auth.uid()
    or public.is_event_host(event_id, auth.uid())
  );

-- ---------- Realtime ----------
-- Publicar cambios para conteo de RSVP en vivo y actualizaciones de ítems/gastos.
alter publication supabase_realtime add table public.event_participants;
alter publication supabase_realtime add table public.event_items;
alter publication supabase_realtime add table public.item_assignments;
alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.settlements;
