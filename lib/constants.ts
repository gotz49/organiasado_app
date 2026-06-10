// Monedas soportadas por evento (ISO 4217). Ampliable sin tocar el esquema.
export const CURRENCIES = [
  "UYU",
  "ARS",
  "USD",
  "BRL",
  "CLP",
  "EUR",
  "PYG",
  "PEN",
  "COP",
  "MXN",
] as const;

export type Currency = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = "UYU";

export const ITEM_CATEGORIES = ["comida", "bebida", "insumo"] as const;

export const ITEM_UNITS = ["g", "kg", "ml", "l", "unidad"] as const;

export const EATER_TYPES = ["low", "normal", "high"] as const;

export const PARTICIPANT_EATER_TYPES = [
  "low",
  "normal",
  "high",
  "vegetarian",
  "child",
] as const;
