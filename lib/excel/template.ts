import * as XLSX from "xlsx";
import { SHEET_ITEMS, SHEET_PARTICIPANTS } from "./import";
import type { ExcelT } from "./types";

// Plantilla oficial descargable para el import (spec 5.9).
// Los nombres de hoja y columnas deben coincidir con lib/excel/import.ts.

export function downloadImportTemplate(t: ExcelT) {
  const wb = XLSX.utils.book_new();

  const instructions: unknown[][] = [
    [t("template.instructionsTitle")],
    [],
    [t("template.instruction1")],
    [t("template.instruction2")],
    [t("template.instruction3")],
    [t("template.instruction4")],
  ];
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions["!cols"] = [{ wch: 90 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, t("template.sheetInstructions"));

  const participants: unknown[][] = [
    ["Nombre", "Email", "Tipo de comensal", "Acompañantes"],
    ["Juan Pérez", "juan@ejemplo.com", "normal", 0],
    ["Ana García", "ana@ejemplo.com", "vegetariano", 2],
    ["Luis Rodríguez", "luis@ejemplo.com", "mucho", 0],
  ];
  const wsParticipants = XLSX.utils.aoa_to_sheet(participants);
  wsParticipants["!cols"] = [{ wch: 25 }, { wch: 30 }, { wch: 18 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsParticipants, SHEET_PARTICIPANTS);

  const items: unknown[][] = [
    ["Nombre", "Unidad", "Cantidad", "Categoria"],
    ["Asado de tira", "g", 4000, "comida"],
    ["Cerveza", "ml", 10000, "bebida"],
    ["Carbón", "kg", 5, "insumo"],
  ];
  const wsItems = XLSX.utils.aoa_to_sheet(items);
  wsItems["!cols"] = [{ wch: 25 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsItems, SHEET_ITEMS);

  XLSX.writeFile(wb, "plantilla-importacion.xlsx");
}
