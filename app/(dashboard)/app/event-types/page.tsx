import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventTypesManager } from "@/components/events/event-types-manager";

export default async function EventTypesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: types }, { data: presets }] = await Promise.all([
    supabase
      .from("event_types")
      .select("*")
      .order("is_global", { ascending: false })
      .order("name"),
    supabase.from("event_type_presets").select("*").order("sort_order"),
  ]);

  return (
    <EventTypesManager
      userId={user.id}
      types={types ?? []}
      presets={presets ?? []}
    />
  );
}
