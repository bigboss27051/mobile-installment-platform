# Device Capability Matrix

Enrollment: [ANDROID-ENROLLMENT.md](./ANDROID-ENROLLMENT.md), [IOS-ENROLLMENT.md](./IOS-ENROLLMENT.md).  
State machine: [../architecture/device-lock-state-machine.md](../architecture/device-lock-state-machine.md).  
This matrix is **post-enrollment control**, not a claim that integrations work.

| Capability | Android Device Owner (custom DPC) | iOS MDM (typical supervised) | Pilot policy |
|------------|-----------------------------------|------------------------------|--------------|
| Enrollment / bind to contract | Yes (6-tap QR / Enterprise extras; Zero-touch if registered) | Yes (Configurator/ADE + MDM; Model B) | Required (D-050) |
| Heartbeat / inventory | Yes | Yes | Required |
| NONE / Level 1 | Yes | Yes | Default at handover |
| REMINDER / Level 2 | Yes (notify; device usable) | Yes (push + app UI) | Allowed |
| RESTRICT / Level 3 | Yes (`setPackagesSuspended` where supported) | Limited; not Android suspend | Android yes; iOS best-effort or `UNSUPPORTED` |
| LOCK / Level 4 | **Lock Task Mode** + Mango Lock UI (not `lockNow()`) | **Single App Mode (AppLock)** (D-056). MDM DeviceLock is **not** the financing UX | After authorized command + ack |
| Level 5 max restrict | Yes with emergency dial preserved | Not equivalent | Android only; iOS must not fake parity |
| Lost Mode | N/A | Exists but **forbidden for debt collection** | Never for collections |
| Factory reset (admin) | Possible; not for routine collection; **DO does not survive ordinary customer wipe** | Constrained | Not used for payment collection |
| Emergency calls | Must remain | Must remain | Hard requirement |

Unsupported commands return `UNSUPPORTED_CAPABILITY` and are audited; UI must not show them as available on that platform.

### Presentation mapping

| Presentation | Android OS mechanism | iOS OS mechanism |
|--------------|----------------------|------------------|
| REMINDER | Notifications; no DPM restrict | App UI + notifications. No MDM restrict |
| RESTRICT | Package suspend / allowlist | Vendor restrictions **if supported** |
| LOCK | Lock Task Mode + Mango Lock (balance, PromptPay QR, merchant contact) | Supervised SAM on customer app (same UX content) |
| UNLOCK | Authorized DPC command; ack actual result | Authorized MDM disable SAM; ack |

Desired presentation without ack is “requested,” not “device locked.”
