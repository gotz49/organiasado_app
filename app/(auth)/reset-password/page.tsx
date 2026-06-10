"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/validators/auth";

export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setLoading(true);
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: data.password,
    });
    if (error) {
      setServerError(
        error.message.includes("session") ? tErrors("sessionExpired") : tErrors("generic")
      );
      setLoading(false);
      return;
    }
    toast.success(t("passwordUpdated"));
    router.push("/app");
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("resetTitle")}</CardTitle>
        <CardDescription>{t("resetSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="password">{t("newPassword")}</Label>
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
          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? t("loading") : t("resetButton")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
