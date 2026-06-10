-- ============================================================
-- Lista de compras chequeable: estado "comprado" por ítem
-- ============================================================
-- El organizador/co-organizador usa la lista de ítems como checklist de
-- compras y marca cada ítem cuando lo compró. Persistente y compartido.

alter table public.event_items
  add column if not exists purchased boolean not null default false;
