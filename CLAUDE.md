# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Kodeo Website** is a full-stack application for a digital agency (Kodeo, Mexico). It consists of:
- A **React + Vite frontend** (landing page + portal de clientes)
- A **PHP backend** that handles auth, payments, and orders
- A **MySQL 8.4 database** for users and orders
- **Docker Compose** to orchestrate backend + database locally

Key features:
- Multi-section landing page (Hero, Services, Projects, Testimonials, Stats, CTA)
- Dual-language support (Spanish/English) with centralized copy in `frontend/src/data/copy.js` — el idioma se autodetecta del navegador (`navigator.language`), no hay toggle manual
- Smooth animations using GSAP
- Routing real con `react-router-dom` (rutas por URL, no state-based)
- JWT authentication (email/password + Google OAuth + Apple OAuth) — el provider `google` se verifica vía Firebase (Identity Platform), no contra Google OAuth directo
- Recuperación de contraseña por email (SMTP vía PHPMailer)
- Portal de cliente: cuenta editable, historial de pedidos con notificación por email al cambiar de estado
- Stripe payment processing (tarjeta con MSI, OXXO, SPEI)
- Orders management with role-based access (cliente / administrador) — rol `administrador` se asigna automáticamente a correos `@kodeo.mx`

## Repository Structure

```
kodeo-editorial/
├── frontend/            # React + Vite app
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── data/        # copy.js — todo el texto del sitio
│   │   ├── hooks/       # useMagneticCursor, useBreakpoint, useContentProtection
│   │   ├── lib/         # api.js — API_BASE_URL centralizado
│   │   └── styles/      # globals.css con CSS custom properties
│   └── package.json
├── backend/             # PHP API (Apache + PHP en Docker)
│   ├── config.php       # Stripe, CORS, helpers JSON, SMTP/email, roles, fechas de entrega
│   ├── db.php           # Singleton PDO (carga .env automáticamente)
│   ├── auth.php         # getAuthUser() — helper JWT compartido
│   ├── register.php     # POST /register
│   ├── login.php        # POST /login
│   ├── oauth.php        # POST /oauth  (Google vía Firebase / Apple directo)
│   ├── account.php      # PATCH /account  (editar perfil)
│   ├── forgot-password.php  # POST — solicita reset de contraseña
│   ├── reset-password.php   # POST — aplica nueva contraseña con token
│   ├── orders.php       # GET/PATCH /orders
│   ├── projects.php     # GET/POST/PATCH — proyectos de clientes (admin crea/edita)
│   ├── payment-orders.php         # GET/POST/PATCH — órdenes de pago con link único
│   ├── payment-order-helpers.php  # settlePaymentOrder() + emails (compartido webhook/confirm)
│   ├── create-payment-intent.php  # POST — tarjeta + MSI (también órdenes: payment_order_token)
│   ├── create-oxxo.php            # POST — pago OXXO
│   ├── create-spei.php            # POST — transferencia SPEI
│   ├── confirm-payment.php        # POST — respaldo síncrono del webhook
│   ├── webhook.php      # POST /webhook  (eventos Stripe)
│   ├── assets/          # logo-email.png — embebido en emails vía CID
│   ├── composer.json    # stripe/stripe-php ^13, firebase/php-jwt ^7, kreait/firebase-php ^7, phpmailer ^6.9
│   ├── Dockerfile
│   ├── .env             # Variables de entorno (NO commitear)
│   └── .env.example     # Plantilla de variables requeridas
├── database/
│   ├── init.sql         # Schema inicial (users + orders)
│   ├── migration_oauth.sql  # Migración: columnas oauth_provider / oauth_id
│   ├── migration_password_reset.sql  # Migración: reset_token_hash / reset_token_expires
│   └── migration_projects_payment_orders.sql  # Migración: tablas projects + payment_orders
└── docker-compose.yml   # MySQL 8.4 (puerto 3307) + Backend PHP (puerto 8000)
```

## Development Commands

### Frontend

