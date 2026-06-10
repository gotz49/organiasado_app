-- ============================================================
-- Seed de tipos de evento globales y presets (spec sección 6)
-- Como migración (no seed) para que se aplique también en la nube
-- vía `supabase db push`. Valores rioplatenses, calibrables luego.
-- Idempotente: se puede re-aplicar sin duplicar.
-- ============================================================

-- Tipos de evento globales
insert into public.event_types (id, name, icon, is_global, created_by) values
  ('a0000000-0000-4000-8000-000000000001', 'Asado', 'flame', true, null),
  ('a0000000-0000-4000-8000-000000000002', 'Hamburgueseada', 'beef', true, null),
  ('a0000000-0000-4000-8000-000000000003', 'Pizza', 'pizza', true, null)
on conflict (id) do nothing;

-- Presets: solo se insertan si el tipo todavía no tiene ítems cargados,
-- para que re-correr la migración no duplique filas.
do $$
begin
  if not exists (
    select 1 from public.event_type_presets
    where event_type_id = 'a0000000-0000-4000-8000-000000000001'
  ) then
    insert into public.event_type_presets
      (event_type_id, item_name, unit, qty_per_adult_low, qty_per_adult_normal, qty_per_adult_high, qty_per_child, is_vegetarian_safe, category, sort_order)
    values
      ('a0000000-0000-4000-8000-000000000001', 'Asado de tira', 'g', 250, 400, 600, 150, false, 'comida', 1),
      ('a0000000-0000-4000-8000-000000000001', 'Vacío', 'g', 150, 250, 350, 100, false, 'comida', 2),
      ('a0000000-0000-4000-8000-000000000001', 'Chorizo', 'unidad', 1, 1.5, 2, 0.5, false, 'comida', 3),
      ('a0000000-0000-4000-8000-000000000001', 'Morcilla', 'unidad', 0.5, 1, 1.5, 0, false, 'comida', 4),
      ('a0000000-0000-4000-8000-000000000001', 'Pan', 'g', 100, 150, 200, 80, true, 'comida', 5),
      ('a0000000-0000-4000-8000-000000000001', 'Ensalada mixta', 'g', 100, 150, 200, 80, true, 'comida', 6),
      ('a0000000-0000-4000-8000-000000000001', 'Provoleta', 'g', 50, 80, 120, 30, true, 'comida', 7),
      ('a0000000-0000-4000-8000-000000000001', 'Coca/refresco', 'ml', 300, 500, 700, 300, true, 'bebida', 8),
      ('a0000000-0000-4000-8000-000000000001', 'Cerveza', 'ml', 500, 1000, 1500, 0, true, 'bebida', 9),
      ('a0000000-0000-4000-8000-000000000001', 'Vino', 'ml', 200, 400, 600, 0, true, 'bebida', 10),
      ('a0000000-0000-4000-8000-000000000001', 'Hielo', 'kg', 0.3, 0.5, 0.7, 0.1, true, 'insumo', 11),
      ('a0000000-0000-4000-8000-000000000001', 'Carbón', 'kg', 0.4, 0.5, 0.7, 0.2, true, 'insumo', 12);
  end if;

  if not exists (
    select 1 from public.event_type_presets
    where event_type_id = 'a0000000-0000-4000-8000-000000000002'
  ) then
    insert into public.event_type_presets
      (event_type_id, item_name, unit, qty_per_adult_low, qty_per_adult_normal, qty_per_adult_high, qty_per_child, is_vegetarian_safe, category, sort_order)
    values
      ('a0000000-0000-4000-8000-000000000002', 'Medallón de carne', 'unidad', 1, 2, 3, 1, false, 'comida', 1),
      ('a0000000-0000-4000-8000-000000000002', 'Pan de hamburguesa', 'unidad', 1, 2, 3, 1, true, 'comida', 2),
      ('a0000000-0000-4000-8000-000000000002', 'Queso cheddar', 'unidad', 1, 2, 3, 1, true, 'comida', 3),
      ('a0000000-0000-4000-8000-000000000002', 'Panceta', 'g', 30, 60, 100, 20, false, 'comida', 4),
      ('a0000000-0000-4000-8000-000000000002', 'Lechuga', 'g', 30, 50, 70, 20, true, 'comida', 5),
      ('a0000000-0000-4000-8000-000000000002', 'Tomate', 'g', 50, 80, 100, 30, true, 'comida', 6),
      ('a0000000-0000-4000-8000-000000000002', 'Cebolla', 'g', 30, 50, 80, 0, true, 'comida', 7),
      ('a0000000-0000-4000-8000-000000000002', 'Papas fritas', 'g', 150, 250, 350, 100, true, 'comida', 8),
      ('a0000000-0000-4000-8000-000000000002', 'Refresco', 'ml', 300, 500, 700, 300, true, 'bebida', 9),
      ('a0000000-0000-4000-8000-000000000002', 'Cerveza', 'ml', 500, 1000, 1500, 0, true, 'bebida', 10);
  end if;

  if not exists (
    select 1 from public.event_type_presets
    where event_type_id = 'a0000000-0000-4000-8000-000000000003'
  ) then
    insert into public.event_type_presets
      (event_type_id, item_name, unit, qty_per_adult_low, qty_per_adult_normal, qty_per_adult_high, qty_per_child, is_vegetarian_safe, category, sort_order)
    values
      ('a0000000-0000-4000-8000-000000000003', 'Porción de pizza', 'unidad', 2, 3, 5, 2, true, 'comida', 1),
      ('a0000000-0000-4000-8000-000000000003', 'Refresco', 'ml', 300, 500, 700, 300, true, 'bebida', 2),
      ('a0000000-0000-4000-8000-000000000003', 'Cerveza', 'ml', 500, 1000, 1500, 0, true, 'bebida', 3);
  end if;
end $$;
