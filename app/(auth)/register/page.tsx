"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslations } from "next-intl";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shared/field-error";
import { createClient } from "@/lib/supabase/client";
import { registerSchema, type RegisterInput } from "@/lib/validators/auth";

function RegisterForm() {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { acceptTerms: undefined as unknown as true },
  });

  const onSubmit = async (data: RegisterInput) => {
    setLoading(true);
    setServerError(null);
    const supabase = createClient();
    const next = searchParams.get("next");
    const onboardingUrl = `/onboarding${next ? `?next=${encodeURIComponent(next)}` : ""}`;

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { display_name: data.displayName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(onboardingUrl)}`,
      },
    });

    if (error) {
      setServerError(
        error.message.includes("already registered")
          ? tErrors("emailTaken")
          : tErrors("generic")
      );
      setLoading(false);
      return;
    }

    if (signUpData.session) {
      // Verificación de email deshabilitada en el proyecto: entrar directo
      router.push(onboardingUrl);
      router.refresh();
      return;
    }

    setEmailSent(true);
    setLoading(false);
  };

  if (emailSent) {
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <MailCheck className="size-10 text-green-600" />
          <CardTitle>{t("checkEmailTitle")}</CardTitle>
          <CardDescription>{t("checkEmailSubtitle")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("registerTitle")}</CardTitle>
        <CardDescription>{t("registerSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="displayName">{t("displayName")}</Label>
            <Input
              id="displayName"
              autoComplete="name"
              {...register("displayName")}
            />
            <FieldError message={errors.displayName?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
            />
            <FieldError message={errors.email?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
            />
            <FieldError message={errors.password?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
            <FieldError message={errors.confirmPassword?.message} />
          </div>
          <div className="grid gap-2">
            <div className="flex items-start gap-2">
              <Controller
                control={control}
                name="acceptTerms"
                render={({ field }) => (
                  <Checkbox
                    id="acceptTerms"
                    checked={field.value === true}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true ? true : undefined)
                    }
                  />
                )}
              />
              <Label htmlFor="acceptTerms" className="font-normal leading-snug">
                {t.rich("acceptTerms", {
                  terms: (chunks) => (
                    <Link href="/terms" className="underline" target="_blank">
                      {chunks}
                    </Link>
                  ),
                  privacy: (chunks) => (
                    <Link href="/privacy" className="underline" target="_blank">
                      {chunks}
                    </Link>
                  ),
                })}
              </Label>
            </div>
            <FieldError message={errors.acceptTerms?.message} />
          </div>
          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? t("loading") : t("registerButton")}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t("hasAccount")}{" "}
          <Link href="/login" className="text-foreground underline">
            {t("loginLink")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
