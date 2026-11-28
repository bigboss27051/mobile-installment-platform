# Changelog

## Unreleased

### Added

- **Shop setup checklist (D-079):** Merchant Web **ตั้งค่าร้าน** records four Android attestations per tenant, including that the shop can unlock FRP with its own Google account. No email or password is stored. Android session create and Android QR return `SHOP_SETUP_REQUIRED` until the row is ready. iOS is unchanged.
- **RBAC branch scope + ops hardening (D-071):** `UserBranchAssignment`; STAFF inventory scoped by `branchIds`; OWNER `GET/PUT /api/v1/staff/:userId/branches`; Nest throttler on login/OTP; `GET /api/v1/health/ready`; `OPS-HARDENING-CHECKLIST.md` + `PDPA-OFFBOARDING-CHECKLIST.md`
- **Android shop software pack (D-070):** DPC `lab`/`shop` flavors; `GET /api/v1/devices/enrollment/dpc-config-status`; Merchant Web enroll preflight; `SHOP-FLOOR-ANDROID-RUNBOOK.md`; checksum script outputs Android base64url
- **Stripe PromptPay (D-069):** `StripePaymentAdapter`, `PAYMENT_PROVIDER=stripe`, webhook `/webhooks/payments/stripe`; Merchant Web + Customer Flutter prefer `imageUrlPng` / hosted URL; CI default remains sandbox
- **OTP SMS port stub:** `OTP_CHANNEL=sandbox|sms` + `BlockedSmsAdapter` (`SMS_OTP_BLOCKED`)
- **Ops / DPC / legal packs:** `backend/Dockerfile`, `docs/operations/PRODUCTION-DEPLOY.md`, `DPC-HOSTING-CHECKLIST.md`, `scripts/dpc-apk-checksum.sh`, FRP shop-floor SOP, `LEGAL-COUNSEL-PACKET.md`
- **R2 Android lab closeout (D-068):** recovery types `REPLACE` / `UNENROLL` / `RELEASE` / `CONTRACT_CLOSE` (plus existing `REENROLL`); Merchant Web `DeviceRecoveryPanel`; CURRENT-PHASE marks Android lab COMPLETE (iOS / production DO still BLOCKED)
- Merchant Web **MUI adapter UI**: `ThemeProvider` + compact enterprise theme; `./ui` primitives reimplemented with Material UI; presentation-only — no `/api/v1`, auth, RBAC, or handler changes
- Design spec `docs/superpowers/specs/2026-11-22-merchant-web-mui-adapter-ui-design.md` and plan `docs/superpowers/plans/2026-11-22-merchant-web-mui-adapter-ui.md`
- Decisions **UI-MUI-001…UI-MUI-006**: MUI stack (merchant-web only), full app scope, compact density + MIP tokens, adapter kit preserving `./ui` exports, logic freeze, no hybrid CSS+MUI on pages

- Stock units may be received with a 15-digit IMEI or a serial number. Wi-Fi-only devices do not need an IMEI.
- DPC check-in: `POST /api/v1/devices/enroll/check-in` for a hashed `enc_` token, and `apps/android-dpc` reads QR extras then posts that call. Hardware check-in is not run. Not production Device Owner.
- D-057 custom DPC + QR Device Owner as Android implementation; D-058 `QR_GENERATED` + business vs platform lock
- Architecture: `docs/architecture/android-dpc-architecture.md`, `android-qr-provisioning.md`, `android-kiosk-locking.md`, `device-lock-state-machine.md`, `payment-to-unlock.md`
- `docs/device-management/PRODUCTION-FEASIBILITY.md`, `MERCHANT-DEVICE-DASHBOARD.md`
- R2 Phases 1–7 with recalculated estimates in Master Execution Plan

### Added (earlier)

- IOS-A architecture: vendor MDM (not self-hosted protocol), Model B, Single App Mode lock (D-056); docs under `docs/architecture/ios-*.md`, setup, and iOS lock test plan
- IOS-B mp_pay lock customer UI in `apps/customer-mobile` (preview + `GET /api/v1/me/lock-status`); sandbox `MdmProviderPort` (commands never auto-ack as locked)
- Phase 3a RBAC: permission codes + `PermissionsGuard` on application decide, contract activate, device enroll/activate/bind/unbind (OWNER has unbind; STAFF does not)
- Operator packet for human AMAPI submit + hardware shopping list (`docs/device-management/OPERATOR-PACKET.md`); live form URL `https://services.google.com/fb/forms/AMAPIUsageInquiry/`
- Merchant Web enterprise form UI: local `apps/merchant-web/src/ui/` primitives, dark left sidebar shell, stacked form+table pages (login, products, inventory, customers, applications, contracts, enroll)
- Design spec `docs/superpowers/specs/2026-11-14-merchant-web-enterprise-form-ui-design.md` and plan `docs/superpowers/plans/2026-11-14-merchant-web-enterprise-form-ui.md`
- Human-ops pack: `HUMAN-OPS-NOW.md`, MDM vendor shortlist, D-051 legal draft (incl. 30-day leave Remote Management)
- DM2 stub: activate / bind-contract / unbind-contract APIs (tenant isolation, IMEI match, idempotency, audit+reason; no AMAPI/Apple HTTP)
- Merchant Web enroll page: create session + show stub QR from API
- Google AMAPI usage inquiry draft (`docs/device-management/GOOGLE-AMAPI-USAGE-INQUIRY.md`)
- DM1 safe-scope freeze (`docs/device-management/DM1-SAFE-SCOPE.md`)
- DM1 stub: `device_enrollment_sessions` + staff enrollment session APIs (hashed tokens, QR without Wi-Fi secrets, tenant isolation tests; no AMAPI)
- Master Execution Plan index (`docs/project-management/MASTER-EXECUTION-PLAN.md`)
- Device Provisioning & Enrollment documentation under `docs/device-management/` (workflows, Android/iOS, tenancy models, open decisions, video observations)
- Device Enrollment API draft (`docs/api/DEVICE-ENROLLMENT-API.md`)
- Design spec `docs/superpowers/specs/2026-11-14-device-provisioning-enrollment-design.md`
- Cursor rule `.cursor/rules/ios-mdm-standards.mdc`
- Reference media index `docs/reference/README.md` (existing `mango_android.mp4` / `mango_ios.mp4`)
- Enrollment entities in database design (sessions, profiles, activations, bindings, management accounts, recovery)

