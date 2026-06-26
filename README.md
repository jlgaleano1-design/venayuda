# Venayuda Transparencia

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

## Modelo de producto

Esto no es un sistema bancario ni una reconciliacion automatica. Es un ledger manual de transparencia por campana:

1. Una persona u organizacion solicita crear una campana de ayuda.
2. La campana describe quien responde, donde ayuda y que metodos externos puede recibir.
3. Un admin revisa y publica la campana.
4. Un donante elige una campana, dona por fuera de la plataforma y reporta su aporte.
5. El reporte de donacion entra como `pending`.
6. Un admin revisa manualmente el comprobante y marca la donacion como `verified` o `rejected`.
7. Los totales publicos solo cuentan donaciones `verified` y compras `approved`.

Venayuda no procesa pagos. Cada campana publica sus propios metodos de pago e instrucciones abiertas. La plataforma sirve para descubrir campanas, reportar donaciones, revisarlas manualmente y mostrar seguimiento publico.

## Campanas

Cada campana representa a una persona que esta recibiendo ayuda directa en Venezuela de una forma especifica. Por ejemplo: medicinas, alimentos, transporte medico, examenes, cuidado diario o reparaciones urgentes.

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

- `receiving_category`: `mexico`, `united_states`, `venezuela`, `international` u `other`.
- `method_name`: SPEI, Zelle, Pago Movil, transferencia, efectivo u otro texto libre.
- `currency`: moneda sugerida.
- `account_holder`: titular o destinatario.
- `transfer_instructions`: campo abierto para CLABE, Zelle, telefono, banco, Wise, PayPal u otra instruccion.
- `notes`: detalles adicionales.

## Tablas

- `admin_profiles`: perfiles privados de admins ligados a usuarios de Supabase Auth.
- `campaigns`: solicitudes y campanas publicas de ayuda.
- `campaign_payment_methods`: metodos externos por los que una campana puede recibir fondos.
- `donations`: reportes de donacion con codigo publico, datos sensibles privados, comprobante privado y estado de revision.
- `needs`: necesidades/items por comprar.
- `purchases`: compras/gastos con factura/foto privada por defecto.
- `purchase_items`: lineas de compra ligadas opcionalmente a necesidades.

## Vistas publicas

La app publica debe leer desde estas vistas, no desde las tablas privadas:

- `public_ledger_summary`: total donado verificado, total gastado aprobado y saldo disponible por moneda de reporte.
- `public_campaigns`: campanas publicas con resumen de transparencia.
- `public_campaign_payment_methods`: metodos activos de campanas activas.
- `public_campaign_receiving_categories`: categorias para filtros publicos.
- `public_donations`: donaciones verificadas sin contacto, referencia de transferencia, notas internas ni comprobantes.
- `public_purchases`: compras aprobadas sin notas internas ni rutas privadas.
- `public_purchase_items`: items de compras aprobadas.
- `public_needs`: necesidades publicas abiertas o parcialmente financiadas.

## Seguridad y privacidad

Reglas importantes ya incluidas en la migracion:

- RLS esta activo en todas las tablas principales.
- El publico solo lee campanas verificadas en estado `active`, `paused` o `completed`.
- El publico puede enviar solicitudes de campana.
- El publico puede crear reportes de donacion pendientes, pero no leer la tabla `donations`.
- Solo admins activos pueden ver o gestionar donaciones completas.
- El publico nunca ve contacto del donante, notas internas, referencias de transferencia ni comprobantes privados.
- Los comprobantes de donacion viven en el bucket privado `donation-proofs`.
- Las facturas/fotos/tickets viven en el bucket privado `purchase-documents`.
- Las facturas y fotos de compras son privadas por defecto.
- Un documento de compra solo puede ser publico si la compra esta `approved` y el admin marco `is_invoice_public` o `is_photo_public`.

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

### 3. Iniciar Supabase local

Con Supabase CLI instalado:

```bash
supabase start
supabase db reset
```

`db reset` aplica la migracion `supabase/migrations/0001_initial_transparency_ledger.sql`.

### 4. Crear el primer admin

1. Crea un usuario en Supabase Auth.
2. Copia su `user_id`.
3. Inserta el perfil admin con permisos de `owner`:

```sql
insert into public.admin_profiles (user_id, email, full_name, role)
values ('USER_ID_AQUI', 'admin@example.com', 'Admin', 'owner');
```

Para el primer admin, ejecuta ese SQL desde Supabase Studio o con la service role, porque todavia no existe ningun owner que pueda invitar a otros admins.

### 5. Iniciar Next.js

```bash
pnpm dev
```

La app quedara en:

```text
http://localhost:3000
```

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
