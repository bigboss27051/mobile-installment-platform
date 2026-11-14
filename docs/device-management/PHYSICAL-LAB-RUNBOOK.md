# Physical DM0 lab runbook (human + hardware)

Desk lab cannot enroll devices. Complete this checklist in a shop/lab, then paste results into [COMPATIBILITY-MATRIX-RESULTS.md](./COMPATIBILITY-MATRIX-RESULTS.md).

Do **not** disable Play Protect. Do **not** put Wi-Fi passwords in QR. Do **not** skip iOS passcode.

## Before Android

1. Google Cloud project; enable Android Management API.  
2. Service account with `androidmanagement` scope.  
3. Submit **quota** request (expect 0 devices until approved).  
4. Submit **permissible usage** inquiry for installment/EMI restriction ([form on AMAPI usage page](https://developers.google.com/android/management/permissible-usage)).  
5. Create signup URL; bind **one test enterprise**; optionally a **second** enterprise (D-053).  
6. `enrollmentTokens.create` with `oneTimeOnly: true`, duration 1h, `allowPersonalUsage` disallowed.  
7. Render `qrCode` JSON as QR **without** adding `PROVISIONING_WIFI_PASSWORD`.

## Per Android SKU (min 3 GMS)

Factory reset → Welcome → tap 6 times → scan → Wi-Fi **on device** → accept organization device → confirm Cloud DPC / Android Device Policy installed → note enterprise device id and IMEI.

Record: model, OS, 6-tap Y/N, Play Protect left on Y/N, enroll Y/N, errors.

Optional: one Zero-touch unit from reseller vs one QR walk-in.

## Before iOS

1. Merchant-like ABM (legal entity).  
2. MDM vendor trial; assign as default MDM for iPhone.  
3. Shop iPhone iOS 16+ with Apple Configurator; Managed Apple Account (Device Enrollment Manager).  
4. Target iPhone iOS 16+, erased, stop at **Choose a Wi-Fi Network**.

## iOS run

Configurator add → assign MDM → reboot → Remote Management shows **shop name** → Register → set passcode → optional Apple ID → Settings shows supervised → MDM check-in → **DeviceLock** (not Lost Mode) → note 30-day leave-RM if shown.

## After

Attach screenshots (no secrets) under `docs/device-management/lab-evidence/` (git-ignore secrets). Update matrix. Only then consider DM1 Google/Apple API work.
