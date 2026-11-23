# Android Lab Completeness (Approach A) Design

**Date:** 2026-11-22  
**Status:** Implemented (lab software; unit acceptance)  
**Parent:** R2 Device Provisioning & Enrollment (Android lab)  
**Depends on:** Phase 3a–3g DPC lab, Phase 4a–4d backend ladder, R1f customer Flutter critical path  
**Scope choice:** User approved **Approach A** (DPC + Customer Flutter; no FCM / WorkManager / production DO)

## Goal

Close the remaining **lab-completeness** gaps so Android presentation matches the shared state machine and the customer app can pay the real outstanding balance while showing platform lock status clearly.

| Track | Outcome |
|-------|---------|
| **DPC** | `REMINDER` shows an overdue notification without restricting the device; LOCK UI offers emergency dial |
| **Customer Flutter** | Pay with contract outstanding (not hardcoded `100.00`); lock status from `/me/lock-status` is a first-class path after login |
| **Docs** | DPC README matches lab reality (`0.1.17-lab`); CURRENT-PHASE notes this slice |

## Non-goals

- FCM / WorkManager background poller (Approach B)
- Live Omise / SMS OTP / Merchant Mobile
- iOS MDM / Single App Mode (held)
- Zero-touch / multi-SKU hardware matrix / production Device Owner or financing claims
- `SHOW_REMINDER` command enqueue from backend (4d already sets desired+audit only; DPC reacts to **policy GET / recovery**, not a new command type in this slice)
- Merchant threshold UI / human approval / external alerting

## Decisions

| ID | Decision |
|----|----------|
| A-1 | REMINDER on device = notification only; no package suspend, no Lock Task, no soft location (still gated by D-061) |
| A-2 | Emergency under LOCK = explicit dialer intent from `MangoLockActivity` (lab: `tel:112`); keep dialer/messages unsuspended under RESTRICT |
| A-3 | Customer pay amount defaults to portal **outstanding** for that contract; user may still need server validation (existing overpay reject) |
| A-4 | Flutter lock UI remains **presentation**; OS lock remains DPC Lock Task — copy must not claim OS lock from the customer app alone |
| A-5 | Bump DPC `versionName` to `0.1.17-lab` |

## DPC behavior

### REMINDER

When `PolicyRecovery.reapply` (or equivalent policy apply path used after agent `GET /devices/agent/policy`) receives `desiredPresentation=REMINDER`:

1. Clear LOCK home alias / stop lock-task path if previously LOCK (same as stepping down toward usable).
2. Ensure packages are **not** suspended (unsuspend all non-essential path used for NONE).
3. Post (or refresh) a persistent/high-priority **overdue reminder** notification via existing `POST_NOTIFICATIONS` permission and a dedicated channel (not the low-importance recovery FGS channel).
4. Return a distinct result code e.g. `REAPPLIED_REMINDER` for logs/tests.
5. Soft location remains **off** for REMINDER (D-061 unchanged).

When desired returns to `NONE`: cancel the reminder notification.

### LOCK emergency

On `MangoLockActivity`:

- Keep Lock Task Mode behavior.
- Add a clear **Emergency call** control that starts `ACTION_DIAL` or `ACTION_CALL` with `tel:112` (prefer `ACTION_DIAL` so user confirms; document that true `CALL_PHONE` may need permission — lab default **DIAL**).
- Do not block emergency by omitting dialer from RESTRICT allowlist (already required).

### Version / README

- `versionName = "0.1.17-lab"`
- README: describe check-in, command poll, Lock Task, suspend, heartbeat, location gate, REMINDER notification, emergency dial — and **explicitly** “lab only; not production Device Owner / financing approval”.

## Customer Flutter behavior

### Outstanding pay

- Extend portal contract detail (backend) to include `outstandingBalance` (same computation as lock-status / payments outstanding helper) **or** compute from schedule on client if already authoritative — **prefer backend field** for one source of truth with pay API.
- Contract detail UI: primary CTA pays `outstandingBalance` when `> 0`; disable or hide when zero.
- Keep “Not paid until webhook succeeds” / `isServerConfirmedPaid` behavior.
- Unit/widget tests for amount selection and paid gate.

### Lock status path

- After OTP login, surface **Device / lock status** entry (existing `ApiLockRepository` + `LockShell`) more prominently (e.g. home action or contracts app bar already present — strengthen copy + empty states).
- Keep **Lock screens (preview)** for offline UI fixtures.
- Ensure REMINDER maps to overdue screen; disclaimer that OS enforcement is DPC/MDM when applicable (`osEnforcement` / platform fields).

### Out of Flutter scope this slice

Secure storage for token, full redesign, Thai i18n pass, live payments.

## Backend

- Add `outstandingBalance` (string money) to `GET /api/v1/me/contracts/:id` response; reuse existing outstanding computation used by payments / lock-status.
- No new device command types required for REMINDER.
- Portal unit test for outstanding on contract detail.

## Acceptance

| # | Criterion |
|---|-----------|
| 1 | DPC unit: `REMINDER` → `REAPPLIED_REMINDER` / does not call suspend or start lock-task; `NONE` clears reminder channel id helper |
| 2 | DPC unit or small helper test: emergency dial URI is `tel:112` |
| 3 | Flutter test: create-intent uses outstanding when present; zero outstanding does not create pay of 100 |
| 4 | Portal test: contract detail includes `outstandingBalance` |
| 5 | Docs: this spec + CURRENT-PHASE + DPC README + backlog note; no production DO claim |

## Risks

| Risk | Mitigation |
|------|------------|
| Android 13+ notification permission denied | Channel still created; document that REMINDER may be silent until granted; lab can grant via DO settings later |
| Customer confuses Flutter overdue UI with OS lock | Disclaimer + A-4 copy |
| Pad E2E not run this slice | Software + unit acceptance; Pad optional |

## Explicit non-claims

- Not production Device Owner, Play distribution, or commercial financing lock.
- Not multi-OEM matrix complete.
- Not SMS OTP or live PromptPay.
