"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

/**
 * Acceso al evento sin registrarse (spec: invitado temporal).
 * Usa la auth anónima de Supabase: el invitado obtiene una sesión real
 * con su nombre, participa con RLS normal y queda marcado como
 * "no registrado". Para ser co-organizador hay que registrarse.
 */
export function GuestAccess({ shareToken }: { shareToken: string }) {
  const t = useTranslations("publicEvent");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);

  const next = `/e/${shareToken}`;
  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

  const enterAsGuest = async () => {
    if (fullName.length < 2) return;
    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInAnonymously({
      options: { data: { display_name: fullName } },
    });

    if (error || !data.user) {
      const msg = (error?.message ?? "").toLowerCase();
      const disabled =
        msg.includes("disabled") || msg.includes("anonymous");
      toast.error(disabled ? tErrors("guestDisabled") : tErrors("generic"));
      setLoading(false);
      return;
    }

    // Asegurar nombre + flag en el perfil (el trigger ya los setea,
    // esto cubre cualquier desfase).
    await supabase
      .from("profiles")
      .update({ display_name: fullName, is_anonymous: true })
      .eq("id", data.user.id);

    router.refresh();
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label>{t("guestTitle")}</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder={t("firstName")}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
          />
          <Input
            placeholder={t("lastName")}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                enterAsGuest();
              }
            }}
          />
        </div>
        <Button onClick={enterAsGuest} disabled={loading || fullName.length < 2}>
          {loading ? t("entering") : t("enterAsGuest")}
        </Button>
        <p className="text-xs text-muted-foreground">{t("guestHint")}</p>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t("or")}
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          render={<Link href={`/login?next=${encodeURIComponent(next)}`} />}
        >
          {t("login")}
        </Button>
        <Button
          variant="outline"
          render={<Link href={`/register?next=${encodeURIComponent(next)}`} />}
        >
          {t("register")}
        </Button>
      </div>
    </div>
  );
}
