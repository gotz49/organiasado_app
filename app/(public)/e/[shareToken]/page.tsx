import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Beef, CalendarDays, MapPin, User, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatTime } from "@/lib/format";
import type { PublicEventPreview } from "@/types/database";
import { PublicRsvpActions } from "@/components/events/public-rsvp-actions";
import { GuestAccess } from "@/components/events/guest-access";

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;
  const t = await getTranslations("publicEvent");
  const tLanding = await getTranslations("landing");
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_public_event", {
    p_share_token: shareToken,
  });

  const event = data as PublicEventPreview | null;
  if (!event) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    profile = profileRow;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2 text-xl font-bold">
        <Beef className="size-7 text-brand" />
        {tLanding("appName")}
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-sm text-muted-foreground">{t("invitedTo")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-2xl">{event.title}</CardTitle>
            {event.status === "cancelled" && (
              <Badge variant="destructive">{t("cancelled")}</Badge>
            )}
          </div>
          {event.event_type_name && (
            <Badge variant="secondary" className="w-fit">
              {event.event_type_name}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2 text-sm">
            <p className="flex items-center gap-2">
              <CalendarDays className="size-4 text-muted-foreground" />
              {formatDate(event.event_date)}
              {event.event_time ? ` · ${formatTime(event.event_time)}` : ""}
            </p>
            {event.location_text && (
              <p className="flex items-center gap-2">
                <MapPin className="size-4 text-muted-foreground" />
                {event.location_text}
              </p>
            )}
            <p className="flex items-center gap-2">
              <User className="size-4 text-muted-foreground" />
              {t("organizedBy", { name: event.host_name })}
            </p>
            <p className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              {t("confirmedCount", { count: event.confirmed_count })}
            </p>
          </div>

          {event.description && (
            <p className="text-sm text-muted-foreground">{event.description}</p>
          )}

          {event.status === "active" ? (
            user && profile ? (
              <PublicRsvpActions
                shareToken={shareToken}
                eventId={event.id}
                profile={profile}
                isParticipant={event.is_participant}
              />
            ) : (
              <GuestAccess shareToken={shareToken} />
            )
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("notActive")}
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
