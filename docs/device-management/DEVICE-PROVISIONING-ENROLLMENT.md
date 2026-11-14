# Device Provisioning & Enrollment Platform

Expands Phase 0 “Device Control” from registry + commands into a full **provisioning, enrollment, activation, bind, policy, heartbeat, recovery** lifecycle.

Related: [ANDROID-ENROLLMENT.md](./ANDROID-ENROLLMENT.md), [IOS-ENROLLMENT.md](./IOS-ENROLLMENT.md), [TENANT-OWNERSHIP-MODELS.md](./TENANT-OWNERSHIP-MODELS.md), [../api/DEVICE-ENROLLMENT-API.md](../api/DEVICE-ENROLLMENT-API.md).

## Confirmed vs assumed

| Confirmed requirements | Assumptions / pending |
|------------------------|----------------------|
| AMAPI EMM; Model B iOS; mandatory enroll (D-042–D-050) | Exact MDM vendor |
| Short-lived enrollment sessions; hashed tokens | AMAPI quotas (D-053) |
| No secrets in QR; no Play Protect-off SOP | Min OS / SKU matrix (lab) |
| Consent captured; legal **wording** later (D-051) | IMEI vs enterprise id bind key |
| One active contract binding per device/IMEI | — |
| Audit all restrict / enroll / unenroll | Hardware proof for production |
| Emergency calling; no stealth; no Lost Mode collections | — |

## Logical modules (NestJS domains, not microservices)

Keep a single **Device** bounded context (`DEVICE_CONTROL`) with application services below. Do not spawn new deployables in R2.

| Module | Responsibility |
|--------|----------------|
| **Device Registry** | Inventory of managed devices: platform, identifiers, ownership, lifecycle status |
| **Enrollment Management** | Sessions, tokens, QR material, expiry, status, verify, cancel, retry |
| **Provisioning Management** | Platform profiles (Android QR extras / iOS instruction sets), compatibility flags |
| **Device Activation** | First registration after OS enroll, merchant + customer association |
| **Contract Binding** | Active bind/unbind to installment contract; history; IMEI consistency |
| **Policy Management** | Profiles, assignment, versioning, audit (levels 1–5 + iOS subset) |
| **Command Management** | Authorized commands, status, retry, expiry, execution events |
| **Events & Heartbeat** | Check-in, connectivity, status, history |
| **Recovery** | Failed enroll, reassignment, replacement, release, unenroll, termination |
| **Platform Integrations** | Ports: `AndroidEnterprisePort` (AMAPI), `MdmProviderPort` (vendor) |

Payment still **must not** call these modules except via **verified domain events**.

```mermaid
flowchart LR
  subgraph clients [Clients]
    MW[Merchant Web wizard]
    MM[Merchant Mobile wizard]
    DPC[Android agent]
    iOS[iOS / MDM]
  end
  subgraph device [Device context]
    ENR[Enrollment]
    ACT[Activation]
    REG[Registry]
    BIND[Binding]
    POL[Policy]
    CMD[Commands]
    HB[Heartbeat]
    REC[Recovery]
  end
  MW --> ENR
  MM --> ENR
  ENR --> DPC
  ENR --> iOS
  DPC --> ACT
  iOS --> ACT
  ACT --> REG
  REG --> BIND
  BIND --> POL
  POL --> CMD
  DPC --> HB
  iOS --> HB
  REC --> ENR
  REC --> BIND
```

## Enrollment session state machine

```text
NOT_STARTED → WAITING_FOR_DEVICE → PROVISIONING → ENROLLING
    → VERIFYING → ACTIVATING → COMPLETED
Any non-terminal → FAILED | EXPIRED | CANCELLED | RECOVERY_REQUIRED
COMPLETED → (later) UNENROLLED | REPLACED via recovery
```

| State | Meaning |
|-------|---------|
| `NOT_STARTED` | Session created; QR/instructions not yet issued (or unused) |
| `WAITING_FOR_DEVICE` | QR/instructions shown; no check-in |
| `PROVISIONING` | OS setup in progress (best-effort; may skip if we only see check-in) |
| `ENROLLING` | Agent/MDM registered with platform or vendor |
| `VERIFYING` | Identity vs inventory/IMEI |
| `ACTIVATING` | Customer/merchant association in progress |
| `COMPLETED` | Bound (or explicitly unbound wait — still enrolled) per API |
| `FAILED` | Terminal failure with error code |
| `EXPIRED` | TTL passed; token dead |
| `CANCELLED` | Staff cancel |
| `RECOVERY_REQUIRED` | Partial enroll (e.g. DO installed, bind failed) |

Idempotent transitions. Duplicate check-ins do not create duplicate devices.

## Merchant Enrollment Wizard

Surfaces: **Merchant Web (R2)** and **Merchant Mobile (R2)**. Customer app only shows **device status** (CM-08), not enrollment.

Flow:

1. Select customer (KYC as required by contract rules).  
2. Select installment contract (`ACTIVE`, same tenant/branch as authorized).  
3. Confirm device-management **consent** (timestamp, version of disclosure).  
4. Select Android or iOS.  
5. Start enrollment session.  
6. Show QR **or** iOS prerequisites + instructions + optional shop code.  
7. Poll session status (no busy-loop; backoff).  
8. Verify enrolled device (IMEI/serial vs reserved `ImeiUnit`).  
9. Activate.  
10. Bind contract (may be combined with activate if idempotent).  
11. Result: level 1 applied or `UNSUPPORTED` on iOS.

### iOS wizard prerequisites (block start if unmet)

- Tenant MDM account status `CONNECTED` (Model A or B).  
- Staff acknowledgement: Configurator host ready, target iPhone erased/new, ABM authorized.  
- Do not tell staff to skip passcode, Apple ID, or Location Services.

### Android wizard prerequisites

- Target new or factory-reset.  
- 6-tap QR instructions.  
- Wi-Fi available **on the device**.  
- Never instruct Play Protect off as a required step.

## Security requirements (enrollment)

- Consent + role: `MERCHANT_OWNER` / `MERCHANT_MANAGER` / granted enroll permission; branch scope.  
- Tokens: CSPRNG, SHA-256 hash at rest, shown once, TTL, rotate on retry.  
- Rate-limit session create and `activate` / shop-code guesses.  
- Device agent auth: enrollment token then device credential (mTLS or device JWT audience `device-agent`).  
- Webhooks from AMAPI/MDM: signature verify + idempotency (`provider_event_id`).  
- Bind requires session `VERIFYING`/`ACTIVATING` and matching IMEI; reject if another ACTIVE contract bound.  
- Restrictive commands: existing reason + authz + expiry + audit.  
- Recovery/unenroll audited; factory reset not used as collections.  
- No covert surveillance APIs (no silent mic/camera/keylog). Heartbeat is connectivity + policy compliance + inventory identifiers only.

## Duplicate and replacement

- Same IMEI re-enroll: recover session or `device_recovery_requests` type `REENROLL`.  
- Replacement phone: unbind old, unenroll per policy, new session, bind same contract.  
- Contract close: policy relax + optional unenroll (J7).
