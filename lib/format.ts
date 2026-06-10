// Formateo de fechas, números y monedas (spec sección 9).
// Centralizado para que el locale sea parametrizable cuando haya más idiomas.

const DEFAULT_LOCALE = "es-UY";

export function formatCurrency(
  amount: number,
  currency: string,
  locale: string = DEFAULT_LOCALE
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(
  value: number,
  locale: string = DEFAULT_LOCALE
): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(
  date: string | Date,
  locale: string = DEFAULT_LOCALE
): string {
  const d = typeof date === "string" ? new Date(`${date}T00:00:00`) : date;
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function formatShortDate(
  date: string | Date,
  locale: string = DEFAULT_LOCALE
): string {
  const d = typeof date === "string" ? new Date(`${date}T00:00:00`) : date;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** Formatea un time de Postgres ("20:30:00") como "20:30". */
export function formatTime(time: string | null): string | null {
  if (!time) return null;
  const [h, m] = time.split(":");
  return `${h}:${m}`;
}

export function isPastEvent(eventDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${eventDate}T00:00:00`) < today;
}
