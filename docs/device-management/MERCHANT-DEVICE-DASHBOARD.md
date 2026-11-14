# Merchant device management dashboard

**Surfaces:** Merchant Admin (Web) and Merchant App. Super Admin sees cross-tenant ops with elevation only.  
**Wizard:** [ENROLLMENT-WIZARD-MOCKUP.md](./ENROLLMENT-WIZARD-MOCKUP.md)

## List / detail fields

| Field | Notes |
|-------|--------|
| Merchant (tenant / branch) | From auth; never client-supplied tenant id |
| Customer | Mask national ID |
| Contract number | ACTIVE bind |
| Device brand / model | From inventory + heartbeat |
| Platform | ANDROID \| IOS |
| Device identifier | Masked IMEI / serial in lists |
| Enrollment status | Session state machine |
| Activation status | `device_activations` |
| Business lock state | Desired presentation |
| Actual platform state | Last ack |
| Last heartbeat | Freshness |
| Last command result | type + status |
| Outstanding balance | DECIMAL from ledger, not DPC |

## Actions (all RBAC + audit + reason on restrict)

| Action | Platform | Notes |
|--------|----------|--------|
| Generate Android QR | Android | Session → `QR_GENERATED` |
| Start iOS enrollment | iOS | Prerequisites or `IOS_PREREQ_UNMET` |
| Retry enrollment | Both | Rotates token |
| Cancel enrollment | Both | Revokes token |
| Activate device | Both | Staff-confirmed default |
| Bind contract | Both | One ACTIVE bind |
| Reminder / Restrict / Lock / Unlock | Both | Capability-gated; iOS may `UNSUPPORTED` |
| Recover device | Both | REENROLL / REPLACE / UNENROLL / RELEASE |

Unauthorized roles receive 403. HTTP 201 on command ≠ executed.
