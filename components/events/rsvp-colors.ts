// Colores semánticos del RSVP: Voy=verde, Tal vez=amarillo, No voy=rojo.
// `active` = estado seleccionado (relleno) vs. no seleccionado (contorno).

export function rsvpColor(
  kind: "yes" | "maybe" | "no",
  active: boolean
): string {
  if (kind === "yes")
    return active
      ? "border-transparent bg-green-600 text-white hover:bg-green-600/90"
      : "border-green-600 text-green-700 hover:bg-green-600/10 dark:text-green-400";
  if (kind === "maybe")
    return active
      ? "border-transparent bg-amber-400 text-amber-950 hover:bg-amber-400/90"
      : "border-amber-500 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400";
  return active
    ? "border-transparent bg-red-600 text-white hover:bg-red-600/90"
    : "border-red-600 text-red-700 hover:bg-red-600/10 dark:text-red-400";
}
