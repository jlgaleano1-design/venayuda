# Vendonar Transparencia

Plataforma de transparencia para campañas de ayuda, donaciones internacionales reportadas y compras realizadas.

Esta primera version crea una base solida: proyecto Next.js, estructura para Supabase, schema de base de datos, migracion inicial, RLS, buckets privados de Storage y vistas publicas seguras. Todavia no incluye todas las pantallas.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- HeroUI
- Supabase Postgres
- Supabase Auth para admins
- Supabase Storage para comprobantes, facturas, fotos y tickets

## Direccion visual

- Fondo blanco, texto negro, sin dark mode.
- CTA principal: fondo `#2D5D5E` con texto `#FAE880`.
- CTA secundario: gris claro.
- Componentes base: HeroUI con Tailwind CSS.

## Modelo de producto

Esto no es un sistema bancario ni una reconciliacion automatica. Es un ledger manual de transparencia por campana:

1. Una persona u organizacion solicita crear una campana de ayuda.
2. La campana describe quien responde, donde ayuda, que metodos externos puede recibir, que Instagram publico ayuda a darle credibilidad y que link personalizado quiere usar para compartirla.
3. Un admin revisa y publica la campana.
4. Al aprobarla, el admin genera o envia un enlace privado para la persona responsable de la campana.
5. Un donante elige una campana, dona por fuera de la plataforma y reporta su aporte.
6. El reporte de donacion entra como `pending`.
7. Un admin revisa manualmente el comprobante y marca la donacion como `verified` o `rejected`.
8. La persona responsable usa su enlace privado para subir novedades de compras con foto, monto, fecha y descripcion.
9. Cada compra entra como `pending`; un admin decide si la aprueba y si la foto o factura se muestran publicamente.
10. Los totales publicos solo cuentan donaciones `verified` y compras `approved`.

Vendonar no procesa pagos. Cada campana publica sus propios metodos de pago e instrucciones abiertas. La plataforma sirve para descubrir campanas, reportar donaciones, revisarlas manualmente y mostrar seguimiento publico.

## Campanas

Cada campana representa a una persona que esta recibiendo ayuda directa en Venezuela de una forma especifica. Por ejemplo: medicinas, alimentos, transporte medico, examenes, cuidado diario o reparaciones urgentes.

El campo personalizado para compartir es el `slug` de la campana. Es la opcion mas simple porque la tabla `campaigns` ya exige `slug` unico y la app ya usa ese valor para encontrar la campana publica. Si el `slug` ya existe, la solicitud debe rechazarse o pedir otro valor antes de enviarse.

La campana tambien puede guardar un `instagram_handle` opcional. Este dato es publico y sirve como senal rapida de confianza para donantes; no reemplaza la revision manual ni la verificacion admin.

Ejemplo de formato:

- Campo personalizado: `ayuda-la-guaira`
- Link corto para compartir: `/ayuda-la-guaira`
- Pagina real: `/campanas/ayuda-la-guaira`

Estados de campana:

- `pending_review`: solicitud recibida, pendiente de revision admin.
- `draft`: campana en preparacion, no publica.
- `active`: visible y disponible para recibir reportes de donacion.
- `paused`: visible como referencia, pero no disponible para nuevos reportes.
- `completed`: visible como historial, pero ya completada.
- `archived`: oculta del espacio publico.

Las campanas tambien tienen `verification_status`: `unverified`, `pending`, `verified` o `rejected`.

## Metodos de pago

Cada campana puede publicar varios metodos de pago. Los campos son deliberadamente flexibles porque cada pais y cada persona maneja datos distintos:

- `receiving_category`: `mexico`, `united_states`, `venezuela`, `spain`, `panama`, `colombia`, `chile`, `argentina`, `international` u `other`.
- `method_name`: SPEI, Zelle, Pago Movil, transferencia, efectivo u otro texto libre.
- `currency`: moneda sugerida.
- `account_holder`: titular o destinatario.
- `transfer_instructions`: campo abierto para CLABE, Zelle, telefono, banco, Wise, PayPal u otra instruccion.
- `notes`: detalles adicionales.

## Tablas

