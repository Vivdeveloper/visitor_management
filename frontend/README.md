# Visitor Management Frontend

React + TypeScript (Vite) SPA for the Frappe `visitor_management` app.

## How it works (same as viv_crm)

| Mode | What you do | URL |
|------|-------------|-----|
| **Normal / live** | Build once, start bench | `https://yoursite/vms` |
| **Optional HMR** | `npm run dev` while coding UI | `http://localhost:5173` |

You do **not** need `npm run dev` for bench or production. Built files live in:

```text
visitor_management/public/frontend/
  vms-app.js
  vms-asset-index.css
  …
```

Frappe serves them at `/assets/visitor_management/frontend/…` via the www page `vms`.

## After frontend code changes

```bash
cd apps/visitor_management/frontend
npm install          # first time / when deps change
npm run build        # also copies PWA sw/manifest into www/
```

**Mobile PWA:** open `/vms/m` (installable). Manifest + service worker ship under `/assets/visitor_management/frontend/`.

Then hard-refresh the browser (or `bench clear-cache`). On deploy, commit the built `public/frontend` files (or run `npm run build` in your CI) so the live site works without a Node server.

## Optional local Vite (hot reload only)

```bash
cd frontend
npm run dev
```

API calls proxy to your bench site (`/api`, `/assets`, …).

## Call pattern

```text
POST /api/method/visitor_management.react_api.<module>.<method>
```

See `src/api/vms.ts`.
