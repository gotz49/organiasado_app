"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { HandHelping, Pencil, Plus, Trash2, Wand2 } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { itemCoverage } from "@/lib/calculator";
import { formatNumber } from "@/lib/format";
import { ITEM_CATEGORIES, ITEM_UNITS } from "@/lib/constants";
import type { EventItem, EventRow } from "@/types/database";
import { eventDataKey, type EventData } from "./use-event-data";

export function ItemsTab({
  event,
  data,
  currentUserId,
  isOrganizer,
}: {
  event: EventRow;
  data: EventData;
  currentUserId: string;
  isOrganizer: boolean;
}) {
  const t = useTranslations("items");
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: eventDataKey(event.id) });

  const myParticipant = data.participants.find(
    (p) =>
      p.user_id === currentUserId &&
      (p.rsvp_status === "yes" || p.rsvp_status === "maybe")
  );

  const byCategory = new Map<string, EventItem[]>();
  for (const item of data.items) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t("hint")}</p>
        {isOrganizer && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus />
            {t("addItem")}
          </Button>
        )}
      </div>

      {data.items.length === 0 && (
        <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
          {t("empty")}
        </p>
      )}

      {[...byCategory.entries()].map(([category, items]) => (
        <section key={category} className="grid gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {(ITEM_CATEGORIES as readonly string[]).includes(category)
              ? t(`categories.${category}`)
              : category}
          </h3>
          <div className="grid gap-2">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                data={data}
                myParticipantId={myParticipant?.id}
                isOrganizer={isOrganizer}
                onChanged={invalidate}
              />
            ))}
          </div>
        </section>
      ))}

      <AddItemDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        eventId={event.id}
        sortOrder={data.items.length + 1}
        onCreated={invalidate}
      />
    </div>
  );
}

