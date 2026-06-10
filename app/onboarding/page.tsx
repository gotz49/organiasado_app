"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { EATER_TYPES } from "@/lib/constants";
import type { EaterTypeDefault } from "@/types/database";

function OnboardingForm() {
  const t = useTranslations("onboarding");
  const tErrors = useTranslations("errors");
  const tEater = useTranslations("eaterTypes");
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/app";
  const safeNext = next.startsWith("/") ? next : "/app";

  const [eaterType, setEaterType] = useState<EaterTypeDefault>("normal");
  const [vegetarian, setVegetarian] = useState(false);
  const [celiac, setCeliac] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const finish = () => {
    router.push(safeNext);
    router.refresh();
  };

  const save = async () => {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        default_eater_type: eaterType,
        dietary_restrictions: {
          vegetarian,
          celiac,
          notes: notes.trim() || undefined,
        },
      })
      .eq("id", user.id);

    if (error) {
      toast.error(tErrors("generic"));
      setLoading(false);
      return;
    }
    finish();
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-3">
            <Label>{t("eaterTypeQuestion")}</Label>
            <RadioGroup
              value={eaterType}
              onValueChange={(v) => setEaterType(v as EaterTypeDefault)}
            >
              {EATER_TYPES.map((type) => (
                <div key={type} className="flex items-center gap-2">
                  <RadioGroupItem value={type} id={`eater-${type}`} />
                  <Label htmlFor={`eater-${type}`} className="font-normal">
                    {tEater(type)} — {t(`eaterHint.${type}`)}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="grid gap-3">
            <Label>{t("dietaryQuestion")}</Label>
            <div className="flex items-center gap-2">
              <Checkbox
                id="vegetarian"
                checked={vegetarian}
                onCheckedChange={(c) => setVegetarian(c === true)}
              />
              <Label htmlFor="vegetarian" className="font-normal">
                {t("vegetarian")}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="celiac"
                checked={celiac}
                onCheckedChange={(c) => setCeliac(c === true)}
              />
              <Label htmlFor="celiac" className="font-normal">
                {t("celiac")}
              </Label>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">{t("allergiesLabel")}</Label>
            <Textarea
              id="notes"
              placeholder={t("allergiesPlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="ghost" onClick={finish} disabled={loading}>
            {t("skip")}
          </Button>
          <Button onClick={save} disabled={loading}>
            {loading ? t("saving") : t("continue")}
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingForm />
    </Suspense>
  );
}
