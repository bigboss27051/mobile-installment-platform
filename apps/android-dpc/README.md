# MIP DPC (`lab` / `shop` flavors)

Android Device Policy Controller (`com.mip.dpc`). **Lab evidence ≠ production Device Owner / financing approval / Play distribution.**

## Flavors

| Flavor | Version | Default `API_BASE_URL` |
|--------|---------|-------------------------|
| `lab` | `0.1.19-lab` | `http://10.0.2.2:3000/api/v1` (override with `-PmipApiBaseUrl=…`) |
| `shop` | `0.2.0-shop` | **empty** unless `-PmipApiBaseUrl=https://…/api/v1` |

`applicationId` stays `com.mip.dpc` for both. Admin component: `com.mip.dpc/com.mip.dpc.MipDeviceAdminReceiver`.

## What it does

- Reads enrollment extras from Enterprise QR / provisioning and POSTs check-in
- Command delivery via WorkManager + FCM; Lock Task (`MpPayLockActivity`) + package suspend
- REMINDER notification; LOCK preserves emergency dial (`tel:112`)
- Lab-only wipe activity requires human confirm — does not clear Google FRP

## Build

```bash
cd apps/android-dpc
./gradlew test
./gradlew assembleLabDebug
./gradlew assembleShopRelease -PmipApiBaseUrl=https://api.example.com/api/v1
```

Outputs under `app/build/outputs/apk/…`.

### Release signing (shop)

Optional `apps/android-dpc/keystore.properties` (gitignored — never commit):

```properties
storeFile=../path/to/shop.keystore
storePassword=…
keyAlias=…
keyPassword=…
```

Without this file, `assembleShopRelease` still builds an unsigned/debug-signed artifact depending on AGP defaults — host only a properly signed APK for shop QR download.

## Host APK for enrollment QR

1. Build shop APK (HTTPS API base).
2. Host over HTTPS (see [DPC-HOSTING-CHECKLIST.md](../../docs/device-management/DPC-HOSTING-CHECKLIST.md)).
3. Checksum for `DPC_PACKAGE_CHECKSUM` (Android base64url SHA-256, no padding):

```bash
../../scripts/dpc-apk-checksum.sh app/build/outputs/apk/shop/release/app-shop-release.apk
```

4. Set API env: `DPC_COMPONENT_NAME`, `DPC_DOWNLOAD_URL`, `DPC_PACKAGE_CHECKSUM`, `DPC_ENROLLMENT_ENDPOINT` (`https://…/api/v1/devices/enroll/check-in`).
5. Merchant Web enroll preflight must show DPC configured before Issue QR.

## Ops notes

- Do not factory-reset a phone without asking.
- Do not put Wi-Fi passwords or secrets in the QR.
- Do not require Play Protect disable (D-044).
- Shop floor steps: [SHOP-FLOOR-ANDROID-RUNBOOK.md](../../docs/device-management/SHOP-FLOOR-ANDROID-RUNBOOK.md).
