# Device Management documentation

Canonical specs for the **Device Provisioning & Enrollment Platform** (R2 / DM0–DM5).

| Document | Purpose |
|----------|---------|
| [REFERENCE-VIDEO-OBSERVATIONS.md](./REFERENCE-VIDEO-OBSERVATIONS.md) | What `docs/reference/mango_*.mp4` actually show |
| [DEVICE-PROVISIONING-ENROLLMENT.md](./DEVICE-PROVISIONING-ENROLLMENT.md) | Lifecycle, modules, security, wizard |
| [ANDROID-ENROLLMENT.md](./ANDROID-ENROLLMENT.md) | Android Enterprise / QR / AMAPI / DPC / Zero-touch |
| [IOS-ENROLLMENT.md](./IOS-ENROLLMENT.md) | Apple Business, Configurator, ADE, MDM |
| [TENANT-OWNERSHIP-MODELS.md](./TENANT-OWNERSHIP-MODELS.md) | Multi-tenant Android & iOS ownership options |
| [CAPABILITY-MATRIX.md](./CAPABILITY-MATRIX.md) | Post-enrollment controls (levels 1–5) |
| [OPEN-DECISIONS.md](./OPEN-DECISIONS.md) | Pending vs accepted device decisions |
| [ENROLLMENT-WIZARD-MOCKUP.md](./ENROLLMENT-WIZARD-MOCKUP.md) | Merchant wizard wireframes; handover gate |
| [DM0-LAB-PROTOCOL.md](./DM0-LAB-PROTOCOL.md) | Hardware/vendor evidence still required |
| [../api/DEVICE-ENROLLMENT-API.md](../api/DEVICE-ENROLLMENT-API.md) | REST enrollment/activation/management APIs |
| [../database/DATABASE-DESIGN.md](../database/DATABASE-DESIGN.md) | Enrollment entities (canonical schema draft) |

**Status:** Architecture accepted (D-042–D-053). Integrations remain **BLOCKED** for production until lab evidence.

**Safety:** No stealth control, covert surveillance, destructive collection, or emergency-call blocking.
