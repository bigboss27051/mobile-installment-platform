# Device Capability Matrix (Phase 0)

| Capability | Android Device Owner | iOS MDM (typical supervised) | Pilot policy |
|------------|----------------------|------------------------------|--------------|
| Enrollment / bind to contract | Yes | Yes (via MDM provider) | Required where device mgmt enabled |
| Heartbeat / inventory | Yes | Yes | Required |
| Level 1 Normal | Yes | Yes | Default |
| Level 2 Warning notify | Yes | Yes (push) | Allowed |
| Level 3 App limitation | Yes (package restrictions / allowlist) | Limited / often unsupported as Android-like | Android yes; iOS = best-effort allowlist if provider supports, else UNSUPPORTED |
| Level 4 Screen lock / kiosk-like | Yes (lock task / lock) | DeviceLock where permitted | Android yes; iOS DeviceLock only, with recovery |
| Level 5 Max restrict | Yes with emergency dial preserved | Not equivalent | Android only for “suspend”; iOS must not fake parity |
| Lost Mode | N/A | Exists but **forbidden for debt collection** | Never for collections |
| Factory reset (admin) | Possible; not for routine collection | N/A / constrained | Not used for payment collection |
| Emergency calls | Must remain | Must remain | Hard requirement |

Unsupported commands return `UNSUPPORTED_CAPABILITY` and are audited; UI must not show them as available on that platform.
