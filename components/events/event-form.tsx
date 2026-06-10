"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/shared/field-error";
import { ExcelImportField } from "@/components/events/excel-import-field";
import { createClient } from "@/lib/supabase/client";
import { buildItemsFromPresets } from "@/lib/calculator";
import { CURRENCIES, DEFAULT_CURRENCY } from "@/lib/constants";
import { eventSchema, type EventInput } from "@/lib/validators/event";
import type { ImportResult } from "@/lib/excel/types";
import type {
  EventRow,
  EventType,
  ParticipantEaterType,
  Profile,
} from "@/types/database";

interface EventFormProps {
  eventTypes: EventType[];
  profile: Profile;
  /** Si está presente, el formulario edita en lugar de crear. */
  event?: EventRow;
}

export function EventForm({ eventTypes, profile, event }: EventFormProps) {
  const t = useTranslations("eventForm");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const isEdit = !!event;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<EventInput>({
    resolver: zodResolver(eventSchema),
    defaultValues: event
      ? {
          title: event.title,
          description: event.description ?? "",
          eventTypeId: event.event_type_id ?? eventTypes[0]?.id,
          eventDate: event.event_date,
          eventTime: event.event_time?.slice(0, 5) ?? "",
          locationText: event.location_text ?? "",
          currency: event.currency as EventInput["currency"],
          rsvpDeadline: event.rsvp_deadline
            ? event.rsvp_deadline.slice(0, 16)
            : "",
        }
      : {
          currency: DEFAULT_CURRENCY,
          eventTypeId: eventTypes[0]?.id,
        },
  });

  const hostEaterType = (): ParticipantEaterType =>
    profile.dietary_restrictions?.vegetarian
      ? "vegetarian"
      : profile.default_eater_type;

  const onSubmit = async (data: EventInput) => {
    setLoading(true);
    const supabase = createClient();

    const payload = {
      title: data.title,
      description: data.description?.trim() || null,
      event_type_id: data.eventTypeId,
      event_date: data.eventDate,
      event_time: data.eventTime || null,
      location_text: data.locationText?.trim() || null,
      currency: data.currency,
      rsvp_deadline: data.rsvpDeadline
        ? new Date(data.rsvpDeadline).toISOString()
        : null,
    };

    if (isEdit) {
      const { error } = await supabase
        .from("events")
        .update(payload)
        .eq("id", event.id);
      setLoading(false);
      if (error) {
        toast.error(tErrors("generic"));
        return;
      }
      toast.success(t("updated"));
      router.push(`/app/event/${event.id}`);
      router.refresh();
      return;
    }

    // ---- Crear evento ----
    const { data: created, error } = await supabase
      .from("events")
      .insert({ ...payload, host_id: profile.id })
      .select()
      .single();

    if (error || !created) {
      toast.error(tErrors("generic"));
      setLoading(false);
      return;
    }

    // Instanciar ítems del preset con cantidades en 0 (spec 5.2)
    const { data: presets } = await supabase
      .from("event_type_presets")
      .select("*")
      .eq("event_type_id", data.eventTypeId)
      .order("sort_order");

    if (presets && presets.length > 0) {
      await supabase
        .from("event_items")
        .insert(buildItemsFromPresets(created.id, presets));
    }

    // El host queda como participante confirmado
    await supabase.from("event_participants").insert({
      event_id: created.id,
      user_id: profile.id,
      rsvp_status: "yes",
      eater_type: hostEaterType(),
      responded_at: new Date().toISOString(),
    });

    // ---- Import opcional desde Excel (spec 5.9) ----
    if (importResult) {
      let skipped = 0;

      for (const p of importResult.participants) {
        const { data: userId } = await supabase.rpc("find_profile_by_email", {
          p_email: p.email,
        });
        if (!userId) {
          skipped++;
          continue;
        }
        await supabase.from("event_participants").insert({
          event_id: created.id,
          user_id: userId as string,
          rsvp_status: "pending",
          eater_type: p.eaterType,
          guest_count: p.guestCount,
          guest_breakdown: Array.from({ length: p.guestCount }, () => ({
            eater_type: "normal" as const,
          })),
        });
      }

      if (importResult.items.length > 0) {
        await supabase.from("event_items").insert(
          importResult.items.map((item, i) => ({
            event_id: created.id,
            item_name: item.name,
            unit: item.unit,
            quantity_needed: item.quantity,
            category: item.category,
            sort_order: 1000 + i,
            auto_calculated: false,
          }))
        );
      }

      if (skipped > 0) {
        toast.info(t("importSkipped", { count: skipped }));
      }
    }

    toast.success(t("created"));
    router.push(`/app/event/${created.id}`);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? t("editTitle") : t("newTitle")}</CardTitle>
          <CardDescription>
            {isEdit ? t("editSubtitle") : t("newSubtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="title">{t("title")}</Label>
            <Input
              id="title"
              placeholder={t("titlePlaceholder")}
              {...register("title")}
            />
            <FieldError message={errors.title?.message} />
          </div>

          <div className="grid gap-2">
            <Label>{t("type")}</Label>
            <Controller
              control={control}
              name="eventTypeId"
              render={({ field }) => (
                <Select
                  value={field.value ?? null}
                  onValueChange={(v) => field.onChange(v)}
                  disabled={isEdit}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("typePlaceholder")}>
                      {(value) =>
                        eventTypes.find((et) => et.id === value)?.name ??
                        t("typePlaceholder")
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                        {!type.is_global ? ` · ${t("customTag")}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {!isEdit && (
              <p className="text-xs text-muted-foreground">
                {t.rich("typeHint", {
                  link: (chunks) => (
                    <Link href="/app/event-types" className="underline">
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            )}
            <FieldError message={errors.eventTypeId?.message} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="eventDate">{t("date")}</Label>
              <Input id="eventDate" type="date" {...register("eventDate")} />
              <FieldError message={errors.eventDate?.message} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="eventTime">{t("time")}</Label>
              <Input id="eventTime" type="time" {...register("eventTime")} />
              <FieldError message={errors.eventTime?.message} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="locationText">{t("location")}</Label>
            <Input
              id="locationText"
              placeholder={t("locationPlaceholder")}
              {...register("locationText")}
            />
            <FieldError message={errors.locationText?.message} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">{t("description")}</Label>
            <Textarea id="description" {...register("description")} />
            <FieldError message={errors.description?.message} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("currency")}</Label>
              <Controller
                control={control}
                name="currency"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rsvpDeadline">{t("rsvpDeadline")}</Label>
              <Input
                id="rsvpDeadline"
                type="datetime-local"
                {...register("rsvpDeadline")}
              />
            </div>
          </div>

          {!isEdit && (
            <ExcelImportField
              importResult={importResult}
              onImport={setImportResult}
            />
          )}
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={loading}
          >
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading
              ? t("saving")
              : isEdit
                ? t("saveButton")
                : t("createButton")}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
