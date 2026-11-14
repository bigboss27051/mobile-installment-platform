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
| [DM0-LAB-PROTOCOL.md](./DM0-LAB-PROTOCOL.md) | Lab protocol |
| [DM0-FEASIBILITY-REPORT.md](./DM0-FEASIBILITY-REPORT.md) | Desk lab 2026-11-14 (ToS + API); hardware not run |
| [AMAPI-POLICY-MAPPING.md](./AMAPI-POLICY-MAPPING.md) | Levels 1–5 → AMAPI fields |
| [COMPATIBILITY-MATRIX-RESULTS.md](./COMPATIBILITY-MATRIX-RESULTS.md) | SKU rows (NOT RUN) |
| [PHYSICAL-LAB-RUNBOOK.md](./PHYSICAL-LAB-RUNBOOK.md) | What humans must do on devices |
| [GOOGLE-AMAPI-USAGE-INQUIRY.md](./GOOGLE-AMAPI-USAGE-INQUIRY.md) | D-054 form draft for Google — **human must submit** |
| [OPERATOR-PACKET.md](./OPERATOR-PACKET.md) | **Do this now:** Google form fields + Android/iOS shopping list |
| [HUMAN-OPS-NOW.md](./HUMAN-OPS-NOW.md) | Google form + lab hardware + ABM checklist |
| [MDM-VENDOR-SHORTLIST.md](./MDM-VENDOR-SHORTLIST.md) | Vendor comparison; SKU still open |
| [LEGAL-COPY-D-051-DRAFT.md](./LEGAL-COPY-D-051-DRAFT.md) | Draft shop/customer wording incl. 30-day leave-RM |
| [DM1-SAFE-SCOPE.md](./DM1-SAFE-SCOPE.md) | What code may start before ToS/hardware (includes DM2 stub) |
| [../api/DEVICE-ENROLLMENT-API.md](../api/DEVICE-ENROLLMENT-API.md) | REST enrollment/activation/management APIs |
| [../database/DATABASE-DESIGN.md](../database/DATABASE-DESIGN.md) | Enrollment entities (canonical schema draft) |

**Status:** Architecture accepted (D-042–D-053). Desk lab recorded. **Hardware + AMAPI ToS (D-054) BLOCKED.** Do not claim production enroll.

**Safety:** No stealth control, covert surveillance, destructive collection, or emergency-call blocking.
