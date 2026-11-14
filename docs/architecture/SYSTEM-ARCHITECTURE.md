# System Architecture (Phase 0 Draft)

## Style

**Modular monolith** backend first. Extract services only when module boundaries and load demand it.

## Context Diagram

```mermaid
C4Context
title Mobile Installment Platform Context
Person(superAdmin, "Super Admin")
Person(merchantStaff, "Merchant Staff")
Person(customer, "Customer")
System(platform, "Mobile Installment SaaS")
System_Ext(pay, "Payment Gateway")
System_Ext(mdm, "iOS MDM / Apple Business")
System_Ext(ae, "Android DPC / Enterprise QR")
System_Ext(ocr, "OCR/KYC Vendor")
System_Ext(esign, "E-Sign Provider")
System_Ext(notify, "SMS/LINE/Email/Push")
Rel(superAdmin, platform, "HTTPS")
Rel(merchantStaff, platform, "Web/Flutter")
Rel(customer, platform, "Flutter")
Rel(platform, pay, "API + Webhooks")
Rel(platform, mdm, "MDM APIs")
Rel(platform, ae, "DPC check-in / commands")
Rel(platform, ocr, "Optional")
Rel(platform, esign, "Optional")
Rel(platform, notify, "Adapters")
```

## Logical Architecture

```mermaid
flowchart TB
  subgraph clients [Clients]
    SA[Super Admin Web]
    MW[Merchant Web]
    MM[Merchant Mobile]
    CM[Customer Mobile]
    DPC[Android DPC]
  end

  subgraph edge [Edge]
    API[NestJS API Gateway / Modular Monolith]
    WH[Webhook Endpoints]
  end

  subgraph core [Domain Modules]
    AUTH[Auth]
    TEN[Tenant/RBAC]
    INV[Inventory/IMEI]
    KYC[Customer/KYC]
    INS[Installment/Scorecard]
    CON[Contract]
    PAY[Payment/Ledger]
    DEV[Device / Enrollment]
    SUB[Subscription]
    NOT[Notification]
    AUD[Audit]
  end

  subgraph data [Data]
    PG[(PostgreSQL)]
    RD[(Redis)]
    Q[BullMQ]
    S3[(S3-compatible)]
  end

  clients --> API
  payExt[Payment Gateway] --> WH
  DPC --> API
  API --> core
  WH --> PAY
  core --> PG
  core --> RD
  core --> Q
  KYC --> S3
```

## Module List

1. Auth  
2. Tenant  
3. Subscription  
4. Merchant  
5. Branch  
6. User  
7. Role & Permission  
8. Customer  
9. KYC  
10. Product  
11. Inventory  
12. Installment  
13. Contract  
14. Payment  
15. Ledger  
16. Collection  
17. Device Management (registry, enrollment, provisioning, activation, bind, policy, commands, heartbeat, recovery)  
18. Notification  
19. Reporting  
20. Audit Log  

## Key Flows

### Payment

Customer → Payment Intent → Gateway → Webhook → Verify → Transaction → Ledger → Allocation → Schedule → Notification → (optional) Device recovery evaluation

### Device Command

Authorized actor/policy → Command record → Queue → Device pull/push → Execute → Ack/result → Audit  
Success of HTTP create ≠ device executed.

### Device Enrollment

Staff wizard → Enrollment session (TTL token) → Android QR **or** iOS Configurator/ADE instructions → OS provisioning → Agent/MDM check-in → Verify identity → Activate → Bind contract → Level 1 policy.  
Details: [../device-management/DEVICE-PROVISIONING-ENROLLMENT.md](../device-management/DEVICE-PROVISIONING-ENROLLMENT.md). Android = custom DPC QR (D-057); iOS = Model B (D-043). Production claims remain evidence-gated.

## Cross-Cutting

- OpenAPI/Swagger for all public HTTP APIs  
- Structured logging with PII redaction  
- OpenTelemetry hooks prepared for later Grafana stacks  
- Config via environment variables; `.env.example` only  

## Non-Goals of This Draft

Final deployment topology (K8s vs VM), exact MDM vendor, and exact payment vendor selection remain adapter-level decisions recorded in the Decision Log when chosen.
