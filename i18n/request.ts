import { getRequestConfig } from "next-intl/server";

// v1: único idioma activo. La estructura permite sumar idiomas
// agregando archivos en /messages y resolviendo el locale del usuario.
export const SUPPORTED_LOCALES = ["es"] as const;
export const DEFAULT_LOCALE = "es";

export default getRequestConfig(async () => {
  const locale = DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