```bash
cd frontend
npm run dev           # Dev server con HMR (http://localhost:5000)
npm run dev:clean     # Limpia caché Vite y reinicia
npm run build         # Build de producción (./dist)
npm run build:analyze # Build con info de debug
npm run lint          # ESLint sobre .js/.jsx
npm run preview       # Preview del build (http://localhost:5000)
```

### Backend (Docker)

```bash
docker compose up -d          # Levantar MySQL + PHP backend
docker compose down           # Detener
docker compose logs backend   # Ver logs del backend PHP
docker compose logs db        # Ver logs de MySQL
```

El backend queda disponible en `http://localhost:8000`.
MySQL queda en `localhost:3307` (usuario: `kodeo`, password: `kodeopass`).

### Composer (dependencias PHP)

```bash
cd backend && composer install   # Instalar dependencias (requerido la primera vez)
```

## Backend API

Base URL local: `http://localhost:8000`

### Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/register.php` | Crear cuenta (name, username, email, password) |
| POST | `/login.php` | Login por email o username → devuelve JWT |
| POST | `/oauth.php` | Login OAuth → `{ provider: 'google'\|'apple', token, name? }`. `google` valida el token contra el JWKS de Firebase (`securetoken.google.com`, requiere `FIREBASE_PROJECT_ID`); `apple` valida directo contra `appleid.apple.com/auth/keys` |
| PATCH | `/account.php` | Actualiza `{name, username, email}` del usuario autenticado y reemite el JWT |
| POST | `/forgot-password.php` | Recibe `{email}`, genera token de reset (hash + expira en 1h) y envía email. Respuesta genérica siempre (anti enumeración) |
| POST | `/reset-password.php` | Recibe `{token, password}`, valida hash + expiración y actualiza `password_hash` |

El JWT tiene vigencia de 7 días y lleva `sub`, `name`, `username`, `email`, `role`.

### Pedidos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/orders.php` | Listar pedidos (cliente ve los suyos; administrador ve todos) |
| PATCH | `/orders.php?id={id}` | Actualizar pedido — solo `administrador`. Si cambia `status`, envía email de notificación al cliente |

Requiere header `Authorization: Bearer <token>`.

### Proyectos y órdenes de pago (cierre de ventas / cargos extras)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/projects.php` | Cliente ve sus proyectos; admin ve todos. Cada proyecto incluye sus `payment_orders` |
| POST | `/projects.php` | Solo admin: crea proyecto `{name, user_email?, notes?}`. `user_email` vacío = prospecto sin cuenta (el proyecto se reclama al abrir el link de pago autenticado) |
| PATCH | `/projects.php?id={id}` | Solo admin: `{name, status, notes, user_email}`. Estatus: `en_diseno`, `en_desarrollo`, `completado`, `cancelado` |
| GET | `/payment-orders.php?token={t}` | Detalle de la orden por su `public_token` (requiere sesión). Si el proyecto no tiene dueño, lo asigna al usuario autenticado |
| POST | `/payment-orders.php` | Solo admin: crea orden `{project_id, amount (pesos), descripcion, permite_msi, es_cargo_extra}` → devuelve `pay_url` (`/pago/orden/{token}`) y envía el link por email si el proyecto tiene cliente ligado |
| PATCH | `/payment-orders.php?id={id}` | Solo admin: `{status}` — `pagado` marca pago por transferencia (fija `tipo_pago`/`paid_at` y notifica), `cancelado`, `pendiente` |

Pago con Stripe de una orden: el frontend manda `payment_order_token` a `/create-payment-intent.php`; el monto se lee de la BD y el recargo MSI (`MSI_SURCHARGE_RATES` en `config.php`) se calcula en servidor — el total no es manipulable desde el navegador. Al confirmarse el pago (webhook o `confirm-payment.php`), `settlePaymentOrder()` marca la orden `pagado` y avisa por email al admin (`ADMIN_NOTIFY_EMAIL`) y al cliente; estos pagos NO crean fila en `orders`.

