"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

/**
 * Aviso breve para usuarios invitados (anónimos) + diálogo para asegurar la
 * cuenta. El "upgrade" VINCULA email+contraseña al usuario anónimo actual
 * (supabase.auth.updateUser), conservando todos sus datos — no crea uno nuevo.
 */
export function GuestBanner({ displayName }: { displayName: string }) {
  const t = useTranslations("guest");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(displayName);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const upgrade = async () => {
    if (name.trim().length < 2) return toast.error(tErrors("nameTooShort"));
    if (!email.includes("@")) return toast.error(tErrors("invalidEmail"));
    if (password.length < 8) return toast.error(tErrors("passwordTooShort"));
    if (password !== confirm)
      return toast.error(tErrors("passwordsDontMatch"));

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.updateUser({
      email: email.trim(),
      password,
      data: { display_name: name.trim() },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      toast.error(
        msg.includes("registered") || msg.includes("already")
          ? tErrors("emailTaken")
          : tErrors("generic")
      );
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase
        .from("profiles")
        .update({ is_anonymous: false, display_name: name.trim() })
        .eq("id", data.user.id);
    }

    toast.success(t("upgraded"));
    setOpen(false);
    setLoading(false);
    router.refresh();
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b bg-accent px-4 py-2 text-accent-foreground">
        <p className="flex items-center gap-2 text-xs sm:text-sm">
          <Info className="size-4 shrink-0" />
          {t("bannerText")}
        </p>
        <Button
          size="sm"
          variant="secondary"
          className="shrink-0"
          onClick={() => setOpen(true)}
        >
          {t("secureAccount")}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("upgradeTitle")}</DialogTitle>
            <DialogDescription>{t("upgradeSubtitle")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="up-name">{t("name")}</Label>
              <Input
                id="up-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="up-email">{t("email")}</Label>
              <Input
                id="up-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="up-pass">{t("password")}</Label>
              <Input
                id="up-pass"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="up-confirm">{t("confirmPassword")}</Label>
              <Input
                id="up-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              {t("cancel")}
            </Button>
            <Button onClick={upgrade} disabled={loading}>
              {loading ? t("saving") : t("createAccount")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
