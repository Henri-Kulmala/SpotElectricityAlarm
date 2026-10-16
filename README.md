# SpotElectricityAlarm

A web application for alarming and visualising optimal power usage based on spot electricity prices. Personal project for learning AWS and CDK.

The app shows Finnish spot electricity prices hour by hour, highlights the current price and tells you the cheapest time window (1–6 h) for running electricity-hungry appliances. The UI is in Finnish and designed mobile first.

## Architecture

```
EventBridge Scheduler (14:30 and 17:00 Finnish time)
        ↓
Lambda: fetch prices ──→ api.porssisahko.net/v2/latest-prices.json
        ↓
DynamoDB: SpotPrices (15-min prices, TTL 30 d) + DailySummaries
        ↑
Lambda: return prices (converts 15-min prices into hourly prices)
        ↑
API Gateway (HTTP API, eu-north-1) ←── React frontend (spotalarm/, static site on cPanel)
```

- **Price source:** [porssisahko.net](https://porssisahko.net), `https://api.porssisahko.net/v2/latest-prices.json`. It returns the latest spot prices for a 48-hour period. Tomorrow's prices are published around 14:00 Finnish time (UTC+3 in summer).
- **Backend:** AWS (Lambda + DynamoDB + API Gateway), running in `eu-north-1`.
- **Frontend:** `spotalarm/`, a static single-page app built with React, TypeScript, Vite, Tailwind CSS, shadcn/ui and Recharts.

### API endpoints used by the frontend

| Endpoint | Description |
|---|---|
| `GET /spot-prices` | Hourly prices, by default from 24 h ago to 36 h ahead. Optional `from`, `to` (ISO 8601, max 7 days). |
| `GET /spot-prices/cheapest?hours=2` | Cheapest consecutive window of 1–6 hours from the current hour onwards. `window` is `null` if there isn't enough data. |

All times are UTC (ISO 8601) and prices are in c/kWh. The frontend always displays times in `Europe/Helsinki`.

## Frontend (`spotalarm/`)

### Requirements

- Node.js 20 or newer (developed on 22) and npm

### Setup

```bash
cd spotalarm
npm install
cp .env.example .env.local   # then set VITE_API_URL
```

`.env.local` (git-ignored):

```
VITE_API_URL=https://<api-id>.execute-api.eu-north-1.amazonaws.com
```

Vite reads env files from the `spotalarm/` folder, not from `src/`. The value is baked into the built JavaScript, so it's public. Never put secrets in it.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server at http://localhost:5173 |
| `npm run check` | Type check + lint |
| `npm run build` | Type check and production build into `dist/` |
| `npm run preview` | Serve the built `dist/` locally |

In development, API calls go through the Vite dev server proxy (`/api/*` → `VITE_API_URL`), so CORS doesn't matter locally. The production build calls the API **directly from the browser**, so the API must allow the site's origin (see [CORS](#cors-required-before-going-live) below). Until that's done, `npm run preview` will also fail to load data.

### Project structure

```
spotalarm/
├── public/                 Copied into dist/ as-is
│   ├── .htaccess           Apache/cPanel config: caching, HTTPS, compression
│   ├── favicon.svg / favicon.ico      Browser tab icons (SVG + 16/32/48 px ICO fallback)
│   ├── apple-touch-icon.png           iOS home screen icon (180 px)
│   ├── icon-192.png / icon-512.png / icon-maskable-512.png   Android / PWA icons
│   └── site.webmanifest    App name, colors and icons for "Add to home screen"
├── src/
│   ├── components/         Page sections (cards, chart, hourly list)
│   │   └── ui/             shadcn/ui components (generated, add more with `npx shadcn add`)
│   ├── hooks/useSpotData.ts   Data fetching hooks (loading / error / retry)
│   ├── lib/api/            API client: apiContext.ts (fetch wrapper), spotPriceHandlers.ts
│   ├── lib/format.ts       Finnish time and number formatting
│   ├── lib/prices.ts       Pure helpers: group by day, current hour, stats
│   ├── pages/LandingPage.tsx
│   └── types/api.ts        API response types
├── .env.example
└── vite.config.ts          Dev proxy, path alias, relative base for deployment
```

## Deployment (cPanel, static hosting)

The frontend is a fully static site. There's no server-side code, so any cPanel/Apache (or LiteSpeed) host works.

### 1. Build

```bash
cd spotalarm
npm run check
npm run build
```

The build stops with an error if `VITE_API_URL` is not set. The output in `dist/` looks like this:

```
dist/
├── .htaccess        ← hidden file, remember to upload it too
├── favicon.svg, favicon.ico, apple-touch-icon.png, icon-*.png, site.webmanifest
├── index.html
└── assets/          ← hashed JS, CSS and font files
```

### 2. Upload

Upload the **contents** of `dist/` (not the `dist` folder itself):

- **Domain root:** into `public_html/`, or the document root of the (sub)domain
- **Subfolder:** e.g. into `public_html/spotalarm/`. This works without changes, because the build uses relative asset paths (`base: './'`).

With cPanel **File Manager**, it's easiest to zip the contents of `dist/`, upload the zip, and use *Extract*. File Manager hides dotfiles by default; enable *Settings → Show Hidden Files* to confirm that `.htaccess` is there. With **FTP/SFTP**, make sure your client transfers hidden files.

When redeploying, delete the old `assets/` folder first. The file names change on every build, so old files would otherwise pile up.

### 3. What `.htaccess` does

- **Forces HTTPS.** Remove that block if the host already redirects.
- **`index.html` is never cached** (`no-cache`), so visitors get new versions immediately.
- **Hashed assets are cached for a year** (`immutable`). That's safe because their names change on every build.
- **gzip compression and basic security headers.** Every block is wrapped in `<IfModule>`, so a missing Apache module doesn't break the site.

### CORS (required before going live)

The browser blocks API responses unless API Gateway returns an `Access-Control-Allow-Origin` header that matches the site's origin. **Right now the API returns no CORS headers at all**: preflight `OPTIONS` requests get `204` with no CORS headers, even for `http://localhost:5173`. That usually means CORS is configured but no allowed origin matches. A common cause is a trailing slash (`https://example.fi/`), or the wrong scheme or port.

Set the CORS configuration of the HTTP API (in the console: API Gateway → the API → CORS, or in CDK `corsPreflight`):

| Setting | Value |
|---|---|
| Allowed origins | `https://<your-domain>` (exact origin: scheme + host, no path, no trailing slash) and `http://localhost:5173` for local preview. Add `https://www.<your-domain>` too if the site is reachable via both. |
| Allowed methods | `GET`, `OPTIONS` |
| Allowed headers | `content-type` |
| Max age | e.g. `86400` |

The origin is just the domain, even if the app is in a subfolder (`https://example.fi/spotalarm/` → origin `https://example.fi`).

Verify from a terminal. The response must contain `access-control-allow-origin`:

```bash
curl -s -D - -o /dev/null -H "Origin: https://<your-domain>" \
  https://<api-id>.execute-api.eu-north-1.amazonaws.com/spot-prices
```

### Checklist

- [ ] CORS allows the production origin (curl check above)
- [ ] `VITE_API_URL` set in `spotalarm/.env.local`
- [ ] `npm run check` and `npm run build` pass
- [ ] Contents of `dist/` uploaded, including `.htaccess`
- [ ] Site opens over HTTPS, prices load, no CORS errors in the browser console
- [ ] Hard refresh after a redeploy shows the new version

### Troubleshooting

| Symptom | Likely cause |
|---|---|
| "Verkkovirhe: rajapintaan ei saatu yhteyttä." and a CORS error in the console | CORS doesn't allow the site's origin (see above) |
| Blank page, 404s for `assets/*.js` | Uploaded the `dist` folder itself instead of its contents, or `assets/` is missing |
| 500 Internal Server Error | The host doesn't allow some `.htaccess` directive. Try removing the HTTPS block, or `Options -Indexes` |
| Old version still showing | Browser cached `index.html` from before `.htaccess` was in place. Do a hard refresh once |
| Build fails: `VITE_API_URL is not set` | Create `spotalarm/.env.local` from `.env.example` |
