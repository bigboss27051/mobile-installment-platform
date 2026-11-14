# Initial ERD (Phase 0)

Logical ERD — not final physical schema. UUIDs omitted in diagram labels for readability.

```mermaid
erDiagram
  TENANT ||--o{ BRANCH : has
  TENANT ||--o{ USER : has
  TENANT ||--o{ CUSTOMER : has
  TENANT ||--o{ PRODUCT : has
  TENANT ||--o{ INSTALLMENT_PLAN : has
  TENANT ||--o| TENANT_SUBSCRIPTION : has
  TENANT ||--o{ ENFORCEMENT_POLICY : configures

  BRANCH ||--o{ USER_BRANCH : assigns
  USER ||--o{ USER_BRANCH : belongs
  USER }o--|| ROLE : has

  PRODUCT ||--o{ PRODUCT_VARIANT : has
  PRODUCT_VARIANT ||--o{ IMEI_UNIT : stocks
  BRANCH ||--o{ IMEI_UNIT : located

  CUSTOMER ||--o{ KYC_CASE : undergoes
  KYC_CASE ||--o{ KYC_DOCUMENT : includes
  CUSTOMER ||--o{ CONSENT : grants

  CUSTOMER ||--o{ APPLICATION : submits
  INSTALLMENT_PLAN ||--o{ APPLICATION : uses
  IMEI_UNIT ||--o| APPLICATION : reserves
  APPLICATION ||--o| SCORECARD_RESULT : scored
  APPLICATION ||--o{ APPROVAL_ACTION : decided
  APPLICATION ||--o| CONTRACT : becomes

  CONTRACT ||--o{ CONTRACT_VERSION : versions
  CONTRACT ||--o{ PAYMENT_SCHEDULE_ITEM : schedules
  CONTRACT ||--o| IMEI_UNIT : binds
  CONTRACT ||--o| DEVICE : manages
  TENANT ||--o{ DEVICE_ENROLLMENT_SESSION : scopes
  CONTRACT ||--o{ DEVICE_ENROLLMENT_SESSION : enrolls
  DEVICE_ENROLLMENT_SESSION ||--o| DEVICE : yields
  TENANT ||--o{ DEVICE_MANAGEMENT_ACCOUNT : configures
  DEVICE }o--o| DEVICE_MANAGEMENT_ACCOUNT : uses
  DEVICE ||--o{ DEVICE_CONTRACT_BINDING : binds
  CONTRACT ||--o{ DEVICE_CONTRACT_BINDING : bound
  DEVICE ||--o| DEVICE_ACTIVATION : activated
  DEVICE ||--o{ DEVICE_RECOVERY_REQUEST : recovers

  PAYMENT_INTENT }o--|| CONTRACT : for
  PAYMENT_INTENT ||--o{ PAYMENT_TRANSACTION : yields
  PAYMENT_TRANSACTION ||--o{ LEDGER_ENTRY : posts
  PAYMENT_TRANSACTION ||--o{ ALLOCATION : allocates
  ALLOCATION }o--|| PAYMENT_SCHEDULE_ITEM : settles

  DEVICE ||--o{ DEVICE_COMMAND : receives
  DEVICE ||--o{ DEVICE_EVENT : emits
  DEVICE ||--o| DEVICE_POLICY_STATE : current

  COLLECTION_CASE }o--|| CONTRACT : tracks
  COLLECTION_CASE ||--o{ COLLECTION_ACTION : acts

  AUDIT_EVENT }o--|| TENANT : scoped
```

## Domain Model Notes

- `ENFORCEMENT_POLICY` stores preset reference + per-level thresholds and approval flags.  
- `DEVICE_POLICY_STATE.level` ∈ {1..5}; also `desired_presentation` and `platform_state` (D-058).  
- `DEVICE_ENROLLMENT_SESSION.status` includes `QR_GENERATED` (see device-management spec).  
- At most one `DEVICE_CONTRACT_BINDING` with status `ACTIVE` per device and per IMEI.  
- `DEVICE_MANAGEMENT_ACCOUNT.secret_ref` points at a secret store; not the credential.  
- `INSTALLMENT_PLAN.interest_method` ∈ {`FLAT`,`REDUCING`}.  
- `SCORECARD_RESULT` informs humans; does not auto-activate contracts.  
- SaaS `TENANT_SUBSCRIPTION` tables are separate from installment `LEDGER_ENTRY` streams (tag `ledger_domain = SAAS|INSTALLMENT`).  
