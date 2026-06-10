import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventForm } from "@/components/events/event-form";

export default async function NewEventPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: eventTypes }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("event_types")
      .select("*")
      .order("is_global", { ascending: false })
      .order("name"),
  ]);

  if (!profile) redirect("/login");

  return <EventForm eventTypes={eventTypes ?? []} profile={profile} />;
}
