# Organiasado 🍖

App web (PWA) para organizar **eventos gastronómicos entre amigos** — asados,
hamburgueseadas, pizza nights — y resolver lo de siempre: **cuántos somos, cuánto
comprar, quién trae qué, cuánto sale y quién le debe a quién.**

🔴 **En producción:** [organiasado-app.vercel.app](https://organiasado-app.vercel.app)
· Repo: [github.com/gotz49/organiasado_app](https://github.com/gotz49/organiasado_app)

---

## La idea

Creás un evento (ej. un asado), compartís un **link por WhatsApp**, y la gente
confirma asistencia. La app **calcula sola cuánto comprar** según cuántos
confirman y cuánto come cada uno, lleva la **lista de quién trae qué**, registra
los **gastos** y te dice **quién le debe a quién** con las transferencias mínimas
para quedar a mano. El organizador tiene una **lista de compras chequeable** y
puede **exportar todo a Excel**.

## Cómo funciona (flujo típico)

1. **Registro/login** (email + contraseña) o **entrar como invitado** (solo nombre,
   sin crear cuenta — sesión anónima de Supabase).
2. **Crear evento**: elegís tipo (Asado/Hamburgueseada/Pizza o uno propio), fecha,
   lugar, moneda. La app instancia los **ítems del preset** (carne, pan, bebida…).
3. **Compartir link** `/e/{token}` → los invitados ven el evento y confirman
   (Voy 🟢 / Tal vez 🟡 / No voy 🔴), indican cuánto comen y acompañantes.
4. **Cálculo automático**: cada vez que cambian los confirmados, se recalculan las
   cantidades necesarias de cada ítem.
5. **Asignación**: cada uno se anota para llevar ítems (con indicador de cobertura).
6. **Compras** (organizador): lista resumida con cantidad total + checklist de
   "comprado".
7. **Gastos**: se registra quién pagó qué (división equitativa o custom). La app
   calcula **saldos**, un **resumen por persona** (puso / le tocó / neto) y las
   **transferencias** para saldar. Se marcan los pagos (settlements).
8. **Excel**: exportás el evento completo (varias hojas con formato) o importás
   participantes/ítems desde una plantilla.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 + shadcn/ui (sobre **Base UI**,
no Radix) · Supabase (PostgreSQL + Auth + RLS + Realtime) · next-intl (es) ·
Zod · React Hook Form · TanStack Query · next-themes (dark mode) ·
xlsx-js-style (Excel con estilos).

## Funcionalidades

- ✅ Auth email+contraseña + reset · **acceso como invitado** (anónimo) con opción
  de **vincular cuenta** después (sin perder datos).
- ✅ Eventos: crear/editar/cancelar/archivar · **co-organizadores** (desde la lista
  de participantes; solo usuarios registrados).
- ✅ RSVP con conteo en vivo (Realtime) · acompañantes · tipos de comensal con
  referencias de comida.
- ✅ Calculadora de cantidades (trigger en Postgres) · tipos de evento y presets
  personalizables.
- ✅ Asignación de ítems con cobertura · **lista de compras chequeable** (org/co-org).
- ✅ Gastos (equitativo/custom) · saldos · **resumen por persona** (org/co-org) ·
  simplificación de deudas tipo Splitwise · settlements.
- ✅ Quitar participante: borra sus gastos/saldos, conserva los pagos hechos.
- ✅ Import/export Excel con formato + plantilla con instrucciones.
- ✅ PWA instalable · **dark mode** · paleta Classic Red · i18n (español).

## Despliegue (modelo GitHub) — ver `DEPLOY.md`

GitHub es la fuente de la verdad. Al hacer push a `main`:
- **Supabase** aplica las migraciones de `supabase/migrations/` automáticamente
  (integración nativa GitHub → *Deploy to production*, branch `main`).
- **Vercel** deploya el frontend.

Sin Docker. Solo 2 variables de entorno (`NEXT_PUBLIC_SUPABASE_URL` y
`NEXT_PUBLIC_SUPABASE_ANON_KEY` = la *publishable key*).

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # completar con URL + publishable key del proyecto Supabase
npm run dev
```

Las migraciones ya están aplicadas en el Supabase cloud. Para una base local con
Docker: `npx supabase start && npx supabase db reset`.

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `node scripts/gen-icons.mjs` | Regenera los íconos (logo beef, paleta actual) |

## Estructura

- `app/` — rutas: `(auth)` login/registro/reset, `(public)/e/[token]` vista pública,
  `(dashboard)/app/*` dashboard + evento, `auth/callback`, legales, `manifest.ts`.
- `components/events/` — vista de evento y sus tabs (participantes, ítems, compras,
  gastos, saldos), RSVP, guest-access. `components/shared/` — providers, menú,
  perfil, theme-toggle, guest-banner. `components/ui/` — shadcn/Base UI.
- `lib/supabase/` — clientes browser/server + `proxy.ts` (protección de rutas, ex
  middleware → ahora `proxy.ts` en Next 16).
- `lib/calculator/` (cantidades, espejo del trigger) · `lib/debts/` (saldos +
  Splitwise) · `lib/excel/` (export/import/plantilla/estilos) · `lib/validators/` (Zod).
- `supabase/migrations/` — esquema, RLS, RPCs, seeds, y migraciones incrementales.
- `messages/es.json` — todas las strings. `types/database.ts` — tipos de la DB (a mano).

## Notas de arquitectura

- **Cálculo de cantidades**: trigger `recalc_event_quantities` en Postgres; ítems con
  `auto_calculated=false` quedan congelados (editados a mano).
- **RSVP / invitados**: alta vía `rsvp_via_token` (SECURITY DEFINER) validando el
  `share_token`. Invitados = auth anónima (`is_anonymous` en `profiles`).
- **RLS**: `events_select` chequea `host_id = auth.uid()` **inline** (no vía función)
  para que `.insert().select()` funcione dentro de la misma sentencia.
- **Realtime**: la vista de evento se suscribe a cambios y revalida con TanStack Query.

## Pendiente / ideas futuras

- ¿Participantes comunes pueden pedir ítems? (hoy solo organizadores).
- Soporte de **varios pagadores** en un mismo gasto.
- Notificaciones (email), login social, multi-idioma.
- Branding/íconos definitivos.
