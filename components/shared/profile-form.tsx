"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/shared/field-error";
import { createClient } from "@/lib/supabase/client";
import { EATER_TYPES } from "@/lib/constants";
import { profileSchema, type ProfileInput } from "@/lib/validators/auth";
import type { Profile } from "@/types/database";

export function ProfileForm({
  profile,
  email,
}: {
  profile: Profile;
  email: string;
}) {
  const t = useTranslations("profile");
  const tEater = useTranslations("eaterTypes");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url ?? "",
      defaultEaterType: profile.default_eater_type,
      vegetarian: profile.dietary_restrictions?.vegetarian ?? false,
      celiac: profile.dietary_restrictions?.celiac ?? false,
      dietaryNotes: profile.dietary_restrictions?.notes ?? "",
    },
  });

  const onSubmit = async (data: ProfileInput) => {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: data.displayName,
        avatar_url: data.avatarUrl?.trim() || null,
        default_eater_type: data.defaultEaterType,
        dietary_restrictions: {
          vegetarian: data.vegetarian,
          celiac: data.celiac,
          notes: data.dietaryNotes?.trim() || undefined,
        },
      })
      .eq("id", profile.id);

    setLoading(false);
    if (error) {
      toast.error(tErrors("generic"));
      return;
    }
    toast.success(t("saved"));
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{email}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="displayName">{t("displayName")}</Label>
            <Input id="displayName" {...register("displayName")} />
            <FieldError message={errors.displayName?.message} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="avatarUrl">{t("avatarUrl")}</Label>
            <Input
              id="avatarUrl"
              type="url"
              placeholder="https://…"
              {...register("avatarUrl")}
            />
            <p className="text-xs text-muted-foreground">{t("avatarHint")}</p>
            <FieldError message={errors.avatarUrl?.message} />
          </div>

          <div className="grid gap-3">
            <Label>{t("defaultEaterType")}</Label>
            <Controller
              control={control}
              name="defaultEaterType"
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={(v) => field.onChange(v)}
                >
                  {EATER_TYPES.map((type) => (
                    <div key={type} className="flex items-center gap-2">
                      <RadioGroupItem value={type} id={`eater-${type}`} />
                      <Label htmlFor={`eater-${type}`} className="font-normal">
                        {tEater(type)}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            />
          </div>

          <div className="grid gap-3">
            <Label>{t("dietary")}</Label>
            <Controller
              control={control}
              name="vegetarian"
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="vegetarian"
                    checked={field.value}
                    onCheckedChange={(c) => field.onChange(c === true)}
                  />
                  <Label htmlFor="vegetarian" className="font-normal">
                    {t("vegetarian")}
                  </Label>
                </div>
              )}
            />
            <Controller
              control={control}
              name="celiac"
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="celiac"
                    checked={field.value}
                    onCheckedChange={(c) => field.onChange(c === true)}
                  />
                  <Label htmlFor="celiac" className="font-normal">
                    {t("celiac")}
                  </Label>
                </div>
              )}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dietaryNotes">{t("allergies")}</Label>
            <Textarea id="dietaryNotes" {...register("dietaryNotes")} />
            <FieldError message={errors.dietaryNotes?.message} />
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? t("saving") : t("save")}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
