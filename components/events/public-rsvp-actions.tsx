"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Profile, RsvpStatus } from "@/types/database";
import { RsvpDialog } from "./rsvp-dialog";

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

  const goToEvent = () => {
    router.push(`/app/event/${eventId}`);
    router.refresh();
  };

  const quickAnswer = async (status: RsvpStatus) => {
    if (status === "yes") {
      setDialogOpen(true);
      return;
    }
    setLoading(true);
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
    setLoading(false);
    if (error) {
      toast.error(tErrors("generic"));
      return;
    }
    toast.success(t("answered"));
    goToEvent();
  };

  return (
    <div className="grid gap-3">
      {isParticipant ? (
        <Button render={<Link href={`/app/event/${eventId}`} />}>
          {t("viewEvent")}
        </Button>
      ) : (
        <>
          <p className="text-sm font-medium">{tRsvp("areYouGoing")}</p>
          <div className="grid grid-cols-3 gap-2">
            <Button disabled={loading} onClick={() => quickAnswer("yes")}>
              <Check />
              {tRsvp("yes")}
            </Button>
            <Button
              variant="outline"
              disabled={loading}
              onClick={() => quickAnswer("maybe")}
            >
              <HelpCircle />
              {tRsvp("maybe")}
            </Button>
            <Button
              variant="outline"
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