- `admin_profiles`: perfiles privados de admins ligados a usuarios de Supabase Auth.
- `campaigns`: solicitudes y campanas publicas de ayuda.
- `campaign_payment_methods`: metodos externos por los que una campana puede recibir fondos.
- `campaign_creator_access_links`: enlaces privados, hasheados, para que responsables suban novedades de compra.
- `donations`: reportes de donacion con codigo publico, datos sensibles privados, comprobante privado y estado de revision.
- `needs`: necesidades/items por comprar.
- `purchases`: compras/gastos con factura/foto privada por defecto; pueden venir del panel admin o del enlace privado del creador.
- `purchase_items`: lineas de compra ligadas opcionalmente a necesidades.

## Vistas publicas

La app publica debe leer desde estas vistas, no desde las tablas privadas:

- `public_ledger_summary`: total donado verificado, total gastado aprobado y saldo disponible por moneda de reporte.
- `public_campaigns`: campanas publicas con resumen de transparencia.
- `public_campaign_payment_methods`: metodos activos de campanas activas.
- `public_campaign_receiving_categories`: categorias para filtros publicos.
- `public_donations`: donaciones verificadas sin contacto, referencia de transferencia, notas internas ni comprobantes.
- `public_purchases`: compras aprobadas sin notas internas; solo expone rutas de factura/foto cuando el admin marco esos archivos como publicos.
- `public_purchase_items`: items de compras aprobadas.
- `public_needs`: necesidades publicas abiertas o parcialmente financiadas.

## Seguridad y privacidad

Reglas importantes ya incluidas en la migracion:

- RLS esta activo en todas las tablas principales.
- El publico solo lee campanas verificadas en estado `active`, `paused` o `completed`.
- El publico puede enviar solicitudes de campana.
- El publico puede crear reportes de donacion pendientes, pero no leer la tabla `donations`.
- Solo admins activos pueden ver o gestionar donaciones completas.
- Solo admins activos pueden ver, crear o revocar enlaces privados de creador.
- El publico nunca ve contacto del donante, notas internas, referencias de transferencia ni comprobantes privados.
- Los comprobantes de donacion viven en el bucket privado `donation-proofs`.
- Las facturas/fotos/tickets viven en el bucket privado `purchase-documents`.
- Las facturas y fotos de compras son privadas por defecto.
- Un documento de compra solo puede ser publico si la compra esta `approved` y el admin marco `is_invoice_public` o `is_photo_public`.

## Acceso del creador

Despues de crear y aprobar una campana, el equipo comparte un enlace privado con la persona responsable. Ese enlace no es una cuenta publica: funciona como acceso acotado a una sola campana y se puede revocar desde admin.

Este acceso es distinto al link publico para compartir. El link publico es corto y visible; el link de creador debe usar un token largo, aleatorio y guardado hasheado en `campaign_creator_access_links`. Asi el organizador puede entrar sin login, pero el equipo puede revocar o vencer el acceso si se filtra.

Desde el portal del creador se captura:

- Titulo de la compra.
- Monto y moneda.
- Fecha de compra.
- Proveedor o tienda.
- Foto obligatoria de lo comprado.
- Factura, ticket o captura adicional opcional.
- Descripcion breve.

El envio crea una compra en estado `pending`. La compra no afecta totales ni aparece en la pagina publica hasta que un admin la apruebe. La foto se mantiene privada salvo que el admin marque `is_photo_public`.

## Moneda de reporte

Cada donacion y compra guarda:

- `amount` y `currency`: monto y moneda original.
- `amount_usd`: monto normalizado para totales publicos.

La conversion no es automatica en esta version. El admin debe capturar o confirmar el monto de reporte manualmente al validar/aprobar.

## Fases de construccion

- Fase 1: schema, migraciones, RLS, vistas publicas y README.
- Fase 2: home publica con hero, filtros por categoria de recepcion y cards de campana.
- Fase 3: detalle de campana, metodos de pago y flujo "Avisar que done".
- Fase 4: panel admin para aprobar campanas, verificar donaciones y aprobar compras.
- Fase 5: portal privado del creador para subir compras con foto.

## MVP actual

El MVP frontend deja lista la estructura principal sin campañas placeholder:

- `/`: home publica con hero, CTAs, filtros sticky y estado vacio de campanas publicadas.
- `/[slug]`: link corto para compartir una campana; redirige al detalle publico.
- `/campanas/[slug]`: detalle publico de campana con metodos de pago, resumen, donaciones y compras.
- `/campanas/[slug]/donar`: formulario visual para reportar una donacion externa.
- `/campanas/crear`: formulario visual para solicitar una nueva campana.
- `/creador/[accessCode]`: portal privado para subir novedades de compra con foto cuando exista un acceso real.
- `/admin/login`: entrada visual para admins.
- `/admin`: panel operativo inicial con metricas en cero y estados vacios para colas de revision.

