# Visitor Management — Phase Tracker

Build one phase at a time. Update status here after each phase ships.

| Phase | Name | Status | Notes |
|------:|------|--------|-------|
| 1 | Foundation | **Done** | Frappe app layers + React SPA at `/vms` (built assets). Separate PWA deferred to Phase 12. |
| 2 | Authentication | **Done** | Frappe session + OTP (`react_api.auth`). SMS via MSG91; OTP returned in `developer_mode` if SMS missing. |
| 3 | Master Data | **Done** | Org→Site→Building→Tower→Floor→Unit, VMS Department, Security Shift. Employees = ERPNext Employee. Desk only. |
| 4 | Visitor Registration | **Done** | Extended Visitor Entry (location + times + host Employee). APIs: `react_api.visitor` + `settings.get_masters`. Submit → Pending Approval. |
| 5 | Host Approval | **Done** | Approve / Reject / Transfer for host or System Manager. Desk buttons + `react_api.approval`. Realtime event only (no SMS/push). |
| 6 | QR Gate Pass | **Done** | Fields on Visitor Entry; auto QR on Approve; public `/vms/pass/<token>`; 24h / expected_exit expiry. |
| 7 | Security Check-In | **Done** | QR validate → Checked In; optional live photo; Desk Gate button; System Manager only for now. |
| 8 | Meeting Tracking | **Done** | Host Meeting Started / Completed; timestamps; status → Meeting Done; Desk + `react_api.meeting`. |
| 9 | Checkout | **Done** | Gate Check Out from Checked In / Meeting Done; duration; QR or Desk; System Manager. |
| 10 | Overstay Engine | **Skipped** | Deferred; revisit after Dashboard. |
| 11 | Dashboard | **Done** | Desk Workspace + Number Cards/Chart; React `/vms` KPIs + 7-day trend + queues; Site/Building/date filters; realtime `vms_visitor_update`; any logged-in user. |
| 12 | Mobile PWA | **Done** | `/vms/m` mobile shell; Host+Security+Visitor; bottom tabs; PWA manifest+SW; manual gate token; SOS deferred. |
| 13 | Notification Engine | Pending | FCM + SMS + Email |
| 14 | Emergency Module | Pending | SOS |
| 15 | Analytics & Reports | In progress | Script Reports — scoping |
| 16 | Production Deploy | Pending | Nginx + SSL + builds |

## Already in the app

- DocTypes: `Visitor Entry` (Phase 4: location hierarchy, expected times, host Employee, Pending Approval), `Vehicle Type`, `Visit Purpose Type`, `ID Proof Type`
- Phase 3 masters: `Organization`, `Site`, `Building`, `Tower`, `Floor`, `Unit`, `VMS Department`, `Security Shift`
- Employees / hosts: ERPNext **Employee** + **User**
- APIs: `react_api.visitor.*`, `react_api.approval.*`, `react_api.settings.get_masters`
- SMS helper: MSG91 via `utils/sms.py` + Frappe SMS Settings
- OTP: `services/otp_service.py` (shared by Desk Visitor Entry + React login)
- Auth: `react_api.auth` + `auth/session.py`
- SPA: `frontend/` → `public/frontend/` → route `/vms` (login at `/vms/login`)
- **UI/UX source of truth:** [`DESIGN.md`](./DESIGN.md) + `frontend/src/styles/tokens.css` (Red / Pink / Poppins)

## Auth decision (Phase 2)

- [x] A) Frappe session + OTP (recommended)
- [ ] B) Custom JWT + OTP

## Master data decisions (Phase 3)

- [x] Core hierarchy + Department + Shift
- [x] ERPNext Employee (Link)
- [x] Desk DocTypes only (React admin later)
