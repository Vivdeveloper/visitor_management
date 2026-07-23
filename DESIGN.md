# VMS Product & Design System

**Follow this before any UI work** (desktop, tablet, mobile).

Reference feel: Linear · Notion · Stripe · Framer dashboards — clean, spacious, minimal chrome.

---

## 1. Surfaces

### Landing Dashboard (Desktop)
- KPI cards, charts, graphs
- Left sidebar + top search
- Notifications + user profile
- Visitor analytics, tables, quick actions

### Visitor Management (workflow)
```
Invite → Registration → Approval → QR → Gate Check-in → Check-out
```
Use ERPNext Workflow where possible.

### Admin modules
Client Management · Organization · Buildings · Floors · Units · Employees · Visitors · Security Guards · Devices · Licenses · Subscriptions · Emergency Contacts · Reports · Analytics

### Tablet mode
Reception · Self Check-In · Photo · Badge print · QR scan · OTP · Digital signature

### Mobile app (Phase 12)
Employee login · Visitor pass · QR · Approval · History · Emergency SOS · Notifications · Profile · Settings

---

## 2. Design tokens

| Token | Role | Value |
|-------|------|-------|
| Primary | Brand / CTA | **Red** `#E11D48` |
| Secondary | Accents / soft UI | **Pink** `#F472B6` |
| Surface | Cards / panels | **White** `#FFFFFF` |
| Background | Page | **Light Gray** `#F4F4F5` |
| Text / navy | Sidebar, headings | **Dark Navy** `#0F172A` |
| Muted text | Secondary copy | `#64748B` |
| Border | Dividers | `#E4E4E7` |

**Typography:** Poppins (all UI)

**Cards:** Large border radius (`16–20px`), minimal shadow

**Do not** invent a different palette (no green/purple themes) unless the user changes this file.

---

## 3. Implementation

- CSS variables: `frontend/src/styles/tokens.css`
- Shell styles: `frontend/src/styles/index.css`
- After UI changes: `cd frontend && npm run build`
