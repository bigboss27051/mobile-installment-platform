# Device Management documentation

Canonical specs for the **Device Provisioning & Enrollment Platform** (R2 / Phases 1–7).

| Document | Purpose |
|----------|---------|
| [../project-management/MASTER-EXECUTION-PLAN.md](../project-management/MASTER-EXECUTION-PLAN.md) | Index + phase estimates |
| [DEVICE-PROVISIONING-ENROLLMENT.md](./DEVICE-PROVISIONING-ENROLLMENT.md) | Lifecycle, modules, wizard states |
| [ANDROID-ENROLLMENT.md](./ANDROID-ENROLLMENT.md) | Android QR Device Owner (product) |
| [FRP-AND-REENROLL.md](./FRP-AND-REENROLL.md) | Factory Reset Protection after wipe + re-enroll SOP (D-060) |
| [../architecture/android-dpc-architecture.md](../architecture/android-dpc-architecture.md) | Kotlin DPC components |
| [../architecture/android-qr-provisioning.md](../architecture/android-qr-provisioning.md) | QR extras |
| [../architecture/android-kiosk-locking.md](../architecture/android-kiosk-locking.md) | Lock Task Mode vs lockNow |
| [../architecture/device-lock-state-machine.md](../architecture/device-lock-state-machine.md) | Shared REMINDER/RESTRICT/LOCK |
| [../architecture/payment-to-unlock.md](../architecture/payment-to-unlock.md) | Verified payment → unlock |
| [IOS-ENROLLMENT.md](./IOS-ENROLLMENT.md) | Merchant-assisted Configurator / ABM / MDM |
| [../architecture/ios-mdm-architecture.md](../architecture/ios-mdm-architecture.md) | Vendor MDM vs self-hosted |
| [../architecture/ios-single-app-mode.md](../architecture/ios-single-app-mode.md) | D-056 |
| [../architecture/ios-enrollment-workflow.md](../architecture/ios-enrollment-workflow.md) | iOS SOP mapping |
| [../architecture/ios-payment-to-unlock.md](../architecture/ios-payment-to-unlock.md) | SAM disable |
| [MERCHANT-DEVICE-DASHBOARD.md](./MERCHANT-DEVICE-DASHBOARD.md) | List/detail + RBAC actions |
| [ENROLLMENT-WIZARD-MOCKUP.md](./ENROLLMENT-WIZARD-MOCKUP.md) | Wizard frames |
| [TENANT-OWNERSHIP-MODELS.md](./TENANT-OWNERSHIP-MODELS.md) | Multi-tenant Android & iOS |
| [CAPABILITY-MATRIX.md](./CAPABILITY-MATRIX.md) | Android vs iOS controls |
| [PRODUCTION-FEASIBILITY.md](./PRODUCTION-FEASIBILITY.md) | Prototype vs commercial gates |
| [OPEN-DECISIONS.md](./OPEN-DECISIONS.md) | Pending vs accepted |
| [REFERENCE-VIDEO-OBSERVATIONS.md](./REFERENCE-VIDEO-OBSERVATIONS.md) | Reference videos |
| [DM0-LAB-PROTOCOL.md](./DM0-LAB-PROTOCOL.md) | Lab protocol (ask before wipe) |
| [DM0-FEASIBILITY-REPORT.md](./DM0-FEASIBILITY-REPORT.md) | Desk lab; AMAPI ToS history |
| [AMAPI-POLICY-MAPPING.md](./AMAPI-POLICY-MAPPING.md) | Historical AMAPI field map — **not** the lock adapter |
| [COMPATIBILITY-MATRIX-RESULTS.md](./COMPATIBILITY-MATRIX-RESULTS.md) | SKU rows (NOT RUN) |
| [PHYSICAL-LAB-RUNBOOK.md](./PHYSICAL-LAB-RUNBOOK.md) | Physical device steps |
| [DM1-SAFE-SCOPE.md](./DM1-SAFE-SCOPE.md) | What stubs already shipped |
| [../api/DEVICE-ENROLLMENT-API.md](../api/DEVICE-ENROLLMENT-API.md) | REST |
| [../database/DATABASE-DESIGN.md](../database/DATABASE-DESIGN.md) | Schema |

**Status:** Architecture **D-057 / D-043**. Hardware + commercial financing approval **BLOCKED**. Do not claim production enroll.

**Safety:** No stealth control, covert surveillance, destructive collection, or emergency-call blocking.