### Pagos Stripe

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/create-payment-intent.php` | Tarjeta de crédito (+ MSI: 3/6/9/12/18/24 meses) |
| POST | `/create-oxxo.php` | Pago en efectivo OXXO (genera voucher) |
| POST | `/create-spei.php` | Transferencia SPEI (genera CLABE única) |
| POST | `/webhook.php` | Receptor de eventos Stripe (firma verificada). En `payment_intent.succeeded` inserta el pedido en `orders` |
| POST | `/confirm-payment.php` | Respaldo síncrono del webhook: el frontend lo llama tras un pago exitoso (o al llegar a `/pago-confirmado`) para crear el pedido sin depender de que el webhook ya haya llegado. Usa `stripe_payment_intent_id` (UNIQUE) para evitar duplicados |

### Roles en base de datos

- `cliente` — acceso solo a sus propios pedidos
- `administrador` — acceso completo a todos los pedidos
- Asignación automática: `defaultRoleForEmail()` (`backend/config.php`) asigna `administrador` a cualquier correo del dominio `ADMIN_EMAIL_DOMAIN` (`kodeo.mx`); `ensureAdminRole()` aplica el upgrade en cada login/oauth y nunca degrada a un usuario ya administrador

## Base de Datos (MySQL)

### Tablas

**`users`** — Cuentas de usuario
- `id`, `name`, `username`, `role`, `email`, `password_hash` (nullable para OAuth)
- `oauth_provider` (google / apple), `oauth_id`
- `reset_token_hash`, `reset_token_expires` — recuperación de contraseña (migración: `migration_password_reset.sql`)
- `verified_at`, `created_at`, `updated_at`

**`orders`** — Pedidos de servicios
- `id`, `user_id` (FK → users), `service`, `amount`
- `status`: `pendiente` | `en_proceso` | `completado` | `cancelado`
- `notes`, `start_date`, `delivery_date`
- `stripe_payment_intent_id` (UNIQUE) — vincula el pedido al PaymentIntent de Stripe; evita pedidos duplicados entre el webhook y `confirm-payment.php`
- `created_at`, `updated_at`

**`projects`** — Proyectos de clientes (migración: `migration_projects_payment_orders.sql`)
- `id`, `user_id` (FK → users, **nullable** para prospectos), `name`, `notes`
- `status`: `en_diseno` | `en_desarrollo` | `completado` | `cancelado`

**`payment_orders`** — Órdenes de pago personalizadas ligadas a un proyecto
- `id`, `project_id` (FK → projects), `public_token` (CHAR(32) UNIQUE — link `/pago/orden/{token}`)
- `descripcion`, `amount`, `currency`, `tipo_pago` (`transferencia` | `stripe`)
- `status`: `pendiente` | `pagado` | `cancelado`; `permite_msi`, `es_cargo_extra` (booleans)
- `stripe_payment_intent_id` (UNIQUE), `paid_at`

El schema se aplica automáticamente al crear el contenedor MySQL (`database/init.sql`).

## Variables de Entorno del Backend

Copiar `backend/.env.example` → `backend/.env` y completar:

```env
STRIPE_SECRET_KEY=sk_test_...          # Dashboard Stripe → API keys
STRIPE_PUBLISHABLE_KEY=pk_test_...     # Dashboard Stripe → API keys
STRIPE_WEBHOOK_SECRET=whsec_...        # Dashboard Stripe → Webhooks

ALLOWED_ORIGIN=http://localhost:5000   # URL del frontend (sin trailing slash)

DB_HOST=db
DB_PORT=3306
DB_NAME=kodeo-website
DB_USER=kodeo
DB_PASSWORD=kodeopass

JWT_SECRET=cambia_esto_en_produccion
GOOGLE_CLIENT_ID=                      # Opcional: validación de audience Google
FIREBASE_PROJECT_ID=                   # Requerido para validar el JWKS del provider 'google' en /oauth.php

# SMTP — envío de emails de recuperación de contraseña y notificación de pedidos (Zoho Mail)
SMTP_HOST=smtp.zoho.com
SMTP_PORT=465
SMTP_SECURE=ssl
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
SMTP_FROM_NAME=Kodeo

