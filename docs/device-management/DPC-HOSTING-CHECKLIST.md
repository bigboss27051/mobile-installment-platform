# DPC APK hosting checklist

Shop QR Device Owner download uses `DPC_DOWNLOAD_URL` + `DPC_PACKAGE_CHECKSUM` (SHA-256). QR payloads must never contain passwords or private keys (D-045).

## Checklist

1. Build a signed APK (lab APKs are not Play production claims).
2. Host over **HTTPS** only (CDN or object storage with TLS).
3. Compute checksum (Android **base64url** SHA-256): `scripts/dpc-apk-checksum.sh path/to/app.apk` → set `DPC_PACKAGE_CHECKSUM`.
4. Set `DPC_COMPONENT_NAME` (e.g. `com.mip.dpc/com.mip.dpc.MipDeviceAdminReceiver`).
5. Set `DPC_ENROLLMENT_ENDPOINT` to public `https://…/api/v1/devices/enroll/check-in`.
6. Confirm Merchant Web enroll preflight / `GET /api/v1/devices/enrollment/dpc-config-status` shows configured.
7. Rotate APK: new URL and/or new checksum; issue **new** enrollment QR after rotate.
8. Do not require Play Protect disable (D-044).
9. Floor steps: [SHOP-FLOOR-ANDROID-RUNBOOK.md](./SHOP-FLOOR-ANDROID-RUNBOOK.md). Prefer `shop` flavor APK ([apps/android-dpc/README.md](../../apps/android-dpc/README.md)).

## Explicit non-claims

- Hosting an APK ≠ Google Play / Android Enterprise financing approval
- Lab GitHub Releases URLs are for development evidence only
- Zero-touch / FRP exemption remains BLOCKED without reseller proof (D-049)
