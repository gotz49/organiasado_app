"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowRight, FileSpreadsheet, HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { computeBalances, simplifyDebts, type Transfer } from "@/lib/debts";
import { downloadEventExcel } from "@/lib/excel/export";
import { formatCurrency } from "@/lib/format";
import type { EventRow } from "@/types/database";
import { eventDataKey, type EventData } from "./use-event-data";

export function BalancesTab({
  event,
  eventTypeName,
  hostName,
  data,
  currentUserId,
  isOrganizer,
}: {
  event: EventRow;
  eventTypeName: string | null;
  hostName: string;
  data: EventData;
  currentUserId: string;
  isOrganizer: boolean;
}) {
  const t = useTranslations("balances");
  const tExcel = useTranslations("excel");
  const queryClient = useQueryClient();
  const [settleTransfer, setSettleTransfer] = useState<Transfer | null>(null);

  const balances = computeBalances(
    data.participants,
    data.expenses,
    data.shares,
    data.settlements
  );
  const transfers = simplifyDebts(balances);

  // Resumen por persona: cuánto puso (pagó) y cuánto le tocó (su parte).
  const puso = new Map<string, number>();
  for (const x of data.expenses) {
    puso.set(x.paid_by, (puso.get(x.paid_by) ?? 0) + x.amount);
  }
  const leToco = new Map<string, number>();
  for (const s of data.shares) {
    const p = data.participants.find((pp) => pp.id === s.participant_id);
    if (p) leToco.set(p.user_id, (leToco.get(p.user_id) ?? 0) + s.share_amount);
  }
  const summaryUserIds = [
    ...new Set([
      ...data.participants.map((p) => p.user_id),
      ...puso.keys(),
      ...leToco.keys(),
    ]),
  ].filter(
    (uid) =>
      (puso.get(uid) ?? 0) > 0 ||
      (leToco.get(uid) ?? 0) > 0 ||
      Math.abs(balances.get(uid) ?? 0) > 0.01
  );

  const nameOf = (userId: string) =>
    data.profiles.get(userId)?.display_name ?? "?";

  const exportExcel = () => {
    const userNames = new Map<string, string>();
    for (const [id, profile] of data.profiles) {
      userNames.set(id, profile.display_name);
    }
    downloadEventExcel(
      {
        event,
        eventTypeName,
        hostName,
        participants: data.participants
          .map((p) => {
            const profile = data.profiles.get(p.user_id);
            return profile ? { ...p, profile } : null;
          })
          .filter((p): p is NonNullable<typeof p> => p !== null),
        items: data.items.map((item) => ({
          ...item,
          assignments: data.assignments
            .filter((a) => a.item_id === item.id)
            .map((a) => {
              const participant = data.participants.find(
                (p) => p.id === a.participant_id
              );
              return {
                ...a,
                userName: participant ? nameOf(participant.user_id) : "?",
              };
            }),
        })),
        expenses: data.expenses.map((x) => ({
          ...x,
          paidByName: nameOf(x.paid_by),
          shares: data.shares
            .filter((s) => s.expense_id === x.id)
            .map((s) => {
              const participant = data.participants.find(
                (p) => p.id === s.participant_id
              );
              return {
                ...s,
                userName: participant ? nameOf(participant.user_id) : "?",
              };
            }),
        })),
        balances,
        transfers,
        settlements: data.settlements.map((s) => ({
          ...s,
          fromName: nameOf(s.from_user_id),
          toName: nameOf(s.to_user_id),
        })),
        userNames,
      },
      tExcel
    );
  };

  const sortedBalances = [...balances.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="grid gap-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={exportExcel}>
          <FileSpreadsheet />
          {t("exportExcel")}
        </Button>
      </div>

      {/* Resumen por persona — solo organizador/co-organizador */}
      {isOrganizer && summaryUserIds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("perPersonTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colPerson")}</TableHead>
                  <TableHead className="text-right">{t("colPaid")}</TableHead>
                  <TableHead className="text-right">{t("colOwed")}</TableHead>
                  <TableHead className="text-right">{t("colNet")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryUserIds.map((uid) => {
                  const net = balances.get(uid) ?? 0;
                  return (
                    <TableRow key={uid}>
                      <TableCell>{nameOf(uid)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(puso.get(uid) ?? 0, event.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(leToco.get(uid) ?? 0, event.currency)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          net > 0.01
                            ? "text-green-600"
                            : net < -0.01
                              ? "text-destructive"
                              : "text-muted-foreground"
                        }`}
                      >
                        {formatCurrency(net, event.currency)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("perPersonHint")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Balances netos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("netBalances")}</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedBalances.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noExpenses")}</p>
          ) : (
            <ul className="grid gap-2">
              {sortedBalances.map(([userId, balance]) => (
                <li
                  key={userId}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    {nameOf(userId)}
                    {userId === currentUserId && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        {t("you")}
                      </span>
                    )}
                  </span>
                  <span
                    className={
                      balance > 0.01
                        ? "font-medium text-green-600"
                        : balance < -0.01
                          ? "font-medium text-destructive"
                          : "text-muted-foreground"
                    }
                  >
                    {formatCurrency(balance, event.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Transferencias sugeridas */}
      {transfers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("whoOwesWho")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2">
              {transfers.map((transfer, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-1.5">
                    {nameOf(transfer.fromUserId)}
                    <ArrowRight className="size-3.5 text-muted-foreground" />
                    {nameOf(transfer.toUserId)}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-medium">
                      {formatCurrency(transfer.amount, event.currency)}
                    </span>
                    {(transfer.fromUserId === currentUserId ||
                      transfer.toUserId === currentUserId) && (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setSettleTransfer(transfer)}
                      >
                        <HandCoins />
                        {transfer.fromUserId === currentUserId
                          ? t("markIPaid")
                          : t("markIGotPaid")}
                      </Button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Pagos registrados */}
      {data.settlements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("settlementsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-1.5 text-sm">
              {data.settlements.map((s) => (
                <li key={s.id} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    {nameOf(s.from_user_id)}
                    <ArrowRight className="size-3.5" />
                    {nameOf(s.to_user_id)}
                    {s.note && <span className="text-xs">({s.note})</span>}
                  </span>
                  <span>{formatCurrency(s.amount, s.currency)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Separator />
      <RegisterSettlement
        event={event}
        data={data}
        prefill={settleTransfer}
        onClose={() => setSettleTransfer(null)}
        onSaved={() =>
          queryClient.invalidateQueries({ queryKey: eventDataKey(event.id) })
        }
      />
    </div>
  );
}

function RegisterSettlement({
  event,
  data,
  prefill,
  onClose,
  onSaved,
}: {
  event: EventRow;
  data: EventData;
  prefill: Transfer | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("balances");
  const tErrors = useTranslations("errors");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const open = prefill !== null;

  const save = async () => {
    if (!prefill) return;
    const amountNum = Number(amount || prefill.amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("settlements").insert({
      event_id: event.id,
      from_user_id: prefill.fromUserId,
      to_user_id: prefill.toUserId,
      amount: amountNum,
      currency: event.currency,
      note: note.trim() || null,
    });
    setLoading(false);
    if (error) {
      toast.error(tErrors("generic"));
      return;
    }
    toast.success(t("settlementSaved"));
    setAmount("");
    setNote("");
    onClose();
    onSaved();
  };

  const nameOf = (userId: string) =>
    data.profiles.get(userId)?.display_name ?? "?";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {prefill &&
              t("settleTitle", {
                from: nameOf(prefill.fromUserId),
                to: nameOf(prefill.toUserId),
              })}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="settle-amount">
              {t("amountLabel", { currency: event.currency })}
            </Label>
            <Input
              id="settle-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder={prefill ? String(prefill.amount) : ""}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="settle-note">{t("noteLabel")}</Label>
            <Input
              id="settle-note"
              placeholder={t("notePlaceholder")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {t("cancel")}
          </Button>
          <Button onClick={save} disabled={loading}>
            {loading ? t("saving") : t("confirmSettle")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
