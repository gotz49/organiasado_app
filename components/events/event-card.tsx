import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CalendarDays, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatShortDate, formatTime } from "@/lib/format";
import type { EventRow } from "@/types/database";

export async function EventCard({
  event,
  typeName,
  isHost,
}: {
  event: EventRow;
  typeName: string | null;
  isHost: boolean;
}) {
  const t = await getTranslations("dashboard");
  const tStatus = await getTranslations("eventStatus");

  return (
    <Link href={`/app/event/${event.id}`}>
      <Card className="h-full transition-colors hover:bg-muted/50">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="leading-tight">{event.title}</CardTitle>
            <div className="flex shrink-0 gap-1">
              {isHost && <Badge variant="secondary">{t("hostBadge")}</Badge>}
              {event.status === "cancelled" && (
                <Badge variant="destructive">{tStatus("cancelled")}</Badge>
              )}
            </div>
          </div>
          <CardDescription className="grid gap-1">
            {typeName && <span>{typeName}</span>}
            <span className="flex items-center gap-1">
              <CalendarDays className="size-3.5" />
              {formatShortDate(event.event_date)}
              {event.event_time ? ` · ${formatTime(event.event_time)}` : ""}
            </span>
            {event.location_text && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                {event.location_text}
              </span>
            )}
          </CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