`lib/demo-data.ts` conserva tipos, filtros y helpers, pero no contiene campanas publicadas. El siguiente paso tecnico es conectar estas pantallas a Supabase usando las vistas `public_*` y crear inserts reales para solicitudes de campana y reportes de donacion.

## Correr localmente

### 1. Instalar dependencias

```bash
pnpm install
```

Si usas npm:

```bash
npm install
```

### 2. Configurar variables de entorno

Copia `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Si usas Supabase local, completa los valores despues de iniciar Supabase. Si usas un proyecto remoto, usa la URL y anon key del dashboard de Supabase.

Para usar un dominio propio, define:

```bash
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
```

La app usa este valor para construir links publicos de campana como `https://tu-dominio.com/ayuda-la-guaira`.

### 3. Configurar correo transaccional

Vendonar encola correos en Supabase y los envia desde el worker
`/api/internal/email-worker`. Para produccion, usa un proveedor SMTP con cuota
gratuita suficiente y define:

```bash
EMAIL_PROVIDER=smtp
EMAIL_FROM="Vendonar <notificaciones@tu-dominio.com>"
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=tu-usuario-smtp
SMTP_PASS=tu-password-smtp
```

Con `EMAIL_PROVIDER=auto`, la app usa SMTP si `SMTP_HOST` existe y deja Resend
solo como respaldo si no hay SMTP configurado. Para forzar Resend, define
`EMAIL_PROVIDER=resend` y `RESEND_API_KEY`.

### 4. Iniciar Supabase local

Con Supabase CLI instalado:

```bash
supabase start
supabase db reset
```

`db reset` aplica la migracion `supabase/migrations/0001_initial_transparency_ledger.sql`.

### 5. Crear el primer admin

1. Crea un usuario en Supabase Auth.
2. Copia su `user_id`.
3. Inserta el perfil admin con permisos de `owner`:

```sql
insert into public.admin_profiles (user_id, email, full_name, role)
values ('USER_ID_AQUI', 'admin@example.com', 'Admin', 'owner');
```

Para el primer admin, ejecuta ese SQL desde Supabase Studio o con la service role, porque todavia no existe ningun owner que pueda invitar a otros admins.

### 6. Iniciar Next.js

```bash
pnpm dev
```

La app quedara en:

```text
http://localhost:3000
```

## Conectar dominio de GoDaddy

El dominio de GoDaddy solo reserva el nombre. Para usarlo con esta app:

1. Despliega la app en un hosting para Next.js, por ejemplo Vercel.
2. Agrega el dominio comprado en la configuracion del proyecto desplegado.
3. En GoDaddy, entra a DNS y apunta el dominio a los registros que te indique el hosting.
4. En el hosting, configura `NEXT_PUBLIC_SITE_URL` con el dominio final, por ejemplo `https://venayuda.com`.
5. En Supabase Auth, actualiza `site_url` y `additional_redirect_urls` si usas login o enlaces magicos.

Para el producto, ese dominio sera la forma corta de compartir campanas:

```text
https://tu-dominio.com/ayuda-la-guaira
```

El acceso de organizador debe seguir siendo un enlace privado separado:

```text
https://tu-dominio.com/creador/token-largo-no-adivinable
```

## Checks de publicacion

Antes de publicar, corre el gate operativo de staging documentado en
`ops/publication-checks.md`.

Resumen de comandos:

```bash
pnpm check:release
pnpm ops:e2e:staging
pnpm ops:stress:staging
```

El E2E y el stress test requieren variables de staging reales, incluyendo
`TARGET_SITE_URL`, Supabase, service role y secretos de revision/correo.

## Estructura creada

```text
app/
  globals.css
  layout.tsx
  page.tsx
  providers.tsx
lib/
  supabase/
    client.ts
    server.ts
supabase/
  config.toml
  migrations/
    0001_initial_transparency_ledger.sql
  seed.sql
```

## Siguiente paso recomendado

Construir primero el flujo minimo de admins:

1. Login de admin con Supabase Auth.
2. Guard para rutas `/admin`.
3. Revision/aprobacion de solicitudes de campana.
4. Vista de donaciones pendientes por campana.
5. Pantalla de revision de comprobante.
6. Acciones para verificar/rechazar donaciones.

Despues conviene construir el dashboard publico usando solamente las vistas `public_*`.
