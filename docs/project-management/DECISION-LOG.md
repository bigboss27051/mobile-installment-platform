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
