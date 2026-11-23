# Decision Log

| ID | Date | Decision | Rationale | Status |
|----|------|----------|-----------|--------|
| D-001 | 2026-11-12 | Merchant self-funded receivables | Platform is software/ops; avoids lending license complexity for pilot | Accepted |
| D-002 | 2026-11-12 | Thailand-only pilot | Focus PDPA, Thai ID KYC, PromptPay | Accepted |
| D-003 | 2026-11-12 | Graduated 5-level device enforcement | Aligns with merchant collateral UX; safer than instant hard lock | Accepted |
| D-004 | 2026-11-12 | Merchant presets + custom thresholds/approvals | Different shops need different collection strictness | Accepted |
| D-005 | 2026-11-12 | Flat or reducing interest per plan | Matches real retail plan variety | Accepted |
| D-006 | 2026-11-12 | Full-stack vision; deliver via R0–R3 slices | Ambition retained without giant bang implementation | Accepted |
| D-007 | 2026-11-12 | Scorecard then merchant approve/reject | Assists risk without removing merchant control | Accepted |
| D-008 | 2026-11-12 | Dual-track discovery docs | Vision + phased scope | Accepted |
| D-009 | 2026-11-12 | Modular monolith first | Speed + consistency for early domains | Accepted |
| D-010 | 2026-11-12 | Money as DECIMAL(18,2) default (revisit satang) | Readable schedules; finalize in Phase 1 | Accepted (provisional) |
| D-011 | 2026-11-12 | R1 delivered as sub-slices; first is R1a | R1 full stack too large for one plan | Accepted |
| D-012 | 2026-11-12 | IMEI unique per tenant | Prevents duplicate stock; avoids rare cross-tenant collisions | Accepted |
| D-013 | 2026-11-12 | IMEI always branch-bound; transfer via movements | Matches multi-branch retail ops | Accepted |
| D-014 | 2026-11-12 | Product → Variant → ImeiUnit | Supports color/storage pricing | Accepted |
| D-015 | 2026-11-12 | Statuses AVAILABLE/RESERVED/SOLD/TRANSFERRED_OUT | Enables reservation before contracts | Accepted |
| D-016 | 2026-11-12 | R1a backend API only | UI deferred to R1f | Accepted |
| D-017 | 2026-11-12 | Full inventory Nest domain in R1a | Avoid schema-only dead end | Accepted |
| D-018 | 2026-11-12 | R1a authenticated tenant members without full RBAC | Defer matrix to Phase 3 continuation | Accepted |
| D-019 | 2026-11-12 | National ID encrypted + hash lookup | PDPA-minded; no plain text at rest | Accepted |
| D-020 | 2026-11-12 | OCR Port + Sandbox/Mock until credentials | Avoid inventing vendor credentials | Accepted |
| D-021 | 2026-11-12 | Customer phone unique per tenant | Practical duplicate prevention for retail | Accepted |
| D-022 | 2026-11-12 | R1b backend Customer+KYC+OCR port+manual review | UI deferred; unlocks R1c | Accepted |
| D-023 | 2026-11-12 | Object storage behind port; local/mock OK in R1b | S3 when available | Accepted |
| D-024 | 2026-11-12 | R1c Application+Scorecard; Plan seed/read-only | Defer Plan CRUD; unlock applications | Accepted |
| D-025 | 2026-11-12 | Hardcoded scorecard pure function r1c-v1 | Testable advisory scoring; bureau later | Accepted |
| D-026 | 2026-11-12 | Submit reserves IMEI; reject/cancel releases | BR-3.4 stock truth; SOLD deferred to R1d | Accepted |
| D-027 | 2026-11-12 | Application decisions OWNER/STAFF only | Align R1b; CREDIT_OFFICER with full RBAC later | Accepted |
| D-028 | 2026-11-12 | R1d backend Contract+Schedule only | UI/e-sign/payments deferred | Accepted |
| D-029 | 2026-11-12 | Contract DRAFT then ACTIVATE (SOLD) | Review schedule before committing stock | Accepted |
| D-030 | 2026-11-12 | Schedule r1d-v1 flat+reducing half-up THB | Matches BR-6 + golden tests | Accepted |
| D-031 | 2026-11-12 | Activate status+IMEI SOLD atomic | Avoid post-commit inventory drift | Accepted |
| D-032 | 2026-11-12 | R1e sandbox payments + FIFO allocate + simple ledger | Core idempotent pay path; refunds/UI later | Accepted |
| D-033 | 2026-11-12 | FIFO allocate by schedule seq with partial last item | Retail collection; multi-installment intents | Accepted |
| D-034 | 2026-11-12 | PaymentGatewayPort + Sandbox; Omise target later | PromptPay-fit; Stripe not primary | Accepted |
| D-035 | 2026-11-12 | Staff create payment intents in R1e | No customer auth yet; R1f adds customer path | Accepted |
| D-036 | 2026-11-12 | R1f critical paths only (Merchant Web + Customer Android) | Avoid scaffolding every remaining app | Accepted |
| D-037 | 2026-11-12 | Customer OTP JWT (`typ=customer`) not a User row | Reuse Customer records; isolate from staff RBAC | Accepted |
| D-038 | 2026-11-12 | Public tenant slug lookup | Customers never send tenantId | Accepted |
| D-039 | 2026-11-12 | Customers create sandbox intents for own ACTIVE contracts | Completes pay path from Android | Accepted |
| D-040 | 2026-11-12 | Sandbox OTP env code; SMS BLOCKED | No SMS vendor in pilot | Accepted |
| D-041 | 2026-11-14 | R2 is a Device Provisioning & Enrollment Platform (sessions → provision → verify → activate → bind → policy → heartbeat → recovery) | Competitor retail UX + SaaS auditability; enforcement still after enroll | Accepted (documentation) |
| D-042 | 2026-11-14 | Android management via **Android Management API** (platform EMM). Custom DPC is not the primary EMM. Companion app allowed for customer-facing status only | Stakeholder DM0 direction; Google-hosted agent; no Play Protect-off SOP | **Superseded for implementation by D-057.** Kept as AMAPI evaluation / possible future enrollment-only path |
| D-043 | 2026-11-14 | iOS **Model B**: merchant-owned Apple Business + **commercial MDM vendor** via `MdmProviderPort`. Retail enroll = **Apple Configurator on iPhone**. Follow Apple program rules (no skip passcode/Apple ID/Location; no Lost Mode collections) | Matches store ABM org name pattern; SaaS isolation; no in-house MDM protocol in R2 | Accepted (product). ABM eligibility per merchant still operational |
| D-044 | 2026-11-14 | Do not require disabling Google Play Protect | Competitor SOP is unsafe and not an official Enterprise requirement | Accepted |
| D-045 | 2026-11-14 | Enrollment QR/payloads contain no passwords, private keys, or integration secrets | Tokens hashed at rest; Wi-Fi entered on device | Accepted |
| D-046 | 2026-11-14 | Deliver R2 as DM0–DM5; production DO/MDM claims stay BLOCKED until evidence | Avoid skipping feasibility; preserve R0/R1/R3 | Accepted |
| D-047 | 2026-11-14 | Do not require skipping iOS passcode, Apple ID, or Location Services | Competitor “skip Apple ID” is not our product rule | Accepted |
| D-048 | 2026-11-14 | Keep NestJS modular monolith, REST `/api/v1`, Flutter, Prisma/Postgres; add ports not new deployables for R2 | No strong reason to change stack | Accepted |
| D-049 | 2026-11-14 | Android counter path = **QR Device Owner** (custom DPC extras per D-057; formerly AMAPI QR). **Zero-touch** used when a reseller has pre-registered the unit. Walk-in stock without ZT registration still uses QR | Stakeholder: reseller exists; ZT cannot cover unregistered same-day SKUs | Accepted (QR mechanism updated by D-057) |
| D-050 | 2026-11-14 | Device management is **mandatory** on installment device sales. Handover / “sale complete” is blocked until enrollment `COMPLETED` | Stakeholder: not an optional SKU | Accepted |
| D-051 | 2026-11-14 | PDPA/contract disclosure copy deferred; **UX mockups first** | Stakeholder sequencing | Accepted |
| D-052 | 2026-11-14 | Android “all models” means **GMS devices the merchant sells that pass the compatibility matrix**, not every Android SKU on earth. Unsupported units cannot be sold on installment | OEM fragmentation (R-002/R-015) | Accepted |
| D-053 | 2026-11-14 | Prefer **one AMAPI enterprise per tenant**; confirm Google quotas in lab | Isolation + offboarding | Accepted (provisional) |
| D-054 | 2026-11-14 | AMAPI **Permissible Usage** (2026-03-30) forbids device financing / EMI-based restriction. Production AMAPI lock-on-overdue requires Google written exception or a different stack | DM0 desk lab | **Pending** Google inquiry; do not implement lock via AMAPI until answered |
| D-055 | 2026-11-14 | Phase 3a RBAC: explicit permission codes + guard on critical mutating routes; OWNER/STAFF/SUPER_ADMIN bundles only; no new roles and no `UserBranch` yet | Incremental authz without blocking DM0 | Accepted |
| D-056 | 2026-11-14 | iOS financing lock = supervised **Single App Mode** (MDM AppLock) on the customer Flutter app. Not MDM DeviceLock, not Lost Mode, not a Flutter full-screen pretending to be OS lock. Self-hosted Apple MDM protocol stays out of R2; vendor `MdmProviderPort` only | Apple supervision rules; D-043; observable Mango Lock UX without Android kiosk APIs | Accepted (design). Lab BLOCKED |
| D-057 | 2026-11-14 | Android **implementation** = native Kotlin **custom DPC** + **Device Owner** + **Enterprise QR** (6-tap). Shared Device Lock Policy Engine; Android adapter separate from Apple MDM. AMAPI is not the lock engine (D-054). Prototype ≠ commercial financing approval | Shop UX without a PC; AMAPI Permissible Usage blocks EMI lock; reference QR flow | Accepted (architecture). Hardware + production gates BLOCKED |
| D-059 | 2026-11-16 | A stock unit is identified by **IMEI or serial**. Wi-Fi-only devices have no IMEI. Receive requires at least one. Cellular IMEI stays 15 digits | Devices without a SIM cannot be stocked under an IMEI-only rule | Accepted |
| D-060 | 2026-11-21 | After factory reset, **Google FRP** may block Setup Wizard / QR Device Owner until the **previous Google account** unlocks the unit. Platform **does not** remote-clear FRP, store Google passwords, or treat wipe as collections. Re-enroll = FRP cleared out-of-band → **new** enrollment session/QR → DO check-in. Zero-touch/OEM FRP exemption remains optional (D-049) and BLOCKED without proof | Pad 6 lab: wipe removed DO then FRP blocked re-QR; R-024/R-026 | Accepted |
| D-061 | 2026-11-21 | Soft device location **only** when desired policy is `RESTRICT` or `LOCK`: network/soft primary, GPS only if already enabled (never force on); last-known + ≤14-day arrears history; purge on `NONE` / TTL / unenroll; ingest via agent heartbeat; staff read needs `devices.location.read` + audit. Phase **3g** after 3f HTTPS. Not Lost Mode; not tracking while current; iOS out of scope | Collections assist without continuous surveillance; PDPA-minded retention; aligns with heartbeat loop | Accepted. Lab software shipped (`R2-P3-009`); Pad live sample optional |
| D-062 | 2026-11-21 | Staff **activate** after device check-in **reuses** the existing `session.deviceId` (promote to `ACTIVE` + create `device_activations`). `ALREADY_ACTIVATED` only when an activation row already exists. Do not create a second device for the check-in path | Check-in already inserts `devices`; old activate assumed empty `deviceId` and blocked bind / payment-to-unlock E2E | Accepted. Pad E2E 2026-11-21 |
| D-063 | 2026-11-21 | Phase 4b lab: overdue unpaid past-due schedule → jump desired `LOCK` + `START_LOCK_TASK` via staff `evaluate-overdue` (tenant batch). Full REMINDER/RESTRICT ladder + merchant thresholds + cron deferred | Fast Pad proof after 4a unlock; state machine ladder remains product target | Accepted (lab) |
| D-064 | 2026-11-21 | Phase 4c lab overdue cron: env `OVERDUE_EVALUATE_CRON` (unset=disabled; invalid=fail boot); per-tenant system actor `system-overdue+{tenantId}@mip.internal`; Postgres `pg_try_advisory_lock` single-flight; structured tick logs. No ladder/alerting yet | Fixes weak cron draft (missing owner, multi-instance race, silent misconfig) | Accepted (lab) |
| D-065 | 2026-11-21 | Phase 4d lab overdue ladder (fixed): overdue days from oldest unpaid past-due → ≥1 `REMINDER` (desired+audit only), ≥3 `RESTRICT`+`START_PACKAGE_SUSPEND`, ≥7 `LOCK`+`START_LOCK_TASK`. Escalate-only; step-down via 4a/staff. Replaces D-063 jump-to-LOCK. Merchant thresholds / human approval / REMINDER DPC deferred | Align evaluate/cron with state machine without settings UI yet | Accepted (lab) |
| D-066 | 2026-11-22 | **R3-P0** LINE installment comms (sandbox): per-tenant OA config, webhook verify+idempotency, customer link tokens, read-only installment replies, templated payment confirmation + manual reminder. No Unified Inbox, no pay-from-LINE, no production LINE claim. Parallel to R2 | Product needs LINE channel; full chat CRM too large; matches BR-9 / PRODUCT-SCOPE R3 | Accepted |
| D-067 | 2026-11-22 | Merchant policy settings: per-tenant ladder days + cron toggle + `requireLockApproval` (default on) with `DeviceLockApproval` queue; OWNER `devices.policy.config`; staff approve via `devices.command`. Closes Phase 4d deferred thresholds/approval | Shop-configurable collections ladder without production DO claim | Accepted (lab) |
| D-068 | 2026-11-23 | **R2 Android lab closeout:** Phases 1–4 + full recovery types (`REENROLL`/`REPLACE`/`UNENROLL`/`RELEASE`/`CONTRACT_CLOSE`) + Merchant recovery UI mark **Android lab COMPLETE**. Commercial R2 (DM5 / Phase 7), multi-SKU Zero-touch, and iOS Phases 5–6 remain BLOCKED / unclaimed without evidence | Closes software recovery gap without false production DO claim; aligns CURRENT-PHASE next = R3 / iOS BLOCKED | Accepted (lab) |
| D-069 | 2026-11-23 | **Stripe PromptPay** behind `PaymentGatewayPort` (`PAYMENT_PROVIDER=stripe`) accepted for Thailand **pilot** settlement (test or live keys). Omise/Opn remains long-term PromptPay-primary (D-034) until credentials + adapter exist. Webhook path `/webhooks/payments/stripe`. Not a claim of Omise replacement or financing-lock legal clearance | Team chose Stripe for live payment readiness; keeps sandbox default for CI | Accepted |
| UI-001 | 2026-11-14 | Merchant Web UI pass is a **full redesign** of login plus products, inventory, customers, applications, contracts, and enroll | Partial restyle would leave inconsistent staff UX; R1f presentation layer is in-app already | Accepted |
| UI-002 | 2026-11-14 | App shell is a **left sidebar** (desktop) with off-canvas drawer on narrow viewports | Matches enterprise admin navigation; keeps page content stacked and scannable | Accepted |
| UI-003 | 2026-11-14 | Forms use **shared UI primitives only**; keep existing `useState` submit (no React Hook Form + Zod in this pass) | Avoids dual form stacks while restyling; frontend RHF/Zod standard remains later | Accepted |
| UI-004 | 2026-11-14 | Sidebar visual is **dark** (`#1E293B`) with primary (`#1D4ED8`) active state | Contrast for nav vs content; tokens from approved enterprise form design | Accepted |
| UI-005 | 2026-11-14 | Create + list pages are **stacked sections** (form card, then table card) | One pattern for all list/create screens; 44px inputs; page max 1200px; form grid max 720px | Accepted |
| UI-006 | 2026-11-14 | Design system lives **locally** at `apps/merchant-web/src/ui/` (not a monorepo `@mip/ui` package yet) | One-app increment; extract a shared package only if a second web app needs the same primitives | Accepted |
| UI-007 | 2026-11-14 | Merchant Web spacing: 8-point `--mip-space-1…7` (4–48px, no 64px); page 1200 / form 720 / login 420; gutter 16/24; section pad 16; breakpoint 768 only; 2-col opt-in; table overflow-x | Grill lock 2026-11-14; amends UI-005 960px page max; Flutter/super-admin out of scope | Accepted |
| UI-MUI-001 | 2026-11-22 | Merchant Web stack = **Material UI** (`@mui/material` + Emotion) in `apps/merchant-web` only | Production-ready components without pulling a second framework into other apps | Accepted |
| UI-MUI-002 | 2026-11-22 | Scope = **full Merchant Web** (login, shell, all nav pages including devices, enroll, LINE) | Partial migration would leave inconsistent staff UX across routes | Accepted |
| UI-MUI-003 | 2026-11-22 | Density = **compact enterprise**; map existing MIP slate/blue tokens into MUI `createTheme` | Preserves approved look from UI-001…007; dense tables fit retail ops | Accepted |
| UI-MUI-004 | 2026-11-22 | **Adapter kit**: keep `./ui` export names and prop contracts; reimplement with MUI under the hood | Pages and tests stay stable; supersedes CSS-kit implementation path only | Accepted |
| UI-MUI-005 | 2026-11-22 | **Logic freeze**: no API, auth, RBAC, validations, calculations, or handler behavior changes | Presentation-only pass; limits regression while restyling | Accepted |
| UI-MUI-006 | 2026-11-22 | **No hybrid** of legacy custom CSS kit + ad-hoc MUI on pages; adapters are the single presentation surface | Avoids dual styling stacks and one-off MUI imports in route files | Accepted |
