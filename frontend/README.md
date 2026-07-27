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

**Mobile PWA:** open `/vms/` on Chrome/Edge (Android) or Safari (iOS).  
- Manifest + icons under `/assets/visitor_management/frontend/`  
- Service worker: `/vms_sw.js` (scope `/vms/`) — installable home-screen app  
- **Download App** button on Welcome + More (Profile) triggers the browser install prompt (or iOS Add to Home Screen steps)

Then hard-refresh the browser (or `bench clear-cache`). On deploy, commit the built `public/frontend` files (or run `npm run build` in your CI) so the live site works without a Node server.

**If your live site runs on another bench** (e.g. `frappe15` while you edit in `frappe16`):

```bash
cd apps/visitor_management/frontend
npm run build:sync-frappe15
```

This builds here and copies `public/frontend`, `www/vms_sw.js`, and `www/vms.html` into the other bench’s `visitor_management` app. Then hard-refresh `/vms/` (the PWA service worker auto-reloads when a new build is detected).

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
