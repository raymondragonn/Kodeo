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
- Dual-language support (Spanish/English) with centralized copy in `frontend/src/data/copy.js`
- Smooth animations using GSAP
- Page-based navigation via React state
- JWT authentication (email/password + Google OAuth + Apple OAuth)
- Stripe payment processing (tarjeta con MSI, OXXO, SPEI)
- Orders management with role-based access (cliente / administrador)

## Repository Structure

```
kodeo-editorial/
├── frontend/            # React + Vite app
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── data/        # copy.js — todo el texto del sitio
│   │   ├── hooks/       # Custom hooks (useMagneticCursor)
│   │   └── styles/      # globals.css con CSS custom properties
│   └── package.json
├── backend/             # PHP API (Apache + PHP en Docker)
│   ├── config.php       # Constantes Stripe, CORS, helpers JSON
│   ├── db.php           # Singleton PDO (carga .env automáticamente)
│   ├── register.php     # POST /register
│   ├── login.php        # POST /login
│   ├── oauth.php        # POST /oauth  (Google / Apple)
│   ├── orders.php       # GET/PATCH /orders
│   ├── create-payment-intent.php  # POST — tarjeta + MSI
│   ├── create-oxxo.php            # POST — pago OXXO
│   ├── create-spei.php            # POST — transferencia SPEI
│   ├── webhook.php      # POST /webhook  (eventos Stripe)
│   ├── composer.json    # stripe/stripe-php ^13, firebase/php-jwt ^7
│   ├── Dockerfile
│   ├── .env             # Variables de entorno (NO commitear)
│   └── .env.example     # Plantilla de variables requeridas
├── database/
│   ├── init.sql         # Schema inicial (users + orders)
│   └── migration_oauth.sql  # Migración: columnas oauth_provider / oauth_id
└── docker-compose.yml   # MySQL 8.4 (puerto 3307) + Backend PHP (puerto 8080)
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

El backend queda disponible en `http://localhost:8080`.
MySQL queda en `localhost:3307` (usuario: `kodeo`, password: `kodeopass`).

### Composer (dependencias PHP)

```bash
cd backend && composer install   # Instalar dependencias (requerido la primera vez)
```

## Backend API

Base URL local: `http://localhost:8080`

### Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/register.php` | Crear cuenta (name, username, email, password) |
| POST | `/login.php` | Login por email o username → devuelve JWT |
| POST | `/oauth.php` | Login OAuth → `{ provider: 'google'\|'apple', token, name? }` |

El JWT tiene vigencia de 7 días y lleva `sub`, `name`, `username`, `email`, `role`.

### Pedidos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/orders.php` | Listar pedidos (cliente ve los suyos; administrador ve todos) |
| PATCH | `/orders.php?id={id}` | Actualizar pedido — solo `administrador` |

Requiere header `Authorization: Bearer <token>`.

### Pagos Stripe

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/create-payment-intent.php` | Tarjeta de crédito (+ MSI: 3/6/9/12/18/24 meses) |
| POST | `/create-oxxo.php` | Pago en efectivo OXXO (genera voucher) |
| POST | `/create-spei.php` | Transferencia SPEI (genera CLABE única) |
| POST | `/webhook.php` | Receptor de eventos Stripe (firma verificada) |

### Roles en base de datos

- `cliente` — acceso solo a sus propios pedidos
- `administrador` — acceso completo a todos los pedidos

## Base de Datos (MySQL)

### Tablas

**`users`** — Cuentas de usuario
- `id`, `name`, `username`, `role`, `email`, `password_hash` (nullable para OAuth)
- `oauth_provider` (google / apple), `oauth_id`
- `verified_at`, `created_at`, `updated_at`

**`orders`** — Pedidos de servicios
- `id`, `user_id` (FK → users), `service`, `amount`
- `status`: `pendiente` | `en_proceso` | `completado` | `cancelado`
- `notes`, `start_date`, `delivery_date`, `created_at`, `updated_at`

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
```

## Frontend Architecture

El frontend vive en `frontend/`. Todo lo documentado abajo asume `cd frontend` o rutas relativas desde ahí.

### Component Architecture

El app usa **state-based routing** (sin React Router):
- `page` — vista actual: `'landing'` | `'svc-01'` | `'svc-02'` | `'svc-03'`
- `lang` — idioma: `'es'` | `'en'`
- `motionSpeed` — velocidad de animaciones GSAP (default 0.8)

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
| `LangToggle` | Selector de idioma ES/EN |

### Content Management

**Todo el texto está centralizado en `frontend/src/data/copy.js`:**
- Objeto `COPY` con claves `es` y `en`
- Siempre editar `copy.js`, nunca texto hardcoded en componentes

## Styling & Animation

- CSS custom properties en `frontend/src/styles/globals.css`
- **GSAP** para animaciones — la prop `motionSpeed` controla la duración
- Hook `useMagneticCursor` para cursor magnético en elementos interactivos

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

- Agregar componentes de checkout en el frontend que consuman `/create-payment-intent.php`, `/create-oxxo.php` y `/create-spei.php`
- Implementar el portal de cliente con login, historial de pedidos, y seguimiento de estado
- Considerar React Router si el sitio crece más allá de 3 páginas de servicio
- El webhook actualmente solo hace `error_log`; conectar con la tabla `orders` para actualizar el status real
- Para producción: cambiar `JWT_SECRET` por un valor aleatorio seguro (≥32 caracteres)
