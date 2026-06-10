"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CalendarDays, Link2, MapPin, Pencil, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { formatDate, formatTime, isPastEvent } from "@/lib/format";
import type { EventRow, Profile } from "@/types/database";
import { useEventData } from "./use-event-data";
import { RsvpBar } from "./rsvp-bar";
import { ParticipantsTab } from "./participants-tab";
import { ItemsTab } from "./items-tab";
import { ExpensesTab } from "./expenses-tab";
import { BalancesTab } from "./balances-tab";

export interface EventViewProps {
  event: EventRow;
  eventTypeName: string | null;
  hostName: string;
  profile: Profile;
  isHost: boolean;
  isOrganizer: boolean;
}

export function EventView({
  event,
  eventTypeName,
  hostName,
  profile,
  isHost,
  isOrganizer,
}: EventViewProps) {
  const t = useTranslations("eventView");
  const tStatus = useTranslations("eventStatus");
  const { data, isLoading } = useEventData(event.id);

  const copyShareLink = async () => {
    const url = `${window.location.origin}/e/${event.share_token}`;
    await navigator.clipboard.writeText(url);
    toast.success(t("linkCopied"));
  };

  const confirmedCount = data
    ? data.participants
        .filter((p) => p.rsvp_status === "yes")
        .reduce((sum, p) => sum + 1 + p.guest_count, 0)
    : 0;

  const myParticipation = data?.participants.find(
    (p) => p.user_id === profile.id
  );

  const past = isPastEvent(event.event_date);

  return (
    <div className="grid gap-6">
      {/* Encabezado */}
      <div className="grid gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{event.title}</h1>
              {event.status === "cancelled" && (
                <Badge variant="destructive">{tStatus("cancelled")}</Badge>
              )}
              {event.status === "archived" && (
                <Badge variant="secondary">{tStatus("archived")}</Badge>
              )}
              {past && event.status === "active" && (
                <Badge variant="secondary">{t("pastBadge")}</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {eventTypeName && <span>{eventTypeName}</span>}
              <span className="flex items-center gap-1">
                <CalendarDays className="size-3.5" />
                {formatDate(event.event_date)}
                {event.event_time ? ` · ${formatTime(event.event_time)}` : ""}
              </span>
              {event.location_text && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {event.location_text}
                </span>
              )}
              <span className="flex items-center gap-1">
                <User className="size-3.5" />
                {t("hostedBy", { name: hostName })}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyShareLink}>
              <Link2 />
              {t("shareInvite")}
            </Button>
            {isOrganizer && (
              <Button
                variant="outline"
                size="sm"
                render={<Link href={`/app/event/${event.id}/edit`} />}
              >
                <Pencil />
                {t("edit")}
              </Button>
            )}
          </div>
        </div>

        {event.description && (
          <p className="text-sm text-muted-foreground">{event.description}</p>
        )}

        {/* RSVP propio */}
        {event.status === "active" && !past && (
          <RsvpBar
            event={event}
            profile={profile}
            myParticipation={myParticipation}
          />
        )}
      </div>

      {/* Tabs */}
      {isLoading || !data ? (
        <div className="grid gap-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <Tabs defaultValue="participants">
          <TabsList className="w-full overflow-x-auto">
            <TabsTrigger value="participants">
              {t("tabs.participants")} ({confirmedCount})
            </TabsTrigger>
            <TabsTrigger value="items">{t("tabs.items")}</TabsTrigger>
            <TabsTrigger value="expenses">{t("tabs.expenses")}</TabsTrigger>
            <TabsTrigger value="balances">{t("tabs.balances")}</TabsTrigger>
          </TabsList>

          <TabsContent value="participants" className="pt-4">
            <ParticipantsTab
              event={event}
              data={data}
              currentUserId={profile.id}
              isHost={isHost}
              isOrganizer={isOrganizer}
            />
          </TabsContent>
          <TabsContent value="items" className="pt-4">
            <ItemsTab
              event={event}
              data={data}
              currentUserId={profile.id}
              isOrganizer={isOrganizer}
            />
          </TabsContent>
          <TabsContent value="expenses" className="pt-4">
            <ExpensesTab
              event={event}
              data={data}
              currentUserId={profile.id}
              isHost={isHost}
              isOrganizer={isOrganizer}
            />
          </TabsContent>
          <TabsContent value="balances" className="pt-4">
            <BalancesTab
              event={event}
              eventTypeName={eventTypeName}
              hostName={hostName}
              data={data}
              currentUserId={profile.id}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
