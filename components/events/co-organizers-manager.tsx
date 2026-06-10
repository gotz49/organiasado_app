"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { UserMinus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function CoOrganizersManager({
  eventId,
  coOrganizers,
}: {
  eventId: string;
  coOrganizers: { userId: string; name: string }[];
}) {
  const t = useTranslations("coOrganizers");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const addCoOrganizer = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setLoading(true);
    const supabase = createClient();

    const { data: userId, error: findError } = await supabase.rpc(
      "find_profile_by_email",
      { p_email: trimmed }
    );

    if (findError || !userId) {
      toast.error(t("userNotFound"));
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("event_co_organizers").insert({
      event_id: eventId,
      user_id: userId as string,
    });

    setLoading(false);
    if (error) {
      toast.error(
        error.code === "23505" ? t("alreadyCoOrganizer") : tErrors("generic")
      );
      return;
    }
    toast.success(t("added"));
    setEmail("");
    router.refresh();
  };

  const removeCoOrganizer = async (userId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("event_co_organizers")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", userId);

    if (error) {
      toast.error(tErrors("generic"));
      return;
    }
    toast.success(t("removed"));
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCoOrganizer();
              }
            }}
          />
          <Button
            type="button"
            onClick={addCoOrganizer}
            disabled={loading || !email.trim()}
          >
            <UserPlus />
            {t("add")}
          </Button>
        </div>

        {coOrganizers.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="grid gap-2">
            {coOrganizers.map((coOrg) => (
              <li
                key={coOrg.userId}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                {coOrg.name}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeCoOrganizer(coOrg.userId)}
                >
                  <UserMinus />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
