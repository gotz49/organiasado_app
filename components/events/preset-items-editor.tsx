"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { ITEM_CATEGORIES, ITEM_UNITS } from "@/lib/constants";
import type { EventTypePreset } from "@/types/database";

const emptyDraft = {
  itemName: "",
  unit: "g",
  category: "comida",
  low: "",
  normal: "",
  high: "",
  child: "0",
  vegSafe: true,
};

export function PresetItemsEditor({
  typeId,
  presets,
}: {
  typeId: string;
  presets: EventTypePreset[];
}) {
  const t = useTranslations("eventTypes");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [draft, setDraft] = useState(emptyDraft);
  const [loading, setLoading] = useState(false);

  const addItem = async () => {
    if (!draft.itemName.trim() || draft.normal === "") return;
    setLoading(true);
    const supabase = createClient();
    const normal = Number(draft.normal);
    const { error } = await supabase.from("event_type_presets").insert({
      event_type_id: typeId,
      item_name: draft.itemName.trim(),
      unit: draft.unit,
      category: draft.category,
      qty_per_adult_low: draft.low === "" ? normal : Number(draft.low),
      qty_per_adult_normal: normal,
      qty_per_adult_high: draft.high === "" ? normal : Number(draft.high),
      qty_per_child: draft.child === "" ? 0 : Number(draft.child),
      is_vegetarian_safe: draft.vegSafe,
      sort_order: presets.length + 1,
    });
    setLoading(false);
    if (error) {
      toast.error(tErrors("generic"));
      return;
    }
    setDraft(emptyDraft);
    router.refresh();
  };

  const deleteItem = async (presetId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("event_type_presets")
      .delete()
      .eq("id", presetId);
    if (error) {
      toast.error(tErrors("generic"));
      return;
    }
    router.refresh();
  };

  return (
    <div className="grid gap-4">
      {presets.length > 0 && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colItem")}</TableHead>
                <TableHead>{t("colUnit")}</TableHead>
                <TableHead className="text-right">{t("colLow")}</TableHead>
                <TableHead className="text-right">{t("colNormal")}</TableHead>
                <TableHead className="text-right">{t("colHigh")}</TableHead>
                <TableHead className="text-right">{t("colChild")}</TableHead>
                <TableHead>{t("colVegSafe")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {presets.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.item_name}</TableCell>
                  <TableCell>{p.unit}</TableCell>
                  <TableCell className="text-right">
                    {p.qty_per_adult_low}
                  </TableCell>
                  <TableCell className="text-right">
                    {p.qty_per_adult_normal}
                  </TableCell>
                  <TableCell className="text-right">
                    {p.qty_per_adult_high}
                  </TableCell>
                  <TableCell className="text-right">{p.qty_per_child}</TableCell>
                  <TableCell>{p.is_vegetarian_safe ? "✓" : "✗"}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => deleteItem(p.id)}
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="grid gap-2 rounded-lg border p-3">
        <p className="text-sm font-medium">{t("addItem")}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Input
            className="col-span-2"
            placeholder={t("itemNamePlaceholder")}
            value={draft.itemName}
            onChange={(e) => setDraft({ ...draft, itemName: e.target.value })}
          />
          <Select
            value={draft.unit}
            onValueChange={(v) => setDraft({ ...draft, unit: v as string })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ITEM_UNITS.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={draft.category}
            onValueChange={(v) => setDraft({ ...draft, category: v as string })}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {(value) =>
                  (ITEM_CATEGORIES as readonly string[]).includes(value)
                    ? t(`categories.${value}`)
                    : value
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ITEM_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {t(`categories.${c}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <Input
            type="number"
            min="0"
            step="any"
            placeholder={t("colLow")}
            value={draft.low}
            onChange={(e) => setDraft({ ...draft, low: e.target.value })}
          />
          <Input
            type="number"
            min="0"
            step="any"
            placeholder={`${t("colNormal")} *`}
            value={draft.normal}
            onChange={(e) => setDraft({ ...draft, normal: e.target.value })}
          />
          <Input
            type="number"
            min="0"
            step="any"
            placeholder={t("colHigh")}
            value={draft.high}
            onChange={(e) => setDraft({ ...draft, high: e.target.value })}
          />
          <Input
            type="number"
            min="0"
            step="any"
            placeholder={t("colChild")}
            value={draft.child}
            onChange={(e) => setDraft({ ...draft, child: e.target.value })}
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={draft.vegSafe}
              onCheckedChange={(c) => setDraft({ ...draft, vegSafe: c === true })}
            />
            {t("colVegSafe")}
          </label>
          <Button
            size="sm"
            onClick={addItem}
            disabled={loading || !draft.itemName.trim() || draft.normal === ""}
          >
            <Plus />
            {t("add")}
          </Button>
        </div>
      </div>
    </div>
  );
}
