"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type {
  EventItem,
  EventParticipant,
  Expense,
  ExpenseShare,
  ItemAssignment,
  Profile,
  Settlement,
} from "@/types/database";

export interface EventData {
  participants: EventParticipant[];
  profiles: Map<string, Profile>;
  items: EventItem[];
  assignments: ItemAssignment[];
  expenses: Expense[];
  shares: ExpenseShare[];
  settlements: Settlement[];
}

export function eventDataKey(eventId: string) {
  return ["event-data", eventId];
}

async function fetchEventData(eventId: string): Promise<EventData> {
  const supabase = createClient();

  const [participantsRes, itemsRes, expensesRes, settlementsRes] =
    await Promise.all([
      supabase
        .from("event_participants")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at"),
      supabase
        .from("event_items")
        .select("*")
        .eq("event_id", eventId)
        .order("sort_order"),
      supabase
        .from("expenses")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false }),
      supabase
        .from("settlements")
        .select("*")
        .eq("event_id", eventId)
        .order("settled_at", { ascending: false }),
    ]);

  const participants = participantsRes.data ?? [];
  const items = itemsRes.data ?? [];
  const expenses = expensesRes.data ?? [];
  const settlements = settlementsRes.data ?? [];

  const itemIds = items.map((i) => i.id);
  const expenseIds = expenses.map((x) => x.id);

  const [assignmentsRes, sharesRes] = await Promise.all([
    itemIds.length
      ? supabase.from("item_assignments").select("*").in("item_id", itemIds)
      : Promise.resolve({ data: [] as ItemAssignment[] }),
    expenseIds.length
      ? supabase.from("expense_shares").select("*").in("expense_id", expenseIds)
      : Promise.resolve({ data: [] as ExpenseShare[] }),
  ]);

  // Perfiles de todos los usuarios involucrados
  const userIds = new Set<string>();
  for (const p of participants) userIds.add(p.user_id);
  for (const x of expenses) {
    userIds.add(x.paid_by);
    userIds.add(x.created_by);
  }
  for (const s of settlements) {
    userIds.add(s.from_user_id);
    userIds.add(s.to_user_id);
  }

  const profiles = new Map<string, Profile>();
  if (userIds.size > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("*")
      .in("id", [...userIds]);
    for (const p of profileRows ?? []) profiles.set(p.id, p);
  }

  return {
    participants,
    profiles,
    items,
    assignments: assignmentsRes.data ?? [],
    expenses,
    shares: sharesRes.data ?? [],
    settlements,
  };
}

/**
 * Datos del evento con actualización en vivo (Supabase Realtime).
 * Cualquier cambio en las tablas del evento invalida la query completa:
 * simple y suficiente para grupos de amigos.
 */
export function useEventData(eventId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: eventDataKey(eventId),
    queryFn: () => fetchEventData(eventId),
  });

  useEffect(() => {
    const supabase = createClient();
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: eventDataKey(eventId) });
    };

    const channel = supabase
      .channel(`event-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_participants",
          filter: `event_id=eq.${eventId}`,
        },
        invalidate
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_items",
          filter: `event_id=eq.${eventId}`,
        },
        invalidate
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
          filter: `event_id=eq.${eventId}`,
        },
        invalidate
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "settlements",
          filter: `event_id=eq.${eventId}`,
        },
        invalidate
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "item_assignments" },
        invalidate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, queryClient]);

  return query;
}
