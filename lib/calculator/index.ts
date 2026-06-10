import type {
  EventItem,
  EventParticipant,
  EventTypePreset,
  ParticipantEaterType,
} from "@/types/database";

// Espejo client-side del cálculo del trigger recalc_event_quantities
// (supabase/migrations). Se usa para previews y para instanciar ítems.

export interface CalculableItem {
  qty_per_adult_low: number | null;
  qty_per_adult_normal: number | null;
  qty_per_adult_high: number | null;
  qty_per_child: number | null;
  is_vegetarian_safe: boolean;
}

/** Cantidad que aporta una persona según su tipo de comensal. */
export function qtyForEater(
  item: CalculableItem,
  eater: ParticipantEaterType
): number {
  switch (eater) {
    case "low":
      return item.qty_per_adult_low ?? 0;
    case "normal":
      return item.qty_per_adult_normal ?? 0;
    case "high":
      return item.qty_per_adult_high ?? 0;
    case "child":
      return item.qty_per_child ?? 0;
    case "vegetarian":
      // Vegetarianos cuentan como 'normal' solo en ítems veg-safe (spec 5.5)
      return item.is_vegetarian_safe ? (item.qty_per_adult_normal ?? 0) : 0;
  }
}

/**
 * Lista de comensales efectivos de un evento: participantes con RSVP = yes
 * más sus acompañantes (guest_breakdown).
 */
export function effectiveEaters(
  participants: Pick<
    EventParticipant,
    "rsvp_status" | "eater_type" | "guest_breakdown"
  >[]
): ParticipantEaterType[] {
  const eaters: ParticipantEaterType[] = [];
  for (const p of participants) {
    if (p.rsvp_status !== "yes") continue;
    eaters.push(p.eater_type);
    for (const g of p.guest_breakdown ?? []) {
      eaters.push(g.eater_type ?? "normal");
    }
  }
  return eaters;
}

/** quantity_needed = Σ qty por cada comensal efectivo (spec 5.5). */
export function computeQuantityNeeded(
  item: CalculableItem,
  eaters: ParticipantEaterType[]
): number {
  const total = eaters.reduce((sum, e) => sum + qtyForEater(item, e), 0);
  return Math.round(total * 100) / 100;
}

/**
 * Instancia los ítems de un evento desde los presets de su tipo,
 * copiando los qty_per_* para que el recálculo sea autocontenido.
 * quantity_needed arranca en 0 (sin confirmados aún, spec 5.2).
 */
export function buildItemsFromPresets(
  eventId: string,
  presets: EventTypePreset[]
): Omit<EventItem, "id" | "created_at" | "updated_at" | "notes">[] {
  return presets.map((p) => ({
    event_id: eventId,
    item_name: p.item_name,
    unit: p.unit,
    quantity_needed: 0,
    category: p.category,
    sort_order: p.sort_order,
    auto_calculated: true,
    qty_per_adult_low: p.qty_per_adult_low,
    qty_per_adult_normal: p.qty_per_adult_normal,
    qty_per_adult_high: p.qty_per_adult_high,
    qty_per_child: p.qty_per_child,
    is_vegetarian_safe: p.is_vegetarian_safe,
  }));
}

/** Cobertura de un ítem: cuánto de lo necesario ya está asignado. */
export function itemCoverage(
  quantityNeeded: number,
  assignedTotal: number
): { ratio: number; status: "empty" | "partial" | "full" | "over" } {
  if (quantityNeeded <= 0) {
    return {
      ratio: assignedTotal > 0 ? 1 : 0,
      status: assignedTotal > 0 ? "full" : "empty",
    };
  }
  const ratio = assignedTotal / quantityNeeded;
  if (assignedTotal === 0) return { ratio: 0, status: "empty" };
  if (ratio < 1) return { ratio, status: "partial" };
  if (ratio === 1) return { ratio, status: "full" };
  return { ratio, status: "over" };
}
