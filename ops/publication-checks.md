# Publication checks

Este documento es el gate operativo para publicar Vendonar. Primero se corre en
staging y solo despues se repite una version corta en produccion.

## 1. Configuracion de staging

En Vercel staging configura:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `EMAIL_PROVIDER=smtp`
- `EMAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `APPROVAL_RECIPIENT_EMAIL`
- `CAMPAIGN_REVIEW_SECRET`
- `EMAIL_WORKER_SECRET`
- `CRON_SECRET`

Usa el mismo valor para `EMAIL_WORKER_SECRET` y `CRON_SECRET` en Vercel. El
cron definido en `vercel.json` llama `GET /api/internal/email-worker` cada
dia para mantenerse compatible con Vercel Hobby; Vercel adjunta
`Authorization: Bearer $CRON_SECRET`. Para correo transaccional en produccion,
usa un cron externo con el mismo bearer token o ejecuta el worker manualmente
despues de pruebas criticas. No dependas solo del worker diario para campañas
reales.

Sender es el unico proveedor de correo transaccional de Vendonar. Copia
`SMTP_HOST`, `SMTP_USER` y `SMTP_PASS` desde Sender, usa `SMTP_PORT=587` y
mantén `EMAIL_FROM` con un remitente verificado. La app no usa Resend ni otro
fallback; si Sender no esta configurado, los eventos quedan en cola para
reintentarse cuando la configuracion este completa.

En Supabase staging:

1. Aplica todas las migraciones en orden, incluyendo
   `supabase/migrations/0002_backfill_email_events_queue.sql`.
2. Crea un usuario en Supabase Auth.
3. Inserta su perfil admin:

```sql
insert into public.admin_profiles (user_id, email, full_name, role, active)
values ('USER_ID_AQUI', 'admin@example.com', 'Admin staging', 'owner', true);
```

4. Configura Supabase Auth con el dominio de staging en `site_url` y redirect
   URLs.

## 2. Smoke tecnico local

Corre:

```bash
pnpm check:release
```

Debe pasar `typecheck`, `lint` y `build`.

## 3. E2E completo en staging

Exporta las variables contra staging:

```bash
export TARGET_SITE_URL="https://staging.example.com"
export NEXT_PUBLIC_SUPABASE_URL="https://PROJECT.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
export SUPABASE_SERVICE_ROLE_KEY="..."
export CAMPAIGN_REVIEW_SECRET="..."
export EMAIL_WORKER_SECRET="..."
export EMAIL_PROVIDER="smtp"
export EMAIL_FROM="Vendonar <notificaciones@tu-dominio.com>"
export SMTP_HOST="..."
export SMTP_PORT="587"
export SMTP_USER="..."
export SMTP_PASS="..."
```

Ejecuta:

```bash
pnpm ops:e2e:staging
```

Este script valida:

- home, crear campana, login admin y proteccion de `/admin`;
- upload real a `campaign-assets`, `donation-proofs` y `purchase-documents`;
- creacion de campana pendiente;
- aprobacion por enlace de revision;
- extraccion del link privado del creador desde `email_events`;
- render publico de home y detalle;
- reporte y aprobacion de donacion;
- subida y aprobacion de compra;
- correo de impacto encolado para donante;
- privacidad basica de tabla `donations` y comprobantes privados;
- worker de correos si hay secreto configurado.

## 4. Stress test controlado

No ejecutes este paso para validar la migracion a Sender; el E2E anterior es la
prueba correcta para correo y cola. Reserva este test para una ventana separada
de publicacion.

Con las mismas variables:

```bash
pnpm ops:stress:staging
```

Por defecto crea una campana base de stress y luego ejecuta:

- 50 solicitudes de campana;
- 100 reportes de donacion;
- 100 cargas de home/detalle;
- hasta 3 corridas del worker de correos.

Si quieres usar una campana ya existente y activa:

```bash
export STRESS_CAMPAIGN_SLUG="slug-activo"
pnpm ops:stress:staging
```

El test falla si hay respuestas `5xx`.

## 5. Revision manual obligatoria

Despues de los scripts:

1. Entra a `/admin/login` con el admin de staging.
2. Confirma que las colas muestran datos reales y evidencia con links.
3. Aprueba/rechaza al menos un registro desde el panel.
4. Revisa logs de Vercel y confirma cero errores 500.
5. Revisa `email_events` y confirma estados legibles: `pending`, `retrying`,
   `sent` o `failed`.

## 6. Paso a produccion

Solo pasar a produccion si:

- `pnpm check:release` pasa;
- `pnpm ops:e2e:staging` pasa;
- `pnpm ops:stress:staging` pasa solo cuando haya una ventana explicita para
  prueba de carga controlada;
- el admin puede revisar sin abrir Supabase;
- los correos fallidos no rompen formularios;
- Storage guarda paths reales;
- home y detalle solo muestran datos aprobados;
- el cron de correos esta activo.

En produccion, repite:

1. variables de entorno;
2. migracion Supabase;
3. admin real;
4. dominio final en Vercel y Supabase Auth;
5. `pnpm check:release`;
6. `pnpm ops:e2e:staging` apuntando a produccion, con datos marcados como
   prueba;
7. limpieza o archivado de datos sinteticos.