function ItemCard({
  item,
  data,
  myParticipantId,
  isOrganizer,
  onChanged,
}: {
  item: EventItem;
  data: EventData;
  myParticipantId?: string;
  isOrganizer: boolean;
  onChanged: () => void;
}) {
  const t = useTranslations("items");
  const tErrors = useTranslations("errors");
  const [assignOpen, setAssignOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const assignments = data.assignments.filter((a) => a.item_id === item.id);
  const assignedTotal = assignments.reduce((sum, a) => sum + a.quantity, 0);
  const coverage = itemCoverage(item.quantity_needed, assignedTotal);
  const myAssignment = assignments.find(
    (a) => a.participant_id === myParticipantId
  );

  const nameOf = (participantId: string) => {
    const participant = data.participants.find((p) => p.id === participantId);
    return participant
      ? (data.profiles.get(participant.user_id)?.display_name ?? "?")
      : "?";
  };

  const deleteItem = async () => {
    const supabase = createClient();
    const { error } = await supabase
      .from("event_items")
      .delete()
      .eq("id", item.id);
    if (error) {
      toast.error(tErrors("generic"));
      return;
    }
    onChanged();
  };

  const coverageColor =
    coverage.status === "over"
      ? "text-amber-600"
      : coverage.status === "full"
        ? "text-green-600"
        : "text-muted-foreground";

  return (
    <div className="grid gap-2 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">
            {item.item_name}
            {item.auto_calculated && item.qty_per_adult_normal !== null && (
              <Wand2
                className="ml-1.5 inline size-3.5 text-muted-foreground"
                aria-label={t("autoCalculated")}
              />
            )}
          </p>
          <p className={`text-xs ${coverageColor}`}>
            {t("coverage", {
              assigned: formatNumber(assignedTotal),
              needed: formatNumber(item.quantity_needed),
              unit: item.unit,
            })}
            {coverage.status === "over" && ` · ${t("overAssigned")}`}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          {myParticipantId && (
            <Button
              variant={myAssignment ? "secondary" : "outline"}
              size="sm"
              onClick={() => setAssignOpen(true)}
            >
              <HandHelping />
              {myAssignment ? t("editMine") : t("takeIt")}
            </Button>
          )}
          {isOrganizer && (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setEditOpen(true)}
                title={t("editItem")}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={deleteItem}
                title={t("deleteItem")}
              >
                <Trash2 />
              </Button>
            </>
          )}
        </div>
      </div>

      <Progress value={Math.min(coverage.ratio * 100, 100)} />

      {assignments.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {assignments
            .map(
              (a) =>
                `${nameOf(a.participant_id)}: ${formatNumber(a.quantity)} ${item.unit}`
            )
            .join(" · ")}
        </p>
      )}

      {myParticipantId && (
        <AssignDialog
          open={assignOpen}
          onOpenChange={setAssignOpen}
          item={item}
          participantId={myParticipantId}
          currentQuantity={myAssignment?.quantity}
          assignmentId={myAssignment?.id}
          remaining={Math.max(item.quantity_needed - assignedTotal, 0)}
          onChanged={onChanged}
        />
      )}

      {isOrganizer && (
        <EditItemDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          item={item}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}

function AssignDialog({
  open,
  onOpenChange,
  item,
  participantId,
  currentQuantity,
  assignmentId,
  remaining,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: EventItem;
  participantId: string;
  currentQuantity?: number;
  assignmentId?: string;
  remaining: number;
  onChanged: () => void;
}) {
  const t = useTranslations("items");
  const tErrors = useTranslations("errors");
  const [quantity, setQuantity] = useState(
    String(currentQuantity ?? (remaining || ""))
  );
  const [loading, setLoading] = useState(false);

  const save = async () => {
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) return;
    setLoading(true);
    const supabase = createClient();

    const { error } = assignmentId
      ? await supabase
          .from("item_assignments")
          .update({ quantity: qty })
          .eq("id", assignmentId)
      : await supabase.from("item_assignments").insert({
          item_id: item.id,
          participant_id: participantId,
          quantity: qty,
        });

    setLoading(false);
    if (error) {
      toast.error(tErrors("generic"));
      return;
    }
    toast.success(t("assigned"));
    onOpenChange(false);
    onChanged();
  };

  const removeAssignment = async () => {
    if (!assignmentId) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("item_assignments")
      .delete()
      .eq("id", assignmentId);
    setLoading(false);
    if (error) {
      toast.error(tErrors("generic"));
      return;
    }
    onOpenChange(false);
    onChanged();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {t("assignTitle", { item: item.item_name })}
          </DialogTitle>
          <DialogDescription>
            {t("assignSubtitle", {
              remaining: formatNumber(remaining),
              unit: item.unit,
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="assign-qty">
            {t("quantityLabel", { unit: item.unit })}
          </Label>
          <Input
            id="assign-qty"
            type="number"
            min="0"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
        <DialogFooter>
          {assignmentId && (
            <Button
              variant="destructive"
              onClick={removeAssignment}
              disabled={loading}
              className="mr-auto"
            >
              {t("unassign")}
            </Button>
          )}
          <Button
            onClick={save}
            disabled={loading || !quantity || Number(quantity) <= 0}
          >
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditItemDialog({
  open,
  onOpenChange,
  item,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: EventItem;
  onChanged: () => void;
}) {
  const t = useTranslations("items");
  const tErrors = useTranslations("errors");
  const [name, setName] = useState(item.item_name);
  const [quantity, setQuantity] = useState(String(item.quantity_needed));
  const [notes, setNotes] = useState(item.notes ?? "");
  const [loading, setLoading] = useState(false);

  const canAutoCalc = item.qty_per_adult_normal !== null;
  const quantityChanged = Number(quantity) !== item.quantity_needed;

  const save = async () => {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("event_items")
      .update({
        item_name: name.trim() || item.item_name,
        quantity_needed: Number(quantity),
        notes: notes.trim() || null,
        // Sobrescribir manualmente congela el recálculo (spec 5.5)
        auto_calculated: quantityChanged ? false : item.auto_calculated,
      })
      .eq("id", item.id);
    setLoading(false);
    if (error) {
      toast.error(tErrors("generic"));
      return;
    }
    onOpenChange(false);
    onChanged();
  };

  const reactivateAuto = async () => {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("event_items")
      .update({ auto_calculated: true })
      .eq("id", item.id);
    if (!error) {
      await supabase.rpc("recalc_event_quantities", {
        p_event_id: item.event_id,
      });
    }
    setLoading(false);
    if (error) {
      toast.error(tErrors("generic"));
      return;
    }
    onOpenChange(false);
    onChanged();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("editItemTitle")}</DialogTitle>
          {canAutoCalc && (
            <DialogDescription>
              {item.auto_calculated
                ? t("autoOnHint")
                : t("autoOffHint")}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-name">{t("nameLabel")}</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-qty">
              {t("quantityLabel", { unit: item.unit })}
            </Label>
            <Input
              id="edit-qty"
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-notes">{t("notesLabel")}</Label>
            <Input
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          {canAutoCalc && !item.auto_calculated && (
            <Button
              variant="outline"
              onClick={reactivateAuto}
              disabled={loading}
              className="mr-auto"
            >
              <Wand2 />
              {t("reactivateAuto")}
            </Button>
          )}
          <Button onClick={save} disabled={loading}>
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddItemDialog({
  open,
  onOpenChange,
  eventId,
  sortOrder,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  sortOrder: number;
  onCreated: () => void;
}) {
  const t = useTranslations("items");
  const tCategories = useTranslations("items.categories");
  const tErrors = useTranslations("errors");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("unidad");
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState("comida");
  const [loading, setLoading] = useState(false);

  const create = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("event_items").insert({
      event_id: eventId,
      item_name: name.trim(),
      unit,
      quantity_needed: quantity === "" ? 0 : Number(quantity),
      category,
      sort_order: sortOrder,
      auto_calculated: false,
    });
    setLoading(false);
    if (error) {
      toast.error(tErrors("generic"));
      return;
    }
    toast.success(t("itemAdded"));
    setName("");
    setQuantity("");
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("addItemTitle")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="new-item-name">{t("nameLabel")}</Label>
            <Input
              id="new-item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>{t("unitLabel")}</Label>
              <Select value={unit} onValueChange={(v) => setUnit(v as string)}>
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
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-item-qty">{t("quantityShort")}</Label>
              <Input
                id="new-item-qty"
                type="number"
                min="0"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>{t("categoryLabel")}</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as string)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEM_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {tCategories(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={create} disabled={loading || !name.trim()}>
            {t("addItem")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
