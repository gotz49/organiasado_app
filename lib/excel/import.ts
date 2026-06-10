import * as XLSX from "xlsx-js-style";
import { z } from "zod";
import type { ParticipantEaterType } from "@/types/database";
import type { ImportResult } from "./types";

// Import de evento desde .xlsx (spec 5.9). Hojas esperadas (ver plantilla):
//  - "Participantes": Nombre | Email | Tipo de comensal | Acompañantes
//  - "Items" (opcional): Nombre | Unidad | Cantidad | Categoria
// La validación se hace fila por fila con Zod; los errores se reportan
// sin abortar el resto del import.

export const SHEET_PARTICIPANTS = "Participantes";
export const SHEET_ITEMS = "Items";

const EATER_ALIASES: Record<string, ParticipantEaterType> = {
  poco: "low",
  low: "low",
  bajo: "low",
  normal: "normal",
  mucho: "high",
  high: "high",
  alto: "high",
  vegetariano: "vegetarian",
  vegetariana: "vegetarian",
  vegetarian: "vegetarian",
  "niño": "child",
  "niña": "child",
  nino: "child",
  child: "child",
};

const eaterTypeFromText = (raw: unknown): ParticipantEaterType | null => {
  const key = String(raw ?? "normal").trim().toLowerCase();
  if (key === "") return "normal";
  return EATER_ALIASES[key] ?? null;
};

const participantRowSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().pipe(z.email()),
  eaterType: z.enum(["low", "normal", "high", "vegetarian", "child"]),
  guestCount: z.coerce.number().int().min(0).max(20).default(0),
});

const itemRowSchema = z.object({
  name: z.string().trim().min(1),
  unit: z.string().trim().min(1),
  quantity: z.coerce.number().min(0).default(0),
  category: z.string().trim().min(1).default("comida"),
});

function sheetRows(wb: XLSX.WorkBook, name: string): unknown[][] | null {
  const sheetName = wb.SheetNames.find(
    (n) => n.trim().toLowerCase() === name.toLowerCase()
  );
  if (!sheetName) return null;
  return XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
    header: 1,
    defval: "",
  });
}

const isEmptyRow = (row: unknown[]) =>
  row.every((cell) => String(cell ?? "").trim() === "");

export function parseEventImport(buffer: ArrayBuffer): ImportResult {
  const result: ImportResult = { participants: [], items: [], errors: [] };

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "array" });
  } catch {
    result.errors.push({ sheet: "-", row: 0, message: "invalidFile" });
    return result;
  }

  // ---- Participantes ----
  const participantRows = sheetRows(wb, SHEET_PARTICIPANTS);
  if (participantRows) {
    participantRows.slice(1).forEach((row, idx) => {
      if (isEmptyRow(row)) return;
      const rowNumber = idx + 2; // 1-indexado + encabezado
      const eaterType = eaterTypeFromText(row[2]);
      if (!eaterType) {
        result.errors.push({
          sheet: SHEET_PARTICIPANTS,
          row: rowNumber,
          message: "invalidEaterType",
        });
        return;
      }
      const parsed = participantRowSchema.safeParse({
        name: String(row[0] ?? ""),
        email: String(row[1] ?? ""),
        eaterType,
        guestCount: row[3] === "" ? 0 : row[3],
      });
      if (!parsed.success) {
        result.errors.push({
          sheet: SHEET_PARTICIPANTS,
          row: rowNumber,
          message: "invalidRow",
        });
        return;
      }
      result.participants.push(parsed.data);
    });
  }

  // ---- Ítems ----
  const itemRows = sheetRows(wb, SHEET_ITEMS);
  if (itemRows) {
    itemRows.slice(1).forEach((row, idx) => {
      if (isEmptyRow(row)) return;
      const rowNumber = idx + 2;
      const parsed = itemRowSchema.safeParse({
        name: String(row[0] ?? ""),
        unit: String(row[1] ?? ""),
        quantity: row[2] === "" ? 0 : row[2],
        category: String(row[3] ?? "") || "comida",
      });
      if (!parsed.success) {
        result.errors.push({
          sheet: SHEET_ITEMS,
          row: rowNumber,
          message: "invalidRow",
        });
        return;
      }
      result.items.push(parsed.data);
    });
  }

  if (!participantRows && !itemRows) {
    result.errors.push({ sheet: "-", row: 0, message: "missingSheets" });
  }

  return result;
}
