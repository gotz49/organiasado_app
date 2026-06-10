import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventView } from "@/components/events/event-view";

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (!event) notFound();

  const [{ data: profile }, { data: coOrgs }, { data: eventType }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("event_co_organizers")
        .select("user_id")
        .eq("event_id", event.id),
      event.event_type_id
        ? supabase
            .from("event_types")
            .select("name, icon")
            .eq("id", event.event_type_id)
            .single()
        : Promise.resolve({ data: null }),
    ]);

  if (!profile) redirect("/login");

  const isHost = event.host_id === user.id;
  const isCoOrganizer = (coOrgs ?? []).some((c) => c.user_id === user.id);

  const { data: hostProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", event.host_id)
    .single();

  return (
    <EventView
      event={event}
      eventTypeName={eventType?.name ?? null}
      hostName={hostProfile?.display_name ?? ""}
      profile={profile}
      isHost={isHost}
      isOrganizer={isHost || isCoOrganizer}
    />
  );
}
