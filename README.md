# Juntada — App de organización de eventos gastronómicos

PWA para organizar asados, hamburgueseadas y juntadas entre amigos: cuántos van,
cuánto comprar, quién trae qué y quién le debe a quién. MVP v1 según `../spec-mvp-v1.md`.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 + shadcn/ui (base-ui) · Supabase
(PostgreSQL + Auth + RLS + Realtime) · next-intl · Zod · React Hook Form · TanStack
Query · SheetJS.

## Puesta en marcha local

1. **Instalar dependencias**
   ```bash
   npm install
   ```

2. **Levantar Supabase local** (requiere Docker Desktop corriendo)
   ```bash
   npx supabase start
   ```
   Anotá la `API URL`, la `anon key` y la `service_role key` que imprime.

3. **Variables de entorno** — copiá `.env.example` a `.env.local` y completá:
   ```
   NEXT_PUBLIC_SUPABASE_URL=<project url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key (sb_publishable_...)>
   ```

4. **Aplicar migraciones**
   ```bash
   npx supabase db reset
   ```
   Esto corre `supabase/migrations/*`: esquema, RLS, RPCs y los tipos de evento
   globales (Asado, Hamburgueseada, Pizza + presets rioplatenses, en la migración
   `...004_seed_global_event_types.sql`).

5. **Verificación de email en desarrollo**
   Por defecto Supabase local no envía emails reales (revisá Inbucket en
   `http://127.0.0.1:54324`). Para saltar la verificación, en `supabase/config.toml`
   poné `[auth.email] enable_confirmations = false` y volvé a `db reset`. El registro
   detecta si hay sesión inmediata y entra directo al onboarding.

6. **Correr la app**
   ```bash
   npm run dev
   ```

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `node scripts/gen-icons.mjs` | Regenera los íconos PWA (placeholder) |

## Estructura

- `app/` — rutas (grupos `(auth)`, `(public)`, `(dashboard)`), callback de auth, legales, manifest.
- `components/ui/` — shadcn/ui. `components/events/` — vista de evento y tabs. `components/shared/` — providers, menú, formularios comunes.
- `lib/supabase/` — clientes browser/server + `proxy.ts` (protección de rutas, ex middleware).
- `lib/calculator/` — cálculo de cantidades (espejo del trigger SQL). `lib/debts/` — saldos y simplificación tipo Splitwise. `lib/excel/` — import/export/plantilla. `lib/validators/` — schemas Zod.
- `supabase/migrations/` — esquema, RLS, RPCs y seed de tipos globales.
- `.github/workflows/` — CI que aplica migraciones (ver `DEPLOY.md`).
- `messages/es.json` — todas las strings (i18n listo para sumar idiomas).
- `types/database.ts` — tipos de la DB (mantener en sync; regenerables con `supabase gen types`).

## Notas de arquitectura

- **Recálculo de cantidades**: lo hace un trigger en Postgres (`recalc_event_quantities`)
  cuando cambian los confirmados. Los ítems con `auto_calculated=false` quedan congelados.
- **RSVP**: los usuarios se suman a un evento solo vía `rsvp_via_token` (SECURITY DEFINER),
  validando el `share_token`. Inserción directa en `event_participants` solo para organizadores.
- **Realtime**: la vista de evento se suscribe a cambios y revalida con TanStack Query.
- **PWA**: `app/manifest.ts` + `public/sw.js` (network-first para navegación, SWR para estáticos).

## Pendiente antes de producción

- Branding/íconos definitivos (los actuales son placeholders generados).
- Proyecto Supabase de staging/producción + configurar redirect URLs de auth.
- Revisar plantillas de email de Supabase (verificación y recovery) en español.
