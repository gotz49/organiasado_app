# Deploy — modelo GitHub

GitHub es la fuente de la verdad. Al hacer push a `main`:

- **Vercel** deploya el frontend.
- **GitHub Actions** (`.github/workflows/supabase-migrations.yml`) aplica las migraciones a Supabase con `supabase db push` — sin Docker.

```
git push ──▶ GitHub ──┬──▶ Vercel (frontend)
                      └──▶ GitHub Actions ──▶ supabase db push (migraciones)
```

## 1. Crear el proyecto Supabase (una vez)

1. Entrá a [supabase.com](https://supabase.com) → **New project**.
2. Elegí una región cercana (ej. São Paulo para LATAM) y guardá la **Database password**.
3. Cuando termine de provisionar, anotá de **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
   - El **Reference ID** (en la URL del dashboard o en Settings → General) → `PROJECT_REF`

## 2. Secrets del repo en GitHub (para el workflow de migraciones)

En GitHub: **Settings → Secrets and variables → Actions → New repository secret**. Cargá:

| Secret | De dónde sale |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) → Generate new token |
| `SUPABASE_DB_PASSWORD` | La Database password del paso 1 |
| `SUPABASE_PROJECT_REF` | El Reference ID del proyecto |

Con eso, el primer push a `main` (o correr el workflow a mano desde la pestaña **Actions**)
aplica las 4 migraciones, incluyendo los tipos de evento globales y sus presets.

> Alternativa manual (sin esperar al workflow): desde tu máquina, una sola vez:
> ```bash
> npx supabase login
> npx supabase link --project-ref <PROJECT_REF>
> npx supabase db push
> ```

## 3. Deploy del frontend en Vercel

1. Entrá a [vercel.com](https://vercel.com) → **Add New → Project** → importá el repo de GitHub.
2. Framework: **Next.js** (autodetectado). No cambies build settings.
3. En **Environment Variables** cargá:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` → tu dominio de Vercel (ej. `https://juntada.vercel.app`)
4. **Deploy**. Cada push a `main` redeploya; cada PR genera un preview.

## 4. Configurar Auth en Supabase (una vez, post-deploy)

En **Authentication → URL Configuration** del dashboard de Supabase:

- **Site URL**: tu dominio de Vercel (`https://juntada.vercel.app`).
- **Redirect URLs**: agregá `https://juntada.vercel.app/auth/callback`
  (y `http://localhost:3000/auth/callback` para desarrollo).

Opcional: en **Authentication → Emails**, traducí al español las plantillas de
verificación y de recuperación de contraseña.

## Flujo de trabajo diario

```bash
git checkout -b mi-cambio
# ...editás código y/o agregás migraciones en supabase/migrations...
git commit -am "mi cambio"
git push -u origin mi-cambio
# Abrís PR → Vercel te da un preview. Al mergear a main:
#   - Vercel deploya a producción
#   - GitHub Actions aplica las migraciones nuevas
```

> **Importante sobre migraciones**: nunca edites una migración ya aplicada en
> producción. Para cambiar el esquema, creá una migración nueva
> (`npx supabase migration new <nombre>`).
