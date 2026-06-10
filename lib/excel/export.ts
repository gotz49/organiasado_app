import * as XLSX from "xlsx-js-style";
import { formatTime } from "@/lib/format";
import {
  headerStyle,
  labelStyle,
  setRowHeight,
  styleColumn,
  styleRow,
} from "./style";
import type { EventExportData, ExcelT } from "./types";

// Export de evento completo a .xlsx con SheetJS, en el cliente (spec 5.8).
// Hojas: Resumen, Participantes, Ítems, Gastos, Saldos.

function autoWidth(ws: XLSX.WorkSheet, rows: unknown[][]) {
  const widths: number[] = [];
  for (const row of rows) {
    row.forEach((cell, i) => {
      const len = String(cell ?? "").length;
      widths[i] = Math.max(widths[i] ?? 10, Math.min(len + 2, 50));
    });
  }
  ws["!cols"] = widths.map((wch) => ({ wch }));
}

export function buildEventWorkbook(
  data: EventExportData,
  t: ExcelT
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const { event } = data;

  // ---- Resumen ----
  const summaryRows: unknown[][] = [
    [t("field.title"), event.title],
    [t("field.type"), data.eventTypeName ?? "-"],
    [t("field.date"), event.event_date],
    [t("field.time"), formatTime(event.event_time) ?? "-"],
    [t("field.location"), event.location_text ?? "-"],
    [t("field.host"), data.hostName],
    [t("field.currency"), event.currency],
    [t("field.status"), t(`status.${event.status}`)],
    [t("field.description"), event.description ?? "-"],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  autoWidth(wsSummary, summaryRows);
  styleColumn(wsSummary, 0, 0, summaryRows.length - 1, labelStyle);
  XLSX.utils.book_append_sheet(wb, wsSummary, t("sheet.summary"));

  // ---- Participantes ----
  const participantRows: unknown[][] = [
    [
      t("col.name"),
      t("col.rsvp"),
      t("col.eaterType"),
      t("col.guests"),
      t("col.notes"),
    ],
    ...data.participants.map((p) => [
      p.profile.display_name,
      t(`rsvp.${p.rsvp_status}`),
      t(`eater.${p.eater_type}`),
      p.guest_count,
      p.notes ?? "",
    ]),
  ];
  const wsParticipants = XLSX.utils.aoa_to_sheet(participantRows);
  autoWidth(wsParticipants, participantRows);
  styleRow(wsParticipants, 0, participantRows[0].length, headerStyle);
  setRowHeight(wsParticipants, 0, 18);
  XLSX.utils.book_append_sheet(wb, wsParticipants, t("sheet.participants"));

  // ---- Ítems ----
  const itemRows: unknown[][] = [
    [
      t("col.item"),
      t("col.category"),
      t("col.unit"),
      t("col.quantityNeeded"),
      t("col.assigned"),
      t("col.assignedTo"),
    ],
    ...data.items.map((item) => {
      const assignedTotal = item.assignments.reduce(
        (sum, a) => sum + a.quantity,
        0
      );
      const assignedTo = item.assignments
        .map((a) => `${a.userName} (${a.quantity} ${item.unit})`)
        .join(", ");
      return [
        item.item_name,
        item.category,
        item.unit,
        item.quantity_needed,
        assignedTotal,
        assignedTo,
      ];
    }),
  ];
  const wsItems = XLSX.utils.aoa_to_sheet(itemRows);
  autoWidth(wsItems, itemRows);
  styleRow(wsItems, 0, itemRows[0].length, headerStyle);
  setRowHeight(wsItems, 0, 18);
  XLSX.utils.book_append_sheet(wb, wsItems, t("sheet.items"));

  // ---- Gastos ----
  const expenseRows: unknown[][] = [
    [
      t("col.description"),
      t("col.paidBy"),
      t("col.amount"),
      t("col.splitMode"),
      t("col.splitDetail"),
    ],
    ...data.expenses.map((x) => [
      x.description,
      x.paidByName,
      x.amount,
      t(`split.${x.split_mode}`),
      x.shares.map((s) => `${s.userName}: ${s.share_amount}`).join(", "),
    ]),
  ];
  const wsExpenses = XLSX.utils.aoa_to_sheet(expenseRows);
  autoWidth(wsExpenses, expenseRows);
  styleRow(wsExpenses, 0, expenseRows[0].length, headerStyle);
  setRowHeight(wsExpenses, 0, 18);
  XLSX.utils.book_append_sheet(wb, wsExpenses, t("sheet.expenses"));

  // ---- Saldos ----
  const balanceRows: unknown[][] = [
    [t("col.participant"), t("col.balance")],
    ...[...data.balances.entries()].map(([userId, balance]) => [
      data.userNames.get(userId) ?? userId,
      balance,
    ]),
    [],
    [t("suggestedTransfers")],
    [t("col.from"), t("col.to"), t("col.amount")],
    ...data.transfers.map((tr) => [
      data.userNames.get(tr.fromUserId) ?? tr.fromUserId,
      data.userNames.get(tr.toUserId) ?? tr.toUserId,
      tr.amount,
    ]),
    [],
    [t("settlementsDone")],
    [t("col.from"), t("col.to"), t("col.amount"), t("col.notes")],
    ...data.settlements.map((s) => [
      s.fromName,
      s.toName,
      s.amount,
      s.note ?? "",
    ]),
  ];
  const wsBalances = XLSX.utils.aoa_to_sheet(balanceRows);
  autoWidth(wsBalances, balanceRows);
  // Header de saldos + sub-headers de las secciones de transferencias y pagos
  const B = data.balances.size;
  const T = data.transfers.length;
  styleRow(wsBalances, 0, 2, headerStyle);
  styleColumn(wsBalances, 0, B + 2, B + 2, labelStyle); // "Transferencias sugeridas"
  styleRow(wsBalances, B + 3, 3, headerStyle);
  styleColumn(wsBalances, 0, B + 5 + T, B + 5 + T, labelStyle); // "Pagos realizados"
  styleRow(wsBalances, B + 6 + T, 4, headerStyle);
  XLSX.utils.book_append_sheet(wb, wsBalances, t("sheet.balances"));

  return wb;
}

export function downloadEventExcel(data: EventExportData, t: ExcelT) {
  const wb = buildEventWorkbook(data, t);
  const safeTitle = data.event.title
    .replace(/[^\p{L}\p{N} _-]/gu, "")
    .slice(0, 50)
    .trim();
  XLSX.writeFile(wb, `${safeTitle || "evento"}.xlsx`);
}
