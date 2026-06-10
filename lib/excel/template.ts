import * as XLSX from "xlsx-js-style";
import { SHEET_ITEMS, SHEET_PARTICIPANTS } from "./import";
import { greyItalic, headerStyle, setRowHeight, styleRow, titleStyle } from "./style";
import type { ExcelT } from "./types";

// Plantilla oficial descargable para el import (spec 5.9).
// Los nombres de hoja y columnas deben coincidir con lib/excel/import.ts.
// Headers en rojo, filas de ejemplo en gris (para que se note que se reemplazan).

export function downloadImportTemplate(t: ExcelT) {
  const wb = XLSX.utils.book_new();

  // ---- Hoja de instrucciones ----
  const instructions: unknown[][] = [
    [t("template.instructionsTitle")],
    [],
    [t("template.instruction1")],
    [t("template.instruction2")],
    [t("template.instruction3")],
    [t("template.instruction4")],
    [t("template.instruction5")],
  ];
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions["!cols"] = [{ wch: 95 }];
  styleRow(wsInstructions, 0, 1, titleStyle);
  setRowHeight(wsInstructions, 0, 22);
  for (let r = 2; r <= 6; r++) styleRow(wsInstructions, r, 1, greyItalic);
  XLSX.utils.book_append_sheet(
    wb,
    wsInstructions,
    t("template.sheetInstructions")
  );

  // ---- Participantes ----
  const participants: unknown[][] = [
    ["Nombre", "Email", "Tipo de comensal", "Acompañantes"],
    ["Juan Pérez", "juan@ejemplo.com", "normal", 0],
    ["Ana García", "ana@ejemplo.com", "vegetariano", 2],
    ["Luis Rodríguez", "luis@ejemplo.com", "mucho", 0],
  ];
  const wsParticipants = XLSX.utils.aoa_to_sheet(participants);
  wsParticipants["!cols"] = [{ wch: 25 }, { wch: 30 }, { wch: 18 }, { wch: 14 }];
  styleRow(wsParticipants, 0, 4, headerStyle);
  setRowHeight(wsParticipants, 0, 18);
  for (let r = 1; r <= 3; r++) styleRow(wsParticipants, r, 4, greyItalic); // ejemplos
  XLSX.utils.book_append_sheet(wb, wsParticipants, SHEET_PARTICIPANTS);

  // ---- Ítems ----
  const items: unknown[][] = [
    ["Nombre", "Unidad", "Cantidad", "Categoria"],
    ["Asado de tira", "g", 4000, "comida"],
    ["Cerveza", "ml", 10000, "bebida"],
    ["Carbón", "kg", 5, "insumo"],
  ];
  const wsItems = XLSX.utils.aoa_to_sheet(items);
  wsItems["!cols"] = [{ wch: 25 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
  styleRow(wsItems, 0, 4, headerStyle);
  setRowHeight(wsItems, 0, 18);
  for (let r = 1; r <= 3; r++) styleRow(wsItems, r, 4, greyItalic); // ejemplos
  XLSX.utils.book_append_sheet(wb, wsItems, SHEET_ITEMS);

  XLSX.writeFile(wb, "plantilla-importacion.xlsx");
}
