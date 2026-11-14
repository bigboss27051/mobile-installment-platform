# Android enrollment

**Status:** Planning. Feasibility **BLOCKED** until DM0 hardware evidence.  
**Reference UX:** [REFERENCE-VIDEO-OBSERVATIONS.md](./REFERENCE-VIDEO-OBSERVATIONS.md) (competitor 6-tap QR + Device Owner consent).  
**Product after enroll:** [CAPABILITY-MATRIX.md](./CAPABILITY-MATRIX.md).

## Official provisioning (planning summary)

Google documents several **Android Enterprise** enrollment paths. They are **not** equivalent, and **not** all retail SKUs support all paths.

| Mode | Typical trigger | Device state | Notes |
|------|-----------------|--------------|--------|
| **QR code** | Tap Welcome **6 times** (or equivalent OEM gesture) → camera | New / factory reset | Widely used at retail. QR is JSON extras, not a login URL. |
| **Zero-touch** | First boot, pre-registered IMEI/serial via reseller | New from participating reseller | Best scale; requires Zero-touch portal + reseller in Thailand (**unverified**). |
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

## Stack options (DM0)

### Option 1 — Android Management API (EMM)

- Platform is an EMM using AMAPI.  
- Policies are AMAPI `Policy` resources mapped from our levels 1–5.  
- Heartbeat/status via AMAPI enterprises.devices + Pub/Sub notifications.  
- Commands via AMAPI (`issueCommand`, etc.), still mirrored in our `device_commands` for authz/audit.

**Pros:** No sideload DPC; Google maintains the agent; better Play Protect story.  
**Cons:** Policy expressiveness for lock-task / allowlists may not match our UX; Google Cloud + enterprise quota; **SaaS multi-enterprise rules unverified**.

### Option 2 — Custom Kotlin DPC (Phase 0 assumption)

- Our APK is Device Owner via QR (`PROVISIONING_DEVICE_ADMIN_*` extras).  
- Heartbeat/commands over our REST + FCM as already drafted.

**Pros:** Full control of levels 4–5 UX (call-shop lock task).  
**Cons:** OEM fragmentation (R-002); signing/Play; 6-tap QR hosting APK URL; competitor-style Play Protect workarounds are **rejected**.

### Option 3 — Hybrid (recommended to prototype)

- Enroll with AMAPI or DO.  
- Companion Flutter/Kotlin app for customer-facing status.  
- Lock-task only if AMAPI cannot; never a hidden DPC.

## Target merchant flow (our product)

1. Staff: customer + **ACTIVE** contract + Android + consent recorded.  
2. Backend: `enrollment_sessions` row, token, QR (AMAPI or custom extras — DM0).  
3. Merchant Web / Merchant Mobile wizard shows QR + **factory-reset / 6-tap** instructions.  
4. Device: Welcome → 6 taps → scan → Wi-Fi on device → Enterprise provisioning → DPC/AMAPI agent.  
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
| SKUs | Common TH retail: Samsung, Xiaomi, OPPO, vivo, realme, etc. | Matrix; unsupported SKUs listed |
| Google Mobile Services | Required for Play/FCM/AMAPI | Non-GMS devices out of pilot |
| Tablet vs phone | Phone primary; tablet (e.g. Galaxy Tab A11 in the reference) optional | Lab |

The reference video’s Galaxy Tab A11 **is not** a certified device for *this* product.

## Factory reset

QR Device Owner enrollment **requires** a new or factory-reset device. Staff SOP must include wipe **before** enrollment if the unit was a display/demo device. Reset is **not** a collections action (capability matrix).

## Zero-touch

Evaluate in DM0 only: Thai carrier/reseller enrollment, IMEI pre-registration SLA vs same-day walk-in sales. Walk-in shops likely **cannot** depend on Zero-touch for day-one SKUs. Keep QR as the default counter path.