### Changed

- Merchant Web spacing: page max 1200px, form grid 720px, login 420px; `--mip-space-1…7`; 768px-only breakpoint; section padding 16px
- Decisions **UI-001…UI-007**: full Merchant Web restyle; dark sidebar; shared UI without RHF/Zod this pass; stacked pages; local `src/ui/` (not `@mip/ui` yet); layout tokens locked 2026-11-14
- R2 Device expanded from “DPC + MDM adapter” to a provisioning & enrollment platform sliced **DM0–DM5**
- Current phase: next work is **DM0 feasibility**, not enrollment implementation
- Decisions D-041..D-048; risks R-013..R-020
- Product/architecture/API/security/test/Cursor rules cross-references updated
- Android: Play Protect disable is **not** required; QR must not contain secrets
- iOS: Model A vs B pending; do not require skipping Apple ID/passcode/location
- **2026-11-14 later:** D-042 AMAPI; D-043 Model B + vendor MDM + Configurator iPhone; D-049 QR + reseller Zero-touch; D-050 enroll mandatory; D-051 legal copy after mockups; D-052 GMS/matrix SKUs only
- Wizard mockup + DM0 lab protocol added
- DM0 desk lab: feasibility report, AMAPI policy map, empty hardware matrix, physical runbook; **D-054** AMAPI ToS vs EMI lock

### Unchanged

- R0/R1 delivery status, installment math, PromptPay sandbox, modular monolith, 5-level enforcement *intent*, Lost Mode prohibition, adapter pattern

### Pending

- D-054 Google AMAPI exception; hardware SKU lab; MDM vendor SKU; legal copy (D-051)

### Notes

- DM1/DM2 application stubs exist. Production Device Owner / MDM / AMAPI lock remain unclaimed.

### Added (prior unreleased)

- Phase 0 product discovery documentation set
- Decision log, risk register, backlog, release plan
- Architecture and database drafts
- API standards
- Cursor rules/agents stubs (when present)
- R1a inventory design spec and implementation plan (`docs/superpowers/specs/`, `docs/superpowers/plans/`)
- Backend catalog module: product and variant create with `Decimal` price (THB)
- Backend inventory module: IMEI receive, transfer, reserve, release; movement audit
- R1b customer module: create/read customer profiles with encrypted national ID and tenant-unique phone
- R1b KYC module: case creation, document upload via storage port, submit flow, and OCR sandbox adapter
- R1b staff review flow: approve/reject/pending transitions with auditable review actions
- R1c installment plans: per-tenant seed data and read-only listing for application intake
- R1c application module: DRAFT create/list/get, submit gating on APPROVED KYC, and decision/cancel actions
- R1c scorecard rails: pure-function advisory scoring (`r1c-v1`) persisted on submit
- R1d contract schema rails: draft contract entities, status lifecycle, and open-application uniqueness guard
- R1d schedule rails: pure-function `r1d-v1` flat/reducing installment schedule generation
- R1d contract APIs: create/list/get DRAFT from APPROVED applications, plus activate/cancel transitions
- R1e payment schema: intents, transactions, allocations, ledger entries; schedule `amountPaid` + PARTIAL/PAID
- R1e FIFO allocate helper and sandbox `PaymentGatewayPort` with HMAC-SHA256 webhook verify
- R1e payments APIs: staff idempotent intent create/get; sandbox webhook allocate + installment ledger
- REST: `/api/v1/products`, `/api/v1/inventory/*`, `/api/v1/customers`, `/api/v1/kyc/*` with JWT tenant scope
- REST: `/api/v1/installment-plans`, `/api/v1/applications` with JWT tenant scope
- REST: `/api/v1/contracts` with JWT tenant scope
- REST: `/api/v1/contracts/:id/payment-intents`, `/api/v1/payment-intents/:id`, `/api/v1/webhooks/payments/sandbox`
- E2E: cross-tenant inventory denial and stock flow (receive → transfer → reserve → release)
- E2E: cross-tenant customer/KYC denial and KYC submit/review flow
- E2E: cross-tenant application denial and submit/decision IMEI state transitions
- E2E: cross-tenant contract denial plus activate/cancel IMEI state invariants
- E2E: payment intent idempotency, signed webhook FIFO allocate/replay, and cross-tenant intent denial

- R1f customer OTP sandbox auth (`/auth/customer/otp/*`) and public tenant slug lookup
- R1f customer portal APIs: `/me/contracts`, `/me/contracts/:id/payment-intents`
- Merchant Web (`apps/merchant-web`) critical paths against real APIs
- Customer Android (`apps/customer-mobile`) OTP login, contracts, PromptPay QR
- CI jobs for merchant-web Vitest and Flutter unit tests

### Changed

- README updated to point at discovery docs
- `CURRENT-PHASE` and project status: **R1f complete**; next = R2 Device
- R1e exit criteria recorded as met; backend-only sandbox payments — no live Omise, refunds, UI, or device unlock claimed

### Decisions

- See `DECISION-LOG.md` D-001..D-040 (R1f D-036..D-040)
