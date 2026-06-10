"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import type { EventRow, EventStatus } from "@/types/database";

export function DangerZone({ event }: { event: EventRow }) {
  const t = useTranslations("dangerZone");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const setStatus = async (status: EventStatus) => {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("events")
      .update({ status })
      .eq("id", event.id);
    setLoading(false);
    if (error) {
      toast.error(tErrors("generic"));
      return;
    }
    toast.success(t(`done.${status}`));
    router.refresh();
  };

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {event.status === "cancelled" ? (
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => setStatus("active")}
          >
            {t("reactivate")}
          </Button>
        ) : (
          <Dialog>
            <DialogTrigger
              render={
                <Button variant="destructive" disabled={loading}>
                  {t("cancelEvent")}
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("confirmCancelTitle")}</DialogTitle>
                <DialogDescription>
                  {t("confirmCancelSubtitle")}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose
                  render={<Button variant="ghost">{t("keepEvent")}</Button>}
                />
                <DialogClose
                  render={
                    <Button
                      variant="destructive"
                      onClick={() => setStatus("cancelled")}
                    >
                      {t("confirmCancel")}
                    </Button>
                  }
                />
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {event.status !== "archived" && event.status !== "cancelled" && (
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => setStatus("archived")}
          >
            {t("archive")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
