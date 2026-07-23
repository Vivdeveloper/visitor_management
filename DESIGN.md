# GatePass — Product & Design System

**Follow this before any PWA UI work.**

Brand feel: **GatePass Visitor Management** — clean mobile ops app (security + host + visitor).

---

## 1. Surfaces (PWA only)

Primary product is the **mobile PWA** at `/vms`. Desk Form remains for admin data entry.

### Bottom navigation
```
Home · Check-in · Scan QR (center FAB) · Inside · History
```

### Screens
| Screen | Purpose |
|--------|---------|
| **Dashboard (Home)** | Visitors inside, today’s KPIs, pending alerts, recent inside, quick actions |
| **New Check-in** | Register visitor → auto gate pass on check-in |
| **Scan QR** | Validate / check-in / check-out by pass |
| **Inside Visitors** | Currently on premises (Checked In / Approved / Meeting Done) |
| **History** | Completed / checked-out visits |
| **Approvals** | Host: Pending / Approved / Rejected (from Checked In → Approved) |
| **Visitor Pass** | Public QR pass card |
| **Check-out** | Exit after Meeting Done |
| **Profile** | User, settings, logout |

### Status flow
```
Pending Approval → Checked In → Approved → Meeting Done → Checked Out
```
Gate pass is generated **automatically on Check-in**.

---

## 2. Design tokens

| Token | Role | Value |
|-------|------|-------|
| Primary | Brand / headers / CTA | **Indigo** `#4F46E5` |
| Primary deep | Gradient end | **Violet** `#7C3AED` |
| Gradient | Hero cards / primary buttons | `linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)` |
| Success | Approve / Inside / Check-out | **Green** `#16A34A` |
| Danger | Reject / Logout | **Red** `#DC2626` |
| Warning | Pending / alerts | **Orange** `#F59E0B` |
| Surface | Cards | **White** `#FFFFFF` |
| Background | Page | **Soft Gray** `#F5F7FB` |
| Text | Headings / body | **Slate** `#0F172A` |
| Muted | Secondary copy | `#64748B` |
| Border | Dividers | `#E2E8F0` |

**Typography:** Poppins (all UI)

**Cards:** Radius `14–18px`, soft shadow `0 8px 24px rgba(15, 23, 42, 0.06)`

**Do not** revert to the old red/pink palette unless this file is updated again.

---

## 3. Implementation

- Tokens: `frontend/src/styles/tokens.css`
- Shell + PWA styles: `frontend/src/styles/index.css`
- After UI changes: `cd frontend && npm run build`
