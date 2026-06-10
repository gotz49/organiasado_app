# Deploy — modelo GitHub

GitHub es la fuente de la verdad. Al hacer push a `main`:

- **Supabase** aplica las migraciones de `supabase/migrations` automáticamente
  (integración nativa: *Integrations → GitHub → Deploy to production*, con
  production branch = `main`). Sin Docker, sin secrets en GitHub.
- **Vercel** deploya el frontend.

```
git push ──▶ GitHub ──┬──▶ Supabase (migraciones, integración nativa)
                      └──▶ Vercel (frontend)
```

## Estado actual

- ✅ Repo: `github.com/gotz49/organiasado_app`
- ✅ Supabase: proyecto `strxprszloztovxmfiar`, migraciones aplicadas.
- ⬜ Vercel: pendiente (ver abajo).

## Variables de entorno (Vercel)

El código solo usa **dos** variables (ambas públicas, seguras de exponer):

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://strxprszloztovxmfiar.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la *publishable key* (`sb_publishable_...`) |

> No se necesita la `service_role` key: ningún código la usa. Mantenerla fuera
> reduce la superficie de ataque.

## Deploy del frontend en Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → importá `organiasado_app`.
2. Framework: **Next.js** (autodetectado). Root directory: la raíz del repo. No toques el build.
3. En **Environment Variables** cargá las 2 de la tabla de arriba.
4. **Deploy**. Cada push a `main` redeploya; cada PR genera un preview.

## Configurar Auth en Supabase (post-deploy, una vez)

En **Authentication → URL Configuration** del dashboard de Supabase:

- **Site URL**: tu dominio de Vercel (ej. `https://organiasado-app.vercel.app`).
- **Redirect URLs**: agregá `https://<tu-dominio>.vercel.app/auth/callback`.

Opcional, en **Authentication → Sign In / Providers → Email**:
- Para desarrollo/testing rápido: desactivá **Confirm email** (permite registrarse
  y entrar sin verificar el correo).
- Para producción: dejalo activado y traducí las plantillas de email al español.

## Flujo de trabajo diario

```bash
git checkout -b mi-cambio
# ...editás código y/o agregás migraciones en supabase/migrations...
git commit -am "mi cambio"
git push -u origin mi-cambio
# Abrís PR → Vercel te da un preview. Al mergear a main:
#   - Vercel deploya a producción
#   - Supabase aplica las migraciones nuevas
```

> **Migraciones**: nunca edites una ya aplicada en producción. Para cambiar el
> esquema, creá una nueva con `npx supabase migration new <nombre>`.
