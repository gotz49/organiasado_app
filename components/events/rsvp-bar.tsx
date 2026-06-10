"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type {
  EventParticipant,
  EventRow,
  Profile,
  RsvpStatus,
} from "@/types/database";
import { eventDataKey } from "./use-event-data";
import { rsvpColor } from "./rsvp-colors";
import { RsvpDialog } from "./rsvp-dialog";

/**
 * Barra de RSVP propio. Usa rsvp_via_token (SECURITY DEFINER) para que
 * funcione tanto para participantes existentes como para organizadores
 * que aún no confirmaron.
 */
export function RsvpBar({
  event,
  profile,
  myParticipation,
}: {
  event: EventRow;
  profile: Profile;
  myParticipation?: EventParticipant;
}) {
  const t = useTranslations("rsvp");
  const tErrors = useTranslations("errors");
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const deadlinePassed =
    !!event.rsvp_deadline && new Date(event.rsvp_deadline) < new Date();

  const current = myParticipation?.rsvp_status;

  const quickAnswer = async (status: RsvpStatus) => {
    if (status === "yes") {
      // Confirmar pide detalles (tipo de comensal, acompañantes)
      setDialogOpen(true);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("rsvp_via_token", {
      p_share_token: event.share_token,
      p_rsvp_status: status,
      p_eater_type:
        myParticipation?.eater_type ??
        (profile.dietary_restrictions?.vegetarian
          ? "vegetarian"
          : profile.default_eater_type),
      p_guest_count: 0,
      p_guest_breakdown: [],
      p_notes: myParticipation?.notes ?? undefined,
    });
    setLoading(false);
    if (error) {
      toast.error(tErrors("generic"));
      return;
    }
    queryClient.invalidateQueries({ queryKey: eventDataKey(event.id) });
  };

  if (deadlinePassed && !current) {
    return (
      <p className="rounded-lg border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        {t("deadlinePassed")}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 px-4 py-3">
      <span className="text-sm font-medium">
        {current === "yes"
          ? t("youAreGoing")
          : current === "no"
            ? t("youAreNotGoing")
            : current === "maybe"
              ? t("youMaybe")
              : t("areYouGoing")}
      </span>
      <div className="ml-auto flex gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className={cn(rsvpColor("yes", current === "yes"))}
          disabled={loading}
          onClick={() => quickAnswer("yes")}
        >
          <Check />
          {t("yes")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={cn(rsvpColor("maybe", current === "maybe"))}
          disabled={loading}
          onClick={() => quickAnswer("maybe")}
        >
          <HelpCircle />
          {t("maybe")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={cn(rsvpColor("no", current === "no"))}
          disabled={loading}
          onClick={() => quickAnswer("no")}
        >
          <X />
          {t("no")}
        </Button>
      </div>

      <RsvpDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        shareToken={event.share_token}
        profile={profile}
        myParticipation={myParticipation}
        onSuccess={() =>
          queryClient.invalidateQueries({ queryKey: eventDataKey(event.id) })
        }
      />
    </div>
  );
}
