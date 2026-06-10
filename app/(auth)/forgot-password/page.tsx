"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shared/field-error";
import { createClient } from "@/lib/supabase/client";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validators/auth";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setLoading(true);
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    if (error) {
      setServerError(tErrors("generic"));
      setLoading(false);
      return;
    }
    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <MailCheck className="size-10 text-green-600" />
          <CardTitle>{t("resetEmailSentTitle")}</CardTitle>
          <CardDescription>{t("resetEmailSentSubtitle")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("forgotTitle")}</CardTitle>
        <CardDescription>{t("forgotSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
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
          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? t("loading") : t("forgotButton")}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="underline">
            {t("backToLogin")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
