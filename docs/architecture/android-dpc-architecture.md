# Android DPC architecture

**Status:** Target architecture (D-057). Lab Device Owner **BLOCKED** until authorized hardware evidence. Production financing use is a separate gate ([../device-management/PRODUCTION-FEASIBILITY.md](../device-management/PRODUCTION-FEASIBILITY.md)).  
**Enrollment:** [../device-management/ANDROID-ENROLLMENT.md](../device-management/ANDROID-ENROLLMENT.md)  
**QR extras:** [android-qr-provisioning.md](./android-qr-provisioning.md)  
**Locking:** [android-kiosk-locking.md](./android-kiosk-locking.md)

## Decision

The **R2 Android prototype and intended commercial stack** is a **native Kotlin custom DPC** that becomes **Device Owner** through Android Enterprise QR provisioning (6-tap Welcome screen). The DPC applies business policies locally via `DevicePolicyManager`.

**Android Management API (D-042)** remains documented as an evaluated EMM alternative. It is **not** the lock engine: AMAPI Permissible Usage forbids EMI/payment-based restriction unless Google grants a written exception (D-054). Do not mix AMAPI `Policy` patches with DPC kiosk code on the same device.

## Confirmed vs assumed

| Confirmed | Assumed / pending evidence |
|-----------|----------------------------|
| Native Kotlin DPC (`apps/android-dpc`) | 6-tap QR works on every Thai retail OEM SKU |
| Device Owner where the OS and SKU support it | Hosted APK checksum + download URL accepted by Setup Wizard on all target OEMs |
| Short-lived hashed enrollment tokens; no secrets in QR (D-045) | Play distribution / custom DPC eligibility for commercial financing |
| Business state ≠ platform state | Exact min SDK after matrix (planning target Android 10+) |
| Emergency calling remains available | Zero-touch / FRP re-enrollment after wipe |

## Components (DPC app)

Keep these as separate Kotlin packages inside one APK. Do not put `DevicePolicyManager` calls in the NestJS backend.

| Component | Responsibility |
|-----------|----------------|
| **DeviceAdminReceiver** | Receives `DEVICE_ADMIN_*` and provisioning callbacks; is the Device Owner component named in QR extras |
| **Device Owner initialization** | After provisioning, confirm `isDeviceOwnerApp`, persist owner flag, refuse to claim owner on a normal install |
| **QR Provisioning Handler** | Reads `PROVISIONING_ADMIN_EXTRAS_BUNDLE` (session id, enrollment token, endpoint) |
| **Enrollment Token Handler** | Holds token only in memory / encrypted prefs until check-in; never logs raw token |
| **Device Registration** | `POST /devices/enroll/check-in` with hardware identifiers (hashed per PDPA rules) |
| **Device Policy Controller** | Maps authorized commands to DPM APIs; never invents lock from local overdue clocks |
| **Kiosk Controller** | Lock Task Mode allowlist + start/stop; **not** `lockNow()` |
| **Application Restriction Controller** | `setPackagesSuspended` / allowlists where supported |
| **Backend Communication** | Device JWT after activation; TLS; tenant derived from token |
| **Device Heartbeat** | Connectivity + policy version + owner status; no covert sensors |
| **Command Handler** | Pull/FCM; ack `SUCCEEDED` / `FAILED` / `UNSUPPORTED` with actual DPM result |
| **Recovery Handler** | Re-apply last authorized policy after reboot; handle expired tokens; never wipe as collections |

## Backend ports (modular monolith)

```text
Merchant wizard
    → Enrollment Management
    → AndroidProvisioningAdapter (QR JSON + checksum + token bind)
    → Device Registry / Activation / Binding

DPC
    → Device Events / Heartbeat / Command Management
    → Device Lock Policy Engine (shared, platform-agnostic)
    → AndroidProvisioningAdapter (command translation only)

Payment (verified events only)
    → Payment-to-Unlock Orchestrator
    → Device Lock Policy Engine
```

`AndroidProvisioningAdapter` owns QR material and DPC command envelopes. `MdmProviderPort` must not be imported here.

## Distribution

| Environment | How the DPC APK reaches the phone | Notes |
|-------------|-----------------------------------|--------|
| Lab | HTTPS download URL in QR extras **or** pre-install + QR; ADB `dpm set-device-owner` is lab-only | Ask before wiping any physical device |
| Prototype shop | Same HTTPS URL with package checksum | Play Protect may warn; **do not** instruct staff to disable Play Protect (D-044) |
| Commercial | Play-distributed DPC / Android Enterprise-compliant distribution | **BLOCKED** until eligibility evidence |

Unsigned random APKs with embedded admin passwords are forbidden.

## Identity

After check-in the backend stores `hardware_fingerprint`, IMEI/serial hashes, package name, and Device Owner boolean. Staff verify against reserved `ImeiUnit` before bind. Duplicate IMEI → recovery, not a second ACTIVE bind.

## Testing (when hardware is authorized)

- JVM: extras parser, token handling, command mapping  
- Instrumented: `isDeviceOwnerApp` after lab provision  
- Backend: tenant isolation, expired token, duplicate check-in  
- Never mark QR enroll “works” from emulator-only evidence  
