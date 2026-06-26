# Venayuda Transparencia

Plataforma de transparencia para campañas de ayuda, donativos internacionales y compras realizadas.

Esta primera version crea una base solida: proyecto Next.js, estructura para Supabase, schema de base de datos, migracion inicial, RLS, buckets privados de Storage y vistas publicas seguras. Todavia no incluye todas las pantallas.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase Postgres
- Supabase Auth para admins
- Supabase Storage para comprobantes, facturas, fotos y tickets

## Modelo de producto

Esto no es un sistema bancario ni una reconciliacion automatica. Es un ledger manual de transparencia por campana:

1. Un admin crea una campana de ayuda para una persona concreta en Venezuela.
2. La campana describe a quien se ayuda, donde esta y que tipo de ayuda directa se esta dando.
3. Una persona elige una campana, registra un donativo y sube un comprobante.
4. El donativo entra como `pending`.
5. Un admin revisa manualmente el comprobante.
6. El admin marca el donativo como `validated` o `rejected`.
7. Los totales publicos solo cuentan donativos `validated` y compras `approved`.

Tambien puede existir un fondo general sin campana asignada, pero el modelo ya esta preparado para que el usuario decida a que campana aplicar su donativo.

## Campanas

Cada campana representa a una persona que esta recibiendo ayuda directa en Venezuela de una forma especifica. Por ejemplo: medicinas, alimentos, transporte medico, examenes, cuidado diario o reparaciones urgentes.

Estados de campana:

- `draft`: campana en preparacion, no publica.
- `active`: visible y disponible para recibir donativos.
- `paused`: temporalmente no visible para donativos publicos.
- `completed`: visible como historial, pero ya completada.
- `archived`: oculta del espacio publico.

Las tablas `donations`, `needs` y `purchases` tienen `campaign_id` opcional para mantener flexibilidad mientras se define el flujo completo.

## Tablas

- `admin_profiles`: perfiles privados de admins ligados a usuarios de Supabase Auth.
- `campaigns`: campanas de ayuda para personas concretas.
- `donations`: donativos con datos sensibles, comprobante privado y estado de revision.
- `needs`: necesidades/items por comprar.
- `purchases`: compras/gastos con factura o foto privada por defecto.
- `purchase_items`: lineas de compra ligadas opcionalmente a necesidades.

## Vistas publicas

La app publica debe leer desde estas vistas, no desde las tablas privadas:

- `public_ledger_summary`: total donado validado, total gastado aprobado y saldo disponible por moneda de reporte.
- `public_campaigns`: campanas activas o completadas, sin notas internas.
- `public_donations`: donativos validados sin emails, telefonos, referencia completa, notas internas ni comprobantes.
- `public_purchases`: compras aprobadas sin notas internas ni rutas privadas.
- `public_purchase_items`: items de compras aprobadas.
- `public_needs`: necesidades publicas abiertas o parcialmente financiadas.

## Seguridad y privacidad

Reglas importantes ya incluidas en la migracion:

- RLS esta activo en todas las tablas principales.
- El publico solo ve campanas `active` o `completed`.
- El publico puede crear donativos pendientes, pero no leer la tabla `donations`.
- Solo admins activos pueden ver o gestionar donativos completos.
- El publico nunca ve emails, telefonos, notas internas, referencia completa ni comprobantes privados.
- Los comprobantes de donacion viven en el bucket privado `donation-proofs`.
- Las facturas/fotos/tickets viven en el bucket privado `purchase-documents`.
- Las facturas y fotos de compras son privadas por defecto.
- Un documento de compra solo puede ser publico si la compra esta `approved` y el admin marco `invoice_is_public` o `photo_is_public`.

## Moneda de reporte

Cada donativo y compra guarda:

- `amount` y `currency`: monto y moneda original.
- `reporting_amount` y `reporting_currency`: monto normalizado para reportes publicos.

La conversion no es automatica en esta version. El admin debe capturar o confirmar el monto de reporte manualmente al validar/aprobar.

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
lib/
  supabase/
    client.ts
    server.ts
  utils.ts
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
3. CRUD basico de campanas.
4. Vista de donativos pendientes por campana.
5. Pantalla de revision de comprobante.
6. Acciones para validar/rechazar donativos.

Despues conviene construir el dashboard publico usando solamente las vistas `public_*`.
