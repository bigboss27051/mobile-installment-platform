# Android enrollment

**Status:** Architecture **accepted (D-042, D-049, D-052)**. Production enroll **BLOCKED** until lab evidence ([DM0-LAB-PROTOCOL.md](./DM0-LAB-PROTOCOL.md)).  
**Reference UX:** [REFERENCE-VIDEO-OBSERVATIONS.md](./REFERENCE-VIDEO-OBSERVATIONS.md) (competitor 6-tap QR + Device Owner consent).  
**Product after enroll:** [CAPABILITY-MATRIX.md](./CAPABILITY-MATRIX.md).

## Official provisioning (planning summary)

Google documents several **Android Enterprise** enrollment paths. They are **not** equivalent, and **not** all retail SKUs support all paths.

| Mode | Typical trigger | Device state | Notes |
|------|-----------------|--------------|--------|
| **QR code** | Tap Welcome **6 times** (or equivalent OEM gesture) → camera | New / factory reset | Widely used at retail. QR is JSON extras, not a login URL. |
| **Zero-touch** | First boot, pre-registered IMEI/serial via reseller | New from participating reseller | **In scope when the unit is pre-registered** (stakeholder: reseller exists). Walk-in unregistered stock uses QR. |
| **NFC** | Bump provisioning NFC | New / reset | Rare at Thai counters. |
| **DPC identifier extra** | QR/`afw#` style | New / reset | Depends on chosen DPC. |
| **Android Management API QR** | Same 6-tap camera | New / reset | QR points at Google’s AMAPI DPC + enrollment token. |
| **Work profile** | BYOD | Personal device | **Out of scope** for installment collateral; we need **fully managed / Device Owner**. |

**Target for shop installment:** **fully managed device (Device Owner)**. Profile Owner / BYOD will not meet levels 3–5.

### QR payload rules (accepted)

- Generate QR from an **enrollment session**.  
- Allowed: enrollment token id, server/DPC identifiers that Google/AMAPI already require, package name, signature checksum, locale.  
- **Forbidden:** Wi-Fi passwords, admin passwords, TLS private keys, JWT refresh tokens, Google service-account JSON, customer national IDs.  
- If Wi-Fi is needed during setup, staff enter it on the device (the iOS competitor video even types a Wi-Fi password on-device — we still must not put it in QR).  
- Tokens: high entropy, hashed at rest, TTL (default 30–120 minutes, configurable, max 24h), single-device consume unless `allowRetry` on the same session.

Do **not** require **disabling Play Protect**. Prefer AMAPI or a Play-distributed DPC. If a specific OEM still flags the DPC, record it in the compatibility matrix as a **device defect**, not a merchant SOP.

## Chosen stack (D-042)

**Android Management API** is the EMM. Platform creates/manages enterprises (prefer **one per tenant**, D-053). Policies map from levels 1–5 onto AMAPI `Policy`. Commands go through AMAPI and are mirrored in `device_commands`. Heartbeat via AMAPI + optional companion app for **customer-visible status only**.

Custom Kotlin DPC is **not** the enrollment/EMM path. Do not revive it without a new Decision Log row. If AMAPI cannot express lock-task (levels 4–5), add UX on top of AMAPI — not a second Device Owner APK as EMM.

Do **not** require disabling Play Protect.

## Target merchant flow (our product)

1. Staff: customer + **ACTIVE** contract + Android + consent recorded.  
2. Backend: `enrollment_sessions` row, token, **AMAPI QR** (or Zero-touch if the IMEI is already in the reseller portal).  
3. Merchant Web / Merchant Mobile wizard shows QR + **factory-reset / 6-tap** instructions ([ENROLLMENT-WIZARD-MOCKUP.md](./ENROLLMENT-WIZARD-MOCKUP.md)).  
4. Device: Welcome → 6 taps → scan → Wi-Fi on device → AMAPI fully managed provisioning.  
5. Device agent authenticates with enrollment token → activation.  
6. Staff confirms identity (IMEI/serial vs inventory unit).  
7. Bind contract; level 1 policy applied.  
8. Heartbeat starts.

UI states: see [DEVICE-PROVISIONING-ENROLLMENT.md](./DEVICE-PROVISIONING-ENROLLMENT.md).

## Compatibility (to be filled in DM0)

| Dimension | Planning target | Evidence required |
|-----------|-----------------|-------------------|
| OS | Android 8.0+ fully managed; 10/12/14 must pass | Lab |
| Enrollment gesture | 6-tap QR on AOSP-like setup; Samsung/Xiaomi equivalents | Lab |
| SKUs | GMS units the merchant sells; **not** every Android device. Fail = cannot sell installment (D-052) | Matrix |
| Google Mobile Services | Required for Play/FCM/AMAPI | Non-GMS devices out of pilot |
| Tablet vs phone | Phone primary; tablet (e.g. Galaxy Tab A11 in the reference) optional | Lab |

The reference video’s Galaxy Tab A11 **is not** a certified device for *this* product.

## Factory reset

QR Device Owner enrollment **requires** a new or factory-reset device. Staff SOP must include wipe **before** enrollment if the unit was a display/demo device. Reset is **not** a collections action (capability matrix).

## Zero-touch

**Accepted (D-049):** reseller path exists. Use Zero-touch when the IMEI/serial is pre-registered. Unregistered walk-in units **must** use AMAPI QR. Wizard should tell staff which path applies (inventory flag / reseller sync), not assume every box is Zero-touch.
