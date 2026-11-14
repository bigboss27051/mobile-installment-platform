# Acceptance Criteria

## Phase 0 Acceptance Checklist

Authoring checklist (engineering): see [PHASE-0-ACCEPTANCE-CHECKLIST.md](./PHASE-0-ACCEPTANCE-CHECKLIST.md).

- [x] Repository inspected (greenfield)  
- [x] Product docs complete under `docs/product/`  
- [x] Architecture drafts under `docs/architecture/`  
- [x] Domain model + initial ERD under `docs/database/`  
- [x] API standards documented  
- [x] Decision log + risk register + backlog created  
- [x] Release plan with R0–R3 defined  
- [x] Cursor rules/agents stubs created  
- [x] README points to discovery docs  
- [x] Design spec saved under `docs/superpowers/specs/`  
- [x] Open questions / assumptions explicitly listed  
- [x] Human review / sign-off of Phase 0 package  

Phase 0 is accepted when the checklist above is complete and reviewers approve moving to Phase 1 (architecture solidification / foundation).

## R0 Acceptance

- Users can authenticate; refresh works  
- Tenant + branch + RBAC basics work  
- Cross-tenant access tests fail closed  
- Docker Compose brings up Postgres/Redis  
- Health endpoint returns OK  
- CI runs lint/typecheck/unit skeleton  

## R1 Acceptance

- Merchant manages products/IMEI/inventory  
- IMEI cannot bind two active contracts  
- Customer KYC statuses tracked; staff can review  
- Application scorecard generated; approve/reject audited  
- Contract generates schedule; flat and reducing paths tested  
- Schedule totals match contract terms under rounding rules  
- PromptPay sandbox intent + verified webhook allocates once  
- Duplicate webhook does not double-post  
- Merchant Web + Customer App critical paths hit real APIs  

## R2 Acceptance

R2 is accepted only when **DM0–DM5** exit criteria below are met for in-scope platforms. Production DO/MDM remains unclaimed without evidence.

### DM0
- Written feasibility report: custom DPC QR vs AMAPI; QR modes; Zero-touch; ABM; Configurator; MDM architecture; Model A vs B; factory-reset re-enroll  
- Compatibility notes from real devices (unsupported SKUs listed)  
- ADRs in Decision Log; open questions explicit  
- No production feasibility claim without tests  

### DM1–DM2
- Enrollment sessions with TTL, hashed tokens, cancel/expire/retry  
- Android QR generation without secrets (`QR_GENERATED`); iOS instruction + prereq gating  
- Activate + bind; duplicate IMEI/device rejected; tenant isolation tests  
- Merchant wizard states including Failed/Expired/Recovery Required  

### DM3–DM5
- Android device enrolls via supported Device Owner **QR (custom DPC)** on test hardware  
- iOS adapter enrolls in test env; unsupported commands handled explicitly  
- Levels 1–5 map to policies; emergency dial preserved  
- Merchant can configure presets + custom thresholds  
- Commands carry reason/expiry/status/result  
- Offline/retry behavior documented and tested  
- Recovery unlock, replacement, unenroll, contract-close paths  
- Unverified payment cannot raise restriction level  
- Security review + isolation + enrollment failure tests  

See also [../project-management/MASTER-EXECUTION-PLAN.md](../project-management/MASTER-EXECUTION-PLAN.md).  

## R3 Acceptance

- Super Admin subscription/packages/suspension work  
- SaaS invoices separated from installment ledgers  
- Notification channels deliver in sandbox/test modes with consent checks  
- Core reports available with permission-aware access  
- Security review checklist completed for pilot  

## Cross-Cutting Mandatory Tests

| Area | Must pass |
|------|-----------|
| Tenant isolation | A cannot read/write B |
| Financial math | Unit tests for flat + reducing + rounding |
| Payments | Idempotency + signature failure rejection |
| Authz | Unauthorized role cannot approve/lock |
| Device | Restrictive action audit completeness |
| Privacy | No ID card numbers in logs |

## Definition of Done (Commercial Pilot)

See [../project-management/MASTER-EXECUTION-PLAN.md](../project-management/MASTER-EXECUTION-PLAN.md) §9. Pilot readiness requires R0–R3 acceptance for in-scope features, with external blockers explicitly listed rather than falsely marked complete.
