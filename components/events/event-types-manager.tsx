"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Copy, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import type { EventType, EventTypePreset } from "@/types/database";
import { PresetItemsEditor } from "@/components/events/preset-items-editor";

export function EventTypesManager({
  userId,
  types,
  presets,
}: {
  userId: string;
  types: EventType[];
  presets: EventTypePreset[];
}) {
  const t = useTranslations("eventTypes");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  const presetsFor = (typeId: string) =>
    presets.filter((p) => p.event_type_id === typeId);

  const createType = async () => {
    const name = newName.trim();
    if (name.length < 2) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("event_types")
      .insert({ name, created_by: userId, is_global: false });
    setLoading(false);
    if (error) {
      toast.error(tErrors("generic"));
      return;
    }
    toast.success(t("created"));
    setNewName("");
    router.refresh();
  };

  const duplicateType = async (source: EventType) => {
    setLoading(true);
    const supabase = createClient();
    const { data: created, error } = await supabase
      .from("event_types")
      .insert({
        name: t("copyName", { name: source.name }),
        icon: source.icon,
        created_by: userId,
        is_global: false,
      })
      .select()
      .single();

    if (error || !created) {
      toast.error(tErrors("generic"));
      setLoading(false);
      return;
    }

    const sourcePresets = presetsFor(source.id);
    if (sourcePresets.length > 0) {
      await supabase.from("event_type_presets").insert(
        sourcePresets.map((p) => ({
          event_type_id: created.id,
          item_name: p.item_name,
          unit: p.unit,
          qty_per_adult_low: p.qty_per_adult_low,
          qty_per_adult_normal: p.qty_per_adult_normal,
          qty_per_adult_high: p.qty_per_adult_high,
          qty_per_child: p.qty_per_child,
          is_vegetarian_safe: p.is_vegetarian_safe,
          category: p.category,
          sort_order: p.sort_order,
        }))
      );
    }

    setLoading(false);
    toast.success(t("duplicated"));
    router.refresh();
  };

  const deleteType = async (typeId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("event_types")
      .delete()
      .eq("id", typeId);
    if (error) {
      toast.error(tErrors("generic"));
      return;
    }
    toast.success(t("deleted"));
    router.refresh();
  };

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("createNew")}</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder={t("namePlaceholder")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                createType();
              }
            }}
          />
          <Button onClick={createType} disabled={loading || newName.trim().length < 2}>
            <Plus />
            {t("create")}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {types.map((type) => {
          const typePresets = presetsFor(type.id);
          const isOwn = !type.is_global;
          return (
            <Card key={type.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{type.name}</CardTitle>
                    <Badge variant={type.is_global ? "secondary" : "outline"}>
                      {type.is_global ? t("globalBadge") : t("customBadge")}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={loading}
                      onClick={() => duplicateType(type)}
                      title={t("duplicate")}
                    >
                      <Copy />
                    </Button>
                    {isOwn && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={loading}
                        onClick={() => deleteType(type.id)}
                        title={t("delete")}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </div>
                <CardDescription>
                  {t("itemCount", { count: typePresets.length })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isOwn ? (
                  <PresetItemsEditor typeId={type.id} presets={typePresets} />
                ) : (
                  <ReadOnlyPresets presets={typePresets} />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ReadOnlyPresets({ presets }: { presets: EventTypePreset[] }) {
  const t = useTranslations("eventTypes");
  const [open, setOpen] = useState(false);

  if (presets.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            {t("viewItems")}
          </Button>
        }
      />
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("itemsTitle")}</DialogTitle>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colItem")}</TableHead>
              <TableHead>{t("colUnit")}</TableHead>
              <TableHead className="text-right">{t("colLow")}</TableHead>
              <TableHead className="text-right">{t("colNormal")}</TableHead>
              <TableHead className="text-right">{t("colHigh")}</TableHead>
              <TableHead className="text-right">{t("colChild")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {presets.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.item_name}</TableCell>
                <TableCell>{p.unit}</TableCell>
                <TableCell className="text-right">{p.qty_per_adult_low}</TableCell>
                <TableCell className="text-right">{p.qty_per_adult_normal}</TableCell>
                <TableCell className="text-right">{p.qty_per_adult_high}</TableCell>
                <TableCell className="text-right">{p.qty_per_child}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
