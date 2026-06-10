import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { EventCard } from "@/components/events/event-card";
import { isPastEvent } from "@/lib/format";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS ya filtra: solo eventos donde soy host, co-org o participante
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("event_date", { ascending: true });

  const all = events ?? [];

  const typeIds = [...new Set(all.map((e) => e.event_type_id).filter(Boolean))];
  const typeNames = new Map<string, string>();
  if (typeIds.length > 0) {
    const { data: types } = await supabase
      .from("event_types")
      .select("id, name")
      .in("id", typeIds as string[]);
    for (const type of types ?? []) typeNames.set(type.id, type.name);
  }

  const active = all.filter(
    (e) => !isPastEvent(e.event_date) && e.status !== "archived"
  );
  const past = all
    .filter((e) => isPastEvent(e.event_date) || e.status === "archived")
    .reverse();

  return (
    <div className="grid gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button render={<Link href="/app/event/new" />}>
          <CalendarPlus />
          {t("newEvent")}
        </Button>
      </div>

      {active.length === 0 && past.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <p className="text-muted-foreground">{t("emptyState")}</p>
          <Button className="mt-4" render={<Link href="/app/event/new" />}>
            <CalendarPlus />
            {t("createFirst")}
          </Button>
        </div>
      ) : (
        <>
          <section className="grid gap-3">
            <h2 className="text-lg font-semibold">{t("upcoming")}</h2>
            {active.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("noUpcoming")}
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {active.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    typeName={
                      event.event_type_id
                        ? (typeNames.get(event.event_type_id) ?? null)
                        : null
                    }
                    isHost={event.host_id === user?.id}
                  />
                ))}
              </div>
            )}
          </section>

          {past.length > 0 && (
            <section className="grid gap-3">
              <h2 className="text-lg font-semibold">{t("past")}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {past.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    typeName={
                      event.event_type_id
                        ? (typeNames.get(event.event_type_id) ?? null)
                        : null
                    }
                    isHost={event.host_id === user?.id}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
