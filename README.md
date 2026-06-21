# ALUNA — sitio web

Catálogo + carrito + seguimiento de pedidos para la marca **ALUNA**.

- **Stack:** Astro (SSR híbrido) + CSS Modules + Markdown content collections + nanostores + Turso (SQLite) + Netlify
- **Cobro:** se gestiona por **WhatsApp** (la web no procesa pagos)
- **Seguimiento:** cada pedido genera una URL única (`/pedido/<id>`) que el cliente recibe en su chat de WhatsApp

## Estructura

```
site/
├── migrations/              SQL de Turso
├── public/                  estáticos (favicon, imágenes de catálogo)
├── scripts/migrate.mjs      aplica migraciones
├── src/
│   ├── components/          Header, Footer, ProductCard, CartDrawer, Logo
│   ├── content/
│   │   ├── colecciones/     una *.md por colección
│   │   └── productos/       una *.md por producto
│   ├── layouts/             BaseLayout
│   ├── lib/                 auth, db, money, orders, whatsapp
│   ├── pages/
│   │   ├── index.astro
│   │   ├── colecciones/     [slug].astro + index.astro
│   │   ├── productos/       [slug].astro + index.astro
│   │   ├── pedido/[id].astro          seguimiento (SSR)
│   │   ├── admin/                     admin (SSR, protegido)
│   │   └── api/                       endpoints serverless
│   ├── stores/cart.ts       nanostores persistente
│   ├── styles/              tokens, reset, global, page module
│   ├── content.config.ts
│   └── middleware.ts        protege /admin/* y /api/admin/*
└── astro.config.mjs
```

## Setup local

### 1. Variables de entorno

Copia el ejemplo y rellena:

```sh
cp .env.example .env
```

- `TURSO_DATABASE_URL`:
  - **Dev local:** `file:./local.db` (sin token, archivo SQLite local).
  - **Producción:** crea una base de datos en [turso.tech](https://turso.tech) (CLI: `turso db create aluna`, `turso db show aluna --url`). Pega esa URL aquí y un token en `TURSO_AUTH_TOKEN` (CLI: `turso db tokens create aluna`).
- `ADMIN_PASSWORD`: contraseña que usarás en `/admin`.
- `ADMIN_COOKIE_SECRET`: genera con `openssl rand -hex 32`. Si rota, todas las sesiones admin se invalidan.
- `WHATSAPP_PHONE`: número con código de país, sólo dígitos, sin `+` (formato `5215XXXXXXXXXX`). Se renderiza en los enlaces `wa.me` que ven los clientes — no es un secreto.
- `NETLIFY_SITE_ID` + `NETLIFY_AUTH_TOKEN` (opcional): permite que dev lea imágenes existentes en Netlify Blobs cuando usas una base de datos que ya contiene URLs `/api/images/*`. Las subidas hechas en dev se guardan localmente en `.netlify-blobs-local/`.

### 2. Migraciones

```sh
npm run migrate
```

### 3. Dev server

```sh
npm run dev
```

Abre [http://localhost:4321](http://localhost:4321).

## Añadir productos / colecciones

- Crea un `.md` en `src/content/productos/<slug>.md` con front-matter (ver ejemplos existentes).
- Para que un producto aparezca en una colección, agrega el slug de la colección al array `colecciones`.
- Las imágenes pueden ser archivos `.svg`/`.jpg`/`.png` en `public/img/` y se referencian por ruta absoluta (`/img/foo.svg`).

## Deploy en Netlify

1. Push el repo a GitHub.
2. En Netlify: New site from Git → conecta el repo.
3. Build settings: `npm run build`, publish dir `dist/`. Astro + adapter detecta automáticamente.
4. Environment variables: copia todas las de `.env`.
5. Deploy.

Las páginas estáticas (catálogo) se sirven desde la CDN. Las dinámicas (`/pedido/*`, `/admin/*`, `/api/*`) corren como Netlify Functions.

## Estados de pedido

`nuevo → confirmado → preparando → enviado → entregado`

Estado lateral: `cancelado`

El admin (`/admin`) cambia estados desde la vista de detalle del pedido. Cada cambio agrega una fila al historial y aparece visible en la página de seguimiento del cliente.

## Estilos

- Sin Tailwind. CSS Modules + tokens en `src/styles/tokens.css`.
- Tokens claves: `--color-lavanda`, `--color-azul-hielo`, `--color-piedra`, `--color-crema`, `--font-display` (Didot/Bodoni stack), `--font-sans` (Inter).
- Mobile-first: layout en columna por defecto, breakpoint en 768 px para 2-3 columnas en desktop.

## Notas

- Carrito en `localStorage` (clave `aluna_cart_v1:`).
- Endpoint `/api/orders` valida el total enviado contra `precio × qty` para evitar manipulación del lado cliente.
- `/api/admin/login` tiene rate limit en memoria (5 intentos / 15 min por IP). Reinicia con el deploy.
- Admin protegido por cookie HMAC (`aluna_admin`), 30 días.