# Opcional: correo que recibe avisos internos (órdenes pagadas, cargos extras aprobados).
# Si se omite, usa SMTP_FROM_EMAIL.
ADMIN_NOTIFY_EMAIL=
```

`setCorsHeaders()` (`backend/config.php`) ya acepta automáticamente cualquier origen `localhost:*`, así que `ALLOWED_ORIGIN` solo importa para producción — no hay que tocarlo al alternar entre desarrollo y producción localmente.

## Variables de Entorno del Frontend

La URL del backend está centralizada en `frontend/src/lib/api.js` (`API_BASE_URL`), que lee `VITE_BACKEND_URL`. Nunca hardcodear la URL del backend en un componente — importar `API_BASE_URL` desde ahí.

Vite alterna automáticamente el archivo de entorno según el comando:

| Archivo | Cuándo se usa | Valor |
|---------|---------------|-------|
| `frontend/.env` (no se commitea, copiar de `.env.example`) | `npm run dev` | `VITE_BACKEND_URL=http://localhost:8000` |
| `frontend/.env.production` (sí se commitea) | `npm run build` | `VITE_BACKEND_URL=https://api.kodeo.mx` |

Para probar el build de producción contra el backend local, sobreescribir temporalmente con `VITE_BACKEND_URL=http://localhost:8000 npm run build`.

Otras variables en `frontend/.env.example`:

