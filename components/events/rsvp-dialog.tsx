"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { PARTICIPANT_EATER_TYPES } from "@/lib/constants";
import type {
  EventParticipant,
  GuestBreakdownEntry,
  ParticipantEaterType,
  Profile,
} from "@/types/database";

/**
 * Diálogo de confirmación de asistencia: tipo de comensal,
 * acompañantes y notas (spec 5.4). Upsert vía rsvp_via_token.
 */
export function RsvpDialog({
  open,
  onOpenChange,
  shareToken,
  profile,
  myParticipation,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareToken: string;
  profile: Profile;
  myParticipation?: EventParticipant;
  onSuccess: () => void;
}) {
  const t = useTranslations("rsvp");
  const tEater = useTranslations("eaterTypesFull");
  const tRef = useTranslations("eaterReference");
  const tErrors = useTranslations("errors");

  const defaultEater: ParticipantEaterType =
    myParticipation?.eater_type ??
    (profile.dietary_restrictions?.vegetarian
      ? "vegetarian"
      : profile.default_eater_type);

  const [eaterType, setEaterType] = useState<ParticipantEaterType>(defaultEater);
  const [guests, setGuests] = useState<GuestBreakdownEntry[]>(
    myParticipation?.guest_breakdown ?? []
  );
  const [notes, setNotes] = useState(myParticipation?.notes ?? "");
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("rsvp_via_token", {
      p_share_token: shareToken,
      p_rsvp_status: "yes",
      p_eater_type: eaterType,
      p_guest_count: guests.length,
      p_guest_breakdown: guests,
      p_notes: notes.trim() || undefined,
    });
    setLoading(false);
    if (error) {
      toast.error(tErrors("generic"));
      return;
    }
    toast.success(t("confirmed"));
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
          <DialogDescription>{t("dialogSubtitle")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <div className="grid gap-2">
            <Label>{t("eaterTypeLabel")}</Label>
            <Select
              value={eaterType}
              onValueChange={(v) => setEaterType(v as ParticipantEaterType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value) => tEater(value as ParticipantEaterType)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PARTICIPANT_EATER_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {tEater(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium">{tEater("low")}:</span> {tRef("low")}
              <br />
              <span className="font-medium">{tEater("normal")}:</span>{" "}
              {tRef("normal")}
              <br />
              <span className="font-medium">{tEater("high")}:</span>{" "}
              {tRef("high")}
            </p>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>{t("guestsLabel")}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setGuests([...guests, { eater_type: "normal" }])
                }
                disabled={guests.length >= 20}
              >
                <Plus />
                {t("addGuest")}
              </Button>
            </div>
            {guests.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("noGuests")}</p>
            ) : (
              <ul className="grid gap-2">
                {guests.map((guest, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-28 shrink-0 text-sm text-muted-foreground">
                      {t("guestN", { n: i + 1 })}
                    </span>
                    <Select
                      value={guest.eater_type}
                      onValueChange={(v) => {
                        const next = [...guests];
                        next[i] = {
                          ...next[i],
                          eater_type: v as ParticipantEaterType,
                        };
                        setGuests(next);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PARTICIPANT_EATER_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {tEater(type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() =>
                        setGuests(guests.filter((_, idx) => idx !== i))
                      }
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="rsvp-notes">{t("notesLabel")}</Label>
            <Textarea
              id="rsvp-notes"
              placeholder={t("notesPlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t("cancel")}
          </Button>
          <Button onClick={confirm} disabled={loading}>
            {loading ? t("confirming") : t("confirmButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
