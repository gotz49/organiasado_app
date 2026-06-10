import * as XLSX from "xlsx-js-style";

// Estilos reutilizables para los .xlsx (paleta Classic Red).
type Style = Record<string, unknown>;

const BRAND = "A4161A"; // mahogany-red
const GREY = "8A8180";
const DARK = "0B090A";
const ZEBRA = "F5F3F4";

export const headerStyle: Style = {
  font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
  fill: { patternType: "solid", fgColor: { rgb: BRAND } },
  alignment: { horizontal: "left", vertical: "center" },
};

export const labelStyle: Style = {
  font: { bold: true, color: { rgb: DARK } },
  alignment: { vertical: "center" },
};

export const titleStyle: Style = {
  font: { bold: true, sz: 14, color: { rgb: BRAND } },
};

export const greyItalic: Style = {
  font: { italic: true, color: { rgb: GREY } },
};

export const greyText: Style = {
  font: { color: { rgb: GREY } },
};

export const zebraFill: Style = {
  fill: { patternType: "solid", fgColor: { rgb: ZEBRA } },
};

type Cells = Record<string, { s?: Style } | undefined>;

export function styleRow(
  ws: XLSX.WorkSheet,
  row: number,
  ncols: number,
  style: Style
) {
  const cells = ws as unknown as Cells;
  for (let c = 0; c < ncols; c++) {
    const ref = XLSX.utils.encode_cell({ r: row, c });
    if (cells[ref]) cells[ref]!.s = { ...(cells[ref]!.s ?? {}), ...style };
  }
}

export function styleColumn(
  ws: XLSX.WorkSheet,
  col: number,
  fromRow: number,
  toRow: number,
  style: Style
) {
  const cells = ws as unknown as Cells;
  for (let r = fromRow; r <= toRow; r++) {
    const ref = XLSX.utils.encode_cell({ r, c: col });
    if (cells[ref]) cells[ref]!.s = { ...(cells[ref]!.s ?? {}), ...style };
  }
}

export function setRowHeight(ws: XLSX.WorkSheet, row: number, hpt: number) {
  const sheet = ws as unknown as { "!rows"?: { hpt: number }[] };
  sheet["!rows"] = sheet["!rows"] ?? [];
  sheet["!rows"][row] = { hpt };
}