```env
VITE_GOOGLE_CLIENT_ID=      # OAuth2 directo (opcional si se usa Firebase)
VITE_APPLE_CLIENT_ID=       # Apple Sign In (opcional si se usa Firebase)

# Firebase — SDK cliente, usado para el login con Google (provider 'google' en /oauth.php)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

## Frontend Architecture

El frontend vive en `frontend/`. Todo lo documentado abajo asume `cd frontend` o rutas relativas desde ahí.

### Component Architecture

El routing usa **`react-router-dom`** (v7) con rutas reales por URL — ya no es state-based. `App.jsx` define todas las rutas con `<Routes>/<Route>`; las rutas secundarias se cargan con `lazy()` para code-splitting:

| Ruta | Página |
|------|--------|
| `/` | Landing (Hero, Services, Projects, Testimonials, Stats, CTA) |
| `/sobre-nosotros`, `/preguntas`, `/metodologia`, `/stack`, `/costos`, `/privacidad`, `/terminos` | Páginas de contenido |
| `/:slug` (`landing-page`, `sitio-web`, `tienda-online`) | `ServicePage` — detalle de servicio, mapeado por `SLUG_CODES`/`SERVICE_SLUGS` |
| `/login`, `/register` | Auth |
| `/recuperar`, `/restablecer` | Recuperación de contraseña |
| `/cuenta` | `AccountPage` — perfil del usuario autenticado |
| `/pedidos` | `OrdersPage` — historial de pedidos |
| `/comprar` | `SelectProductPage` — elección de producto |
| `/pago` | `Checkout` |
| `/proyectos` | `ProjectsPage` — sección del Panel (usa `PortalLayout`; reemplazó a "Pedidos" en la navegación del portal): cliente ve avance y aprueba/paga cargos extras; admin crea proyectos, genera órdenes/links y marca transferencias pagadas. `/pedidos` sigue existiendo pero ya no aparece en el menú del portal |
| `/pago/orden/:token` | `OrderPaymentPage` — pantalla de pago de una orden personalizada. Si no hay sesión, guarda el destino en `localStorage` (`kodeo_redirect`) y redirige a login/registro; al autenticarse vuelve solo |
| `/pago-confirmado` | `PaymentConfirmedPage` — return_url de Stripe tras OXXO/SPEI/3DS |
| `*` | Redirige a `/` |

Otros datos de estado en `App.jsx`:
- `lang` — se infiere de `navigator.language` (no hay toggle manual); `es` | `en`
- `motionSpeed` — velocidad de animaciones GSAP (default 0.8)
- `user` — persistido en `localStorage`, actualizado por login/logout/edición de cuenta

### Key Components

| Component | Purpose |
|-----------|---------|
| `Nav` | Navegación con logo, links, botón de contacto |
| `Hero` | Sección principal con headline y CTA |
| `Marquee` | Banner de texto animado |
| `Services` | Grid de servicios con precios |
| `Projects` | Portafolio con modal de preview |
| `ProjectModal` | Overlay de detalle de proyecto |
| `Testimonials` | Carrusel de testimonios |
| `Stats` | Métricas clave (4.9★, 98%, etc.) |
| `CtaSection` | Sección de cierre con CTA |
| `Footer` | Pie de página |
| `ServicePage` | Página de detalle de servicio |
| `PageMeta` | SEO (título, meta tags, Open Graph) vía `react-helmet-async` |
| `LoginPage` / `RegisterPage` | Auth — email/password y OAuth (Google vía Firebase, Apple) |
| `ForgotPasswordPage` / `ResetPasswordPage` | Flujo de recuperación de contraseña |
| `AccountPage` | Edición de perfil (`PATCH /account.php`) |
| `OrdersPage` | Historial de pedidos — vista kanban (desktop) o calendario (mobile) |
| `SelectProductPage` | Selección de producto antes del checkout |
| `Checkout` | Pago: tarjeta/MSI, OXXO, SPEI vía Stripe |
| `ProjectsPage` | Sección Proyectos del Panel (cliente/admin): alerta de cargos extras pendientes, creación de proyectos y órdenes de pago con link único |
| `BookingCalendar` | Calendario de agenda propio (L-V 9–18, sáb 10–14, slots de 30 min) usado en `/agendar` y en "Agendar cita" del Panel de citas; la cita se confirma por WhatsApp (`copy.booking.waMessage` en /agendar, `copy.booking.panelWaMessage` — nombre, tipo, proyecto, correo y motivo — en el Panel). Las citas del Panel se registran vía `POST /appointments.php` como `call_type='panel'` (migración: `migration_panel_appointments.sql`; `service_code` = `nuevo`/`existente`, `project_details` = motivo), aparecen en la sección Citas de cliente y admin, el backend las elimina automáticamente al pasar su fecha (limpieza en el GET) y solo el admin puede reprogramarlas (`PATCH ?action=reschedule`, envía email al cliente) |
| `OrderPaymentPage` | Pago de orden personalizada (`/pago/orden/:token`) con MSI si `permite_msi` |
| `PaymentConfirmedPage` | Confirmación de pago, llama a `/confirm-payment.php` como respaldo del webhook |
| `LangToggle` | Selector de idioma ES/EN — **sin usar actualmente**: el componente existe pero `App.jsx` ya no lo monta (el idioma se autodetecta) |

### Content Management

**Todo el texto está centralizado en `frontend/src/data/copy.js`:**
- Objeto `COPY` con claves `es` y `en`
- Siempre editar `copy.js`, nunca texto hardcoded en componentes

## Styling & Animation

- CSS custom properties en `frontend/src/styles/globals.css`
- **GSAP** para animaciones — la prop `motionSpeed` controla la duración
- Hook `useMagneticCursor` para cursor magnético en elementos interactivos
- Hook `useBreakpoint` — detecta viewport `<768px` (`isMobile`), usado para layouts responsive (p. ej. kanban vs. calendario en `OrdersPage`)
- Hook `useContentProtection` — bloquea DevTools (F12, Ctrl+Shift+I/J/C/K), ver código fuente (Ctrl+U), guardar (Ctrl+S) e imprimir (Ctrl+P) fuera de campos de formulario

## ESLint & Code Quality

```bash
cd frontend && npm run lint
```

ESLint corre sobre `.js`/`.jsx` con reglas de React Hooks y React Refresh.

## Building & Deployment

- `npm run build` genera `frontend/dist/` (archivos estáticos listos para producción)
- El backend PHP se sirve con Apache dentro del contenedor Docker
- En producción: apuntar `ALLOWED_ORIGIN` al dominio real del frontend

## Notes for Future Work

- Para producción: cambiar `JWT_SECRET` por un valor aleatorio seguro (≥32 caracteres)
