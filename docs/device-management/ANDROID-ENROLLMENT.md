# Android enrollment (QR Device Owner)

**Status:** Implementation architecture **accepted (D-057)**. Production enroll and financing lock **BLOCKED** until hardware + policy evidence ([PRODUCTION-FEASIBILITY.md](./PRODUCTION-FEASIBILITY.md), [DM0-LAB-PROTOCOL.md](./DM0-LAB-PROTOCOL.md)).  
**Reference UX:** [REFERENCE-VIDEO-OBSERVATIONS.md](./REFERENCE-VIDEO-OBSERVATIONS.md) (6-tap QR + Device Owner consent).  
**Payload spec:** [../architecture/android-qr-provisioning.md](../architecture/android-qr-provisioning.md)  
**DPC:** [../architecture/android-dpc-architecture.md](../architecture/android-dpc-architecture.md)  
**After enroll:** [CAPABILITY-MATRIX.md](./CAPABILITY-MATRIX.md)

## Official provisioning (not equivalent)

| Mode | Typical trigger | Device state | Pilot role |
|------|-----------------|--------------|------------|
| **QR code** | Welcome **6 taps** (or OEM equivalent) → camera | New / factory reset **after FRP cleared** | **Default shop path** — custom DPC extras (D-057). See [FRP-AND-REENROLL.md](./FRP-AND-REENROLL.md) |
| **Custom DPC + Device Owner** | QR download + checksum, or lab ADB | New / reset / lab | **Prototype + intended commercial stack** |
| **Android Management API QR** | Same 6-tap; Google DPC | New / reset | **Evaluated alternative only.** EMI lock forbidden without Google exception (D-054) |
| **Zero-touch** | First boot, IMEI/serial pre-registered | New from participating reseller | **When reseller registered the unit** (D-049 still applies). Unregistered walk-in uses QR |
| **NFC** | Bump | New / reset | Out of pilot |
| **Work profile** | BYOD | Personal | **Out of scope** — need fully managed Device Owner |

**Target:** fully managed **Device Owner**. Profile Owner will not meet RESTRICT/LOCK.

Not every OS version or OEM supports the same 6-tap QR behavior. Unsupported SKUs cannot be sold on installment (D-052).

## Chosen stack (D-057)

Native **Kotlin DPC** + **DevicePolicyManager** + **DeviceAdminReceiver**. QR extras name **our** DPC component, HTTPS download location, package checksum, and a short-lived enrollment token. Play Protect disable is **not** a required step (D-044).

D-042 (AMAPI as primary EMM) is **superseded for implementation**. Keep AMAPI docs as feasibility history and as a possible enrollment-only path if Google later allows it — **not** as the payment-lock engine.

## Target customer / merchant flow

1. Staff: customer + **ACTIVE** contract + Android + consent.  
2. Backend: `enrollment_sessions` + hashed token; wizard shows QR (`QR_GENERATED`).  
3. Customer: power on new/reset phone → Welcome. If **FRP** asks for a previous Google account, unlock that first (platform cannot skip it).  
4. Wi-Fi **on the device**.  
5. 6 taps → scan a **current** QR (old QR after wipe is invalid).  
6. Setup Wizard downloads DPC (checksum verified) → Device Owner provisioning.  
7. DPC: owner init → check-in (`ENROLLING`) → staff verify IMEI (`VERIFYING`) → activate → bind (`COMPLETED`).  
8. Heartbeat starts. Restrictive policy is **not** applied at handover (desired `NONE`).

UI states: [DEVICE-PROVISIONING-ENROLLMENT.md](./DEVICE-PROVISIONING-ENROLLMENT.md). No computer is required for **normal** customer enrollment. ADB owner is **lab-only**.

## QR payload rules (accepted)

Allowed: DPC component name, HTTPS download URL, package/signature checksum, locale, `enrollmentSessionId`, short-lived `enrollmentToken`, enrollment HTTPS endpoint.

**Forbidden:** Wi-Fi passwords, admin passwords, TLS private keys, refresh tokens, cloud JSON keys, customer national IDs, permanent backend secrets.

Tokens: CSPRNG, SHA-256 at rest, TTL 30–120 min (max 24h), bound to merchant session, single-consume on check-in, rotate on retry, expire unused sessions, cancel/recovery supported.

## Compatibility (to be filled in lab)

| Dimension | Planning target | Evidence required |
|-----------|-----------------|-------------------|
| OS | Fully managed; **pilot Android 10+** (8+ may enroll but suspend/lock-task vary) | Lab |
| Enrollment gesture | 6-tap on AOSP-like setup; Samsung/Xiaomi/OPPO/vivo | Lab |
| SKUs | GMS units the merchant sells; fail = cannot sell installment | Matrix |
| GMS | Required for Play/FCM | Non-GMS out of pilot |
| Tablet vs phone | Phone primary | Lab |

The reference Galaxy Tab A11 is **not** a certified SKU for this product.

## Factory reset and re-enrollment (explicit)

Distinguish these events; they are not the same:

| Event | Typical Device Owner result | Product response |
|-------|-----------------------------|------------------|
| **Device restart** | DO **survives** | Recovery Handler re-applies last authorized policy; heartbeat resumes |
| **Customer uninstall of companion UI** | DO **survives** if DPC is owner; UI may be reinstalled by policy | Treat as policy compliance event, not unenroll |
| **DPC removal** | Not possible for a normal user while DO is intact | If owner lost, session `RECOVERY_REQUIRED` |
| **Factory reset** | DO **does not survive** ordinary wipe | Device is unmanaged. Staff must run a **new enrollment** (new QR) unless a below path applies |
| **Factory Reset Protection** | Google account FRP may block reuse | Document per SKU; not a substitute for enrollment |
| **Enterprise re-enrollment** | Zero-touch / OEM / FRP+enterprise | Optional; **unverified** for this pilot |

**Do not claim** that scanning a QR once makes the device permanently managed after every factory reset.

**Supported re-enroll options to evaluate (not claimed working):**

- Android Zero-touch (reseller IMEI in portal) — auto-provision on first boot after wipe  
- OEM-supported enrollment (Samsung Knox, etc.) — per-SKU  
- FRP as theft friction only  
- Merchant-assisted QR again (default after wipe)

Factory reset is **not** a collections action.

## Zero-touch

Use when the IMEI/serial is pre-registered (D-049). Wizard must tell staff QR vs Zero-touch from inventory flags. Walk-in unregistered stock uses QR.
