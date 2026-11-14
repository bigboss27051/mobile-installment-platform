# Android QR provisioning

Canonical **product and security** rules live in [../device-management/ANDROID-ENROLLMENT.md](../device-management/ANDROID-ENROLLMENT.md). This file is the **payload and Setup Wizard** specification (D-057).

## Customer path (no PC)

1. Merchant starts enrollment in Merchant Admin / Merchant App (customer + ACTIVE contract + Android).  
2. Customer powers on a **new or factory-reset** phone.  
3. Welcome screen → tap the same area **six times** (OEM equivalent if documented in the compatibility matrix).  
4. Scan merchant QR.  
5. Customer/staff connect **Wi-Fi on the device** (password is not in the QR).  
6. Setup Wizard downloads the DPC (URL + checksum in extras).  
7. Device Owner provisioning starts.  
8. DPC initializes, registers with the backend, staff verify identity, bind contract, session `COMPLETED`.

If a SKU has no 6-tap camera, it **fails the matrix** (D-052) — it is not sold on installment. Do not invent a PC-based everyday path.

## Official extras (evaluate per API level)

Provisioning QR is **JSON**, not a login URL. Typical keys (names are Android extras; omit unused keys):

| Extra | Use | Allowed? |
|-------|-----|----------|
| `PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME` | DPC admin component | Required |
| `PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION` | HTTPS APK URL | Lab/prototype; production prefers Play |
| `PROVISIONING_DEVICE_ADMIN_PACKAGE_CHECKSUM` | SHA-256 of APK (base64url) | Required when download URL is used |
| `PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM` | Signing cert checksum (where supported) | Optional extra integrity |
| `PROVISIONING_ADMIN_EXTRAS_BUNDLE` | Session id, enrollment token, enrollment endpoint | Required; **no secrets** |
| `PROVISIONING_WIFI_SSID` / password extras | Auto-join shop Wi-Fi | **Forbidden** for passwords (D-045). SSID-only is optional and must be reviewed before enabling |
| Locale / skip encryption flags | OEM-specific | Do not skip encryption or user protections as a product SOP |

`PROVISIONING_ADMIN_EXTRAS_BUNDLE` may contain only:

- `enrollmentSessionId`  
- `enrollmentToken` (short-lived, single-consume; hashed at rest)  
- `enrollmentEndpoint` (HTTPS check-in URL, no credentials)  

Never include: private keys, JWT refresh tokens, Google/Apple JSON, admin passwords, customer national IDs, contract financials.

## Token lifecycle

- Generated with CSPRNG when the session reaches `QR_GENERATED`.  
- Stored as `token_hash` only. Raw token returned **once** to authorized staff (QR material).  
- TTL 30–120 minutes default, max 24h.  
- Bound to `tenant_id` + session + merchant; token is authorization — clients never send `tenant_id`.  
- Single-use on successful check-in; `retry` rotates hash and invalidates the previous QR.  
- Cancel / expire → immediate reject. Duplicate enroll of same IMEI → `RECOVERY_REQUIRED`.

## What QR does **not** do

Scanning once does **not** permanently lock the device across factory reset. After an ordinary wipe, Device Owner is gone unless Zero-touch, OEM enrollment, or a new QR session re-provisions the unit. See ANDROID-ENROLLMENT factory-reset section.

## Compatibility (planning; fill from lab)

| Dimension | Planning target | Evidence |
|-----------|-----------------|----------|
| OS | QR Device Owner documented from Android 7+; **pilot target Android 10+** for suspend + lock-task | Lab |
| Gesture | AOSP 6-tap; Samsung/Xiaomi/OPPO/vivo equivalents | Matrix |
| GMS | Required for Play/FCM; non-GMS out of pilot (D-052) | Desk + lab |
| Checksum extra | Must match installed APK or Setup Wizard fails | Lab per APK build |

## Lab vs shop

| Path | When |
|------|------|
| ADB `dpm set-device-owner` | Lab only, empty accounts, **ask before wipe** |
| 6-tap QR after APK already installed | Lab if download URL blocked |
| 6-tap QR + download URL + checksum | Target shop path |

Do not treat ADB owner as shop enrollment success.
