"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { UserPlus, UserX } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { EventRow, RsvpStatus } from "@/types/database";
import { eventDataKey, type EventData } from "./use-event-data";

const RSVP_ORDER: RsvpStatus[] = ["yes", "maybe", "pending", "no"];

const rsvpBadgeVariant = (
  status: RsvpStatus
): "default" | "secondary" | "outline" | "destructive" => {
  switch (status) {
    case "yes":
      return "default";
    case "maybe":
      return "secondary";
    case "pending":
      return "outline";
    case "no":
      return "destructive";
  }
};

export function ParticipantsTab({
  event,
  data,
  currentUserId,
  isHost,
  isOrganizer,
}: {
  event: EventRow;
  data: EventData;
  currentUserId: string;
  isHost: boolean;
  isOrganizer: boolean;
}) {
  const t = useTranslations("participants");
  const tRsvp = useTranslations("rsvpStatus");
  const tEater = useTranslations("eaterTypesFull");
  const tErrors = useTranslations("errors");
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: eventDataKey(event.id) });

  const inviteByEmail = async () => {
    const email = inviteEmail.trim();
    if (!email) return;
    setLoading(true);
    const supabase = createClient();

    const { data: userId, error: findError } = await supabase.rpc(
      "find_profile_by_email",
      { p_email: email }
    );

    if (findError || !userId) {
      toast.error(t("userNotFound"));
      setLoading(false);
      return;
    }

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("default_eater_type, dietary_restrictions")
      .eq("id", userId as string)
      .single();

    const { error } = await supabase.from("event_participants").insert({
      event_id: event.id,
      user_id: userId as string,
      rsvp_status: "pending",
      eater_type: profileRow?.dietary_restrictions?.vegetarian
        ? "vegetarian"
        : (profileRow?.default_eater_type ?? "normal"),
    });

    setLoading(false);
    if (error) {
      toast.error(
        error.code === "23505" ? t("alreadyInvited") : tErrors("generic")
      );
      return;
    }
    toast.success(t("invited"));
    setInviteEmail("");
    invalidate();
  };

  const removeParticipant = async (participantId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("event_participants")
      .delete()
      .eq("id", participantId);
    if (error) {
      toast.error(tErrors("generic"));
      return;
    }
    toast.success(t("removed"));
    invalidate();
  };

  const sorted = [...data.participants].sort(
    (a, b) =>
      RSVP_ORDER.indexOf(a.rsvp_status) - RSVP_ORDER.indexOf(b.rsvp_status)
  );

  const confirmedTotal = data.participants
    .filter((p) => p.rsvp_status === "yes")
    .reduce((sum, p) => sum + 1 + p.guest_count, 0);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {t("confirmedCount", { count: confirmedTotal })}
        </p>
      </div>

      {isOrganizer && (
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder={t("invitePlaceholder")}
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                inviteByEmail();
              }
            }}
          />
          <Button
            onClick={inviteByEmail}
            disabled={loading || !inviteEmail.trim()}
          >
            <UserPlus />
            {t("invite")}
          </Button>
        </div>
      )}

      <ul className="grid gap-2">
        {sorted.map((participant) => {
          const profile = data.profiles.get(participant.user_id);
          const name = profile?.display_name ?? "?";
          const initials = name
            .split(" ")
            .map((w) => w[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();

          return (
            <li
              key={participant.id}
              className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
            >
              <Avatar className="size-9">
                {profile?.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt="" />
                ) : null}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {name}
                  {participant.user_id === event.host_id && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {t("hostTag")}
                    </span>
                  )}
                  {profile?.is_anonymous && (
                    <span className="ml-2 rounded bg-muted px-1.5 py-0.5 align-middle text-[10px] font-normal text-muted-foreground">
                      {t("guestBadge")}
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {tEater(participant.eater_type)}
                  {participant.guest_count > 0 &&
                    ` · +${participant.guest_count} ${t("guests")}`}
                  {participant.notes && ` · ${participant.notes}`}
                </p>
              </div>
              <Badge variant={rsvpBadgeVariant(participant.rsvp_status)}>
                {tRsvp(participant.rsvp_status)}
              </Badge>
              {isHost && participant.user_id !== currentUserId && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeParticipant(participant.id)}
                  title={t("remove")}
                >
                  <UserX />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
