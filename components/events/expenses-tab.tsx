"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Receipt, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { splitEqual } from "@/lib/debts";
import { formatCurrency } from "@/lib/format";
import type { EventRow, SplitMode } from "@/types/database";
import { eventDataKey, type EventData } from "./use-event-data";

export function ExpensesTab({
  event,
  data,
  currentUserId,
  isHost,
  isOrganizer,
}: {
  event: EventRow;
  data: EventData;
  currentUserId: string;
  isHost: boolean;
  isOrganizer: boolean;
}) {
  const t = useTranslations("expenses");
  const tErrors = useTranslations("errors");
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: eventDataKey(event.id) });

  const amConfirmed = data.participants.some(
    (p) => p.user_id === currentUserId && p.rsvp_status === "yes"
  );
  const canAddExpense = amConfirmed || isOrganizer;

  const nameOf = (userId: string) =>
    data.profiles.get(userId)?.display_name ?? "?";

  const deleteExpense = async (expenseId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expenseId);
    if (error) {
      toast.error(tErrors("generic"));
      return;
    }
    toast.success(t("deleted"));
    invalidate();
  };

  const total = data.expenses.reduce((sum, x) => sum + x.amount, 0);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("total", { amount: formatCurrency(total, event.currency) })}
        </p>
        {canAddExpense && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus />
            {t("addExpense")}
          </Button>
        )}
      </div>

      {data.expenses.length === 0 ? (
        <div className="rounded-lg border border-dashed py-10 text-center">
          <Receipt className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">{t("empty")}</p>
        </div>
      ) : (
        <ul className="grid gap-2">
          {data.expenses.map((expense) => {
            const shares = data.shares.filter(
              (s) => s.expense_id === expense.id
            );
            const canDelete =
              expense.created_by === currentUserId || isHost;
            return (
              <li
                key={expense.id}
                className="flex items-start gap-3 rounded-lg border px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{expense.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("paidBy", { name: nameOf(expense.paid_by) })}
                    {" · "}
                    {expense.split_mode === "equal"
                      ? t("splitEqual", { count: shares.length })
                      : t("splitCustom")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="secondary">
                    {formatCurrency(expense.amount, expense.currency)}
                  </Badge>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => deleteExpense(expense.id)}
                      title={t("delete")}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {addOpen && (
        <AddExpenseDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          event={event}
          data={data}
          currentUserId={currentUserId}
          isOrganizer={isOrganizer}
          onCreated={invalidate}
        />
      )}
    </div>
  );
}

function AddExpenseDialog({
  open,
  onOpenChange,
  event,
  data,
  currentUserId,
  isOrganizer,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: EventRow;
  data: EventData;
  currentUserId: string;
  isOrganizer: boolean;
  onCreated: () => void;
}) {
  const t = useTranslations("expenses");
  const tErrors = useTranslations("errors");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(currentUserId);
  const [itemId, setItemId] = useState<string>("");
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  // El diálogo se monta al abrir: todos los confirmados arrancan incluidos
  const [included, setIncluded] = useState<Set<string>>(
    () =>
      new Set(
        data.participants
          .filter((p) => p.rsvp_status === "yes")
          .map((p) => p.id)
      )
  );
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Participantes confirmados: entre ellos se divide (spec 5.7)
  const confirmed = data.participants.filter((p) => p.rsvp_status === "yes");

  const nameOf = (userId: string) =>
    data.profiles.get(userId)?.display_name ?? "?";

  const resetAndClose = () => {
    setDescription("");
    setAmount("");
    setItemId("");
    setSplitMode("equal");
    setIncluded(new Set());
    setCustomAmounts({});
    onOpenChange(false);
  };

  const effectiveIncluded = confirmed.filter((p) => included.has(p.id));

  const customTotal = Object.values(customAmounts).reduce(
    (sum, v) => sum + (Number(v) || 0),
    0
  );

  const save = async () => {
    const amountNum = Number(amount);
    if (!description.trim() || !Number.isFinite(amountNum) || amountNum <= 0)
      return;

    if (splitMode === "custom" && Math.abs(customTotal - amountNum) > 0.01) {
      toast.error(t("sharesMismatch"));
      return;
    }
    if (effectiveIncluded.length === 0) {
      toast.error(t("selectSomeone"));
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { data: created, error } = await supabase
      .from("expenses")
      .insert({
        event_id: event.id,
        paid_by: paidBy,
        created_by: currentUserId,
        amount: amountNum,
        currency: event.currency,
        description: description.trim(),
        item_id: itemId || null,
        split_mode: splitMode,
      })
      .select()
      .single();

    if (error || !created) {
      toast.error(tErrors("generic"));
      setLoading(false);
      return;
    }

    let shareRows: {
      expense_id: string;
      participant_id: string;
      share_amount: number;
    }[];

    if (splitMode === "equal") {
      const split = splitEqual(
        amountNum,
        effectiveIncluded.map((p) => p.id)
      );
      shareRows = [...split.entries()].map(([participantId, shareAmount]) => ({
        expense_id: created.id,
        participant_id: participantId,
        share_amount: shareAmount,
      }));
    } else {
      shareRows = effectiveIncluded
        .filter((p) => Number(customAmounts[p.id]) > 0)
        .map((p) => ({
          expense_id: created.id,
          participant_id: p.id,
          share_amount: Number(customAmounts[p.id]),
        }));
    }

    const { error: sharesError } = await supabase
      .from("expense_shares")
      .insert(shareRows);

    setLoading(false);
    if (sharesError) {
      // rollback básico para no dejar un gasto sin división
      await supabase.from("expenses").delete().eq("id", created.id);
      toast.error(tErrors("generic"));
      return;
    }

    toast.success(t("added"));
    resetAndClose();
    onCreated();
  };

  const toggleIncluded = (participantId: string) => {
    const next = new Set(included);
    if (next.has(participantId)) next.delete(participantId);
    else next.add(participantId);
    setIncluded(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
          <DialogDescription>{t("dialogSubtitle")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="exp-desc">{t("descriptionLabel")}</Label>
            <Input
              id="exp-desc"
              placeholder={t("descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="exp-amount">
                {t("amountLabel", { currency: event.currency })}
              </Label>
              <Input
                id="exp-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("paidByLabel")}</Label>
              <Select
                value={paidBy}
                onValueChange={(v) => setPaidBy(v as string)}
                disabled={!isOrganizer}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {confirmed.map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id}>
                      {nameOf(p.user_id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {data.items.length > 0 && (
            <div className="grid gap-2">
              <Label>{t("itemLabel")}</Label>
              <Select
                value={itemId || null}
                onValueChange={(v) => setItemId((v as string) ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("noItem")} />
                </SelectTrigger>
                <SelectContent>
                  {data.items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.item_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label>{t("splitLabel")}</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={splitMode === "equal" ? "default" : "outline"}
                size="sm"
                onClick={() => setSplitMode("equal")}
              >
                {t("equal")}
              </Button>
              <Button
                type="button"
                variant={splitMode === "custom" ? "default" : "outline"}
                size="sm"
                onClick={() => setSplitMode("custom")}
              >
                {t("custom")}
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>{t("amongLabel")}</Label>
            <ul className="grid gap-1.5">
              {confirmed.map((p) => {
                const isIncluded = included.has(p.id);
                return (
                  <li key={p.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`inc-${p.id}`}
                      checked={isIncluded}
                      onCheckedChange={() => toggleIncluded(p.id)}
                    />
                    <Label
                      htmlFor={`inc-${p.id}`}
                      className="flex-1 font-normal"
                    >
                      {nameOf(p.user_id)}
                    </Label>
                    {splitMode === "custom" && isIncluded && (
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-24"
                        placeholder="0"
                        value={customAmounts[p.id] ?? ""}
                        onChange={(e) =>
                          setCustomAmounts({
                            ...customAmounts,
                            [p.id]: e.target.value,
                          })
                        }
                      />
                    )}
                  </li>
                );
              })}
            </ul>
            {splitMode === "custom" && (
              <p
                className={`text-xs ${
                  Math.abs(customTotal - Number(amount || 0)) > 0.01
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {t("customTotal", {
                  total: formatCurrency(customTotal, event.currency),
                  amount: formatCurrency(Number(amount) || 0, event.currency),
                })}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={resetAndClose} disabled={loading}>
            {t("cancel")}
          </Button>
          <Button
            onClick={save}
            disabled={loading || !description.trim() || Number(amount) <= 0}
          >
            {loading ? t("saving") : t("saveExpense")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
