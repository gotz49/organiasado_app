-- ============================================================
-- Fix: crear evento fallaba con .insert().select()
-- ============================================================
-- La política events_select usaba can_view_event() / is_event_organizer(),
-- que RE-CONSULTAN la tabla events. En un INSERT ... RETURNING, esas
-- funciones STABLE no ven la fila recién insertada (snapshot previo a la
-- sentencia), así que el RETURNING quedaba vacío y el cliente recibía
-- "row violates RLS".
--
-- Solución: chequear host_id = auth.uid() INLINE (referencia directa a la
-- columna de la fila que se devuelve), sin re-consultar events. Las ramas
-- de co-organizador y participante consultan OTRAS tablas, sin problema.

drop policy if exists "events_select" on public.events;

create policy "events_select" on public.events
  for select to authenticated
  using (
    host_id = auth.uid()
    or exists (
      select 1 from public.event_co_organizers co
      where co.event_id = id and co.user_id = auth.uid()
    )
    or public.is_event_participant(id, auth.uid())
  );
