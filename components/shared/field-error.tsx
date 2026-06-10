"use client";

import { useTranslations } from "next-intl";

/**
 * Muestra un error de validación. Los schemas Zod usan claves del
 * namespace "errors" como mensaje, acá se traducen.
 */
export function FieldError({ message }: { message?: string }) {
  const t = useTranslations("errors");
  if (!message) return null;
  return <p className="text-sm text-destructive">{t(message)}</p>;
}
