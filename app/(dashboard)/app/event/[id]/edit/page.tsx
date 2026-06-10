import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventForm } from "@/components/events/event-form";
import { CoOrganizersManager } from "@/components/events/co-organizers-manager";
import { DangerZone } from "@/components/events/danger-zone";

export default async function EditEventPage({
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

  const isHost = event.host_id === user.id;

  const [{ data: profile }, { data: eventTypes }, { data: coOrgs }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("event_types").select("*").order("name"),
      supabase
        .from("event_co_organizers")
        .select("*")
        .eq("event_id", event.id),
    ]);

  if (!profile) redirect("/login");

  const isCoOrg = (coOrgs ?? []).some((c) => c.user_id === user.id);
  if (!isHost && !isCoOrg) redirect(`/app/event/${event.id}`);

  const coOrgIds = (coOrgs ?? []).map((c) => c.user_id);
  const { data: coOrgProfiles } = coOrgIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", coOrgIds)
    : { data: [] };

  return (
    <div className="mx-auto grid max-w-xl gap-6">
      <EventForm eventTypes={eventTypes ?? []} profile={profile} event={event} />
      {isHost && (
        <>
          <CoOrganizersManager
            eventId={event.id}
            coOrganizers={(coOrgProfiles ?? []).map((p) => ({
              userId: p.id,
              name: p.display_name,
            }))}
          />
          <DangerZone event={event} />
        </>
      )}
    </div>
  );
}
