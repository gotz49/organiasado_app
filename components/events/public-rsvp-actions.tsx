"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, HelpCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Profile, RsvpStatus } from "@/types/database";
import { rsvpColor } from "./rsvp-colors";
import { RsvpDialog } from "./rsvp-dialog";

/** Overlay a pantalla completa mientras se guarda la respuesta y se navega. */
function SavingOverlay({ label }: { label: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/90 backdrop-blur-sm">
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

/** Acciones de RSVP en la vista pública del evento (spec 5.4). */
export function PublicRsvpActions({
  shareToken,
  eventId,
  profile,
  isParticipant,
}: {
  shareToken: string;
  eventId: string;
  profile: Profile;
  isParticipant: boolean;
}) {
  const t = useTranslations("publicEvent");
  const tRsvp = useTranslations("rsvp");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // submitting permanece true durante la navegación (no se apaga en éxito):
  // así el overlay cubre hasta que carga la pantalla del evento.
  const [submitting, setSubmitting] = useState(false);

  const goToEvent = () => {
    setSubmitting(true);
    router.push(`/app/event/${eventId}`);
    router.refresh();
  };

  const quickAnswer = async (status: RsvpStatus) => {
    if (status === "yes") {
      setDialogOpen(true);
      return;
    }
    setLoading(true);
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("rsvp_via_token", {
      p_share_token: shareToken,
      p_rsvp_status: status,
      p_eater_type: profile.dietary_restrictions?.vegetarian
        ? "vegetarian"
        : profile.default_eater_type,
      p_guest_count: 0,
      p_guest_breakdown: [],
    });
    if (error) {
      setLoading(false);
      setSubmitting(false);
      toast.error(tErrors("generic"));
      return;
    }
    toast.success(t("answered"));
    goToEvent();
  };

  return (
    <div className="grid gap-3">
      {submitting && <SavingOverlay label={t("saving")} />}
      {isParticipant ? (
        <Button render={<Link href={`/app/event/${eventId}`} />}>
          {t("viewEvent")}
        </Button>
      ) : (
        <>
          <p className="text-sm font-medium">{tRsvp("areYouGoing")}</p>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              className={cn(rsvpColor("yes", true))}
              disabled={loading}
              onClick={() => quickAnswer("yes")}
            >
              <Check />
              {tRsvp("yes")}
            </Button>
            <Button
              variant="outline"
              className={cn(rsvpColor("maybe", true))}
              disabled={loading}
              onClick={() => quickAnswer("maybe")}
            >
              <HelpCircle />
              {tRsvp("maybe")}
            </Button>
            <Button
              variant="outline"
              className={cn(rsvpColor("no", true))}
              disabled={loading}
              onClick={() => quickAnswer("no")}
            >
              <X />
              {tRsvp("no")}
            </Button>
          </div>
        </>
      )}

      <RsvpDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        shareToken={shareToken}
        profile={profile}
        onSuccess={goToEvent}
      />
    </div>
  );
}
