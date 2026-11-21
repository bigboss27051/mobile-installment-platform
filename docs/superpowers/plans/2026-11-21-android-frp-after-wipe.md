# Android FRP after factory reset (lab + shop ops)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Treat **Factory Reset Protection (FRP)** as a first-class enrollment blocker after wipe. Document lab/shop SOP, surface copy in Merchant Web / recovery flows, and never claim the platform can bypass Google FRP.

**Lab trigger (2026-11-21):** Xiaomi Pad 6 had been enrolled as Device Owner (`com.mip.dpc`). After factory reset, Setup Wizard presented **FRP** (previous Google account verification) before QR Device Owner could run again. Device Owner **does not survive** ordinary wipe; FRP can **block re-provision** until the prior account unlocks the device.

**Architecture:** FRP is owned by Google/OEM account protection, not our DPC. Our stack only: (1) warn before wipe, (2) guide unlock with the **same Google account that was on the device**, (3) issue a new short-lived enrollment session / QR after FRP is cleared, (4) audit `REENROLL` / recovery. Optional later: Zero-touch / OEM reseller FRP exemption for pre-registered SKUs (D-049) — **BLOCKED** without reseller proof.

**Out of scope / forbidden:** remote FRP bypass, Play Protect disable as SOP, wiping as collections punishment, claiming one QR survives wipe, storing Google passwords.

## File map

| File | Responsibility |
|------|----------------|
| `docs/device-management/FRP-AND-REENROLL.md` | Canonical SOP (lab + shop) |
| `docs/device-management/lab-evidence/2026-11-21-xiaomi-pad6-dpc-do.md` | Record FRP hit after wipe |
| `docs/device-management/HUMAN-OPS-NOW.md` | Ask-before-wipe + FRP unlock steps |
| `docs/device-management/ENROLLMENT-WIZARD-MOCKUP.md` | Wizard copy when FRP screen appears |
| `docs/project-management/RISK-REGISTER.md` | New FRP risk row |
| `docs/project-management/DECISION-LOG.md` | Accept “no remote FRP unlock” |
| `docs/roadmap/CURRENT-PHASE.md` / `TASK-BACKLOG.md` | Gate + task IDs |
| Merchant Web enroll / recovery UI (later) | Staff-facing FRP checklist before “issue QR again” |
| Backend recovery session types (later) | `REENROLL` after FRP cleared; no wipe command from arrears |

## Tasks

### Task 1: Capture lab finding

- [x] Append Pad 6 evidence: factory reset → FRP before re-QR; DO gone after wipe
- [ ] Note which Google account was historically on the unit (lab owner only; do not commit secrets)
- [ ] Confirm recovery path that worked (sign-in with prior account vs OEM support vs new FRP-free unit)

### Task 2: Canonical SOP doc

- [x] Add `docs/device-management/FRP-AND-REENROLL.md` covering:
  - When FRP appears (GMS device that previously signed into a Google account)
  - Lab rule: prefer **FRP-free** stock (never personal Google before first DO), or keep the lab Google credentials available
  - Shop rule: before wipe/re-enroll, staff confirm customer can unlock FRP **or** unit is new/never personal-accounted
  - After FRP unlocked → Wi-Fi → 6-tap → **new** QR (old token invalid / expired)
  - DO check-in + activate/bind as usual
  - Zero-touch / FRP exemption = optional future; mark BLOCKED without proof
- [x] Link from `ANDROID-ENROLLMENT.md`, `HUMAN-OPS-NOW.md`, `DEVICE-PROVISIONING-ENROLLMENT.md`

### Task 3: Risk + decision

- [x] Risk register: FRP blocks re-enroll after customer/staff wipe; mitigation = SOP + REENROLL UX; severity High
- [x] Decision Log: platform **does not** unlock FRP remotely; recovery is Google account + new enrollment session
- [x] Move OPEN-DECISIONS “Factory-reset re-enrollment (Zero-touch / OEM / FRP)” to “SOP documented; ZT still pending”

### Task 4: Product / UI copy (thin)

- [x] Merchant enroll page: after “device wiped”, show FRP checklist before rotating QR
- [x] Enrollment wizard mockup: FRP screen branch (cannot continue to QR until unlocked)
- [x] No API that claims `CLEAR_FRP` / wipe-from-arrears (rule in D-060 / SOP)

### Task 5: Backend recovery (only if Task 2–4 done)

- [ ] Ensure recovery / `REENROLL` session path exists and is audited (reuse enrollment types if already present)
- [ ] Tests: expired token after wipe; new session required; tenant isolation
- [ ] Do **not** auto-issue restrictive lock commands while session ≠ completed post-reenroll

### Task 6: Lab re-prove (ask before wipe)

- [ ] After FRP cleared on Pad 6 (or on FRP-free spare): full QR → DO → check-in → agent token
- [ ] Update lab-evidence; still no production claim

## Acceptance

- Staff docs answer “saw FRP after reset — what now?” without inventing a bypass
- Backlog has an explicit FRP task; CURRENT-PHASE lists FRP as a gate for wipe re-tests
- Lab evidence records the Pad 6 FRP encounter
- No code path or SOP that disables Play Protect or remote-clears FRP
