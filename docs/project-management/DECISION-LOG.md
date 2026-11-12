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
