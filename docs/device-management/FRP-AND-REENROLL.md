# Factory Reset Protection (FRP) and re-enroll

**Audience:** lab operators, shop staff, agents implementing enrollment recovery.  
**Related:** [ANDROID-ENROLLMENT.md](./ANDROID-ENROLLMENT.md), [HUMAN-OPS-NOW.md](./HUMAN-OPS-NOW.md), plan `docs/superpowers/plans/2026-11-21-android-frp-after-wipe.md`.

## What FRP is

On GMS Android, after a **factory reset**, Setup Wizard may require the **previous Google account** that was on the device (Factory Reset Protection). This is Google/OEM account protection. It is **not** our DPC Lock Task Mode and **not** something the platform can clear remotely.

## Lab finding (2026-11-21)

Xiaomi Pad 6 was Device Owner (`com.mip.dpc`). After factory reset, FRP appeared **before** QR Device Owner provisioning could run again. Ordinary wipe removes Device Owner; FRP can still block the next enrollment until the prior account unlocks the unit.

## Rules (non-negotiable)

1. **Ask before any wipe** (personal or lab).
2. **Do not** instruct Play Protect off (D-044).
3. **Do not** claim one QR / one check-in survives wipe (R-024).
4. **Do not** use factory reset as collections.
5. **Do not** build or document remote FRP bypass, Google password storage, or “clear FRP” APIs.
6. After FRP is cleared, issue a **new** enrollment session / QR (old `enc_` token is dead).

## Lab stock preference

| Preference | Why |
|------------|-----|
| Best | New / never signed into a personal Google account before first DO |
| OK | Dedicated lab Google account whose credentials the operator can use for FRP |
| Bad | Personal Google accounts on the unit (FRP locks the next wipe to that person) |

## Shop SOP (customer or staff wipe → re-enroll)

1. Confirm the person at the counter can unlock FRP with the **same Google account** previously used on the phone, **or** the unit is new / never personal-accounted.
2. Complete FRP + Wi-Fi on the device (staff do not type customer Google passwords into Merchant Web).
3. Staff: Merchant Web **Devices** → recovery panel → type `REENROLL` + reason (or API `POST /api/v1/devices/:id/recovery-requests`). This cancels open enrollment sessions for that device/IMEI, clears the device agent token, expires queued lock commands, and resets desired/platform policy to `NONE`. **No** remote FRP clear.
4. Merchant Web **ตั้งค่าร้าน** must already be saved (four attestations, no Google email or password). Then complete the enroll-page FRP checklist and create a **new** enrollment session → show QR (no secrets in QR). Old `enc_` tokens are invalid. If create or QR returns `SHOP_SETUP_REQUIRED`, save **ตั้งค่าร้าน** first.
5. 6-tap → scan → custom DPC Device Owner → check-in → activate / bind as usual.
6. Audit is `DeviceAuditAction.RECOVERY` — not a collections lock.

If the customer cannot unlock FRP: stop. OEM/Google account recovery is out of band. Do not invent a platform unlock.

## Shop-floor steps (no adb / no PC)

Normal customer re-enroll after wipe must **not** depend on USB debugging, `dpm set-device-owner`, or a laptop.

| Step | Who | Action |
|------|-----|--------|
| 1 | Staff | Ask before wipe; confirm FRP account available |
| 2 | Customer/staff on device | Unlock FRP on-device with previous Google account |
| 3 | Staff | Merchant Web: recovery `REENROLL` + reason |
| 4 | Staff | **ตั้งค่าร้าน** saved, then enroll page: FRP attestations → Issue **new** QR |
| 5 | Staff/customer | Welcome 6-tap → scan QR → wait for DO + check-in |
| 6 | Staff | Activate + bind contract when session allows |

Lab-only shortcuts (`adb`, sideload + `dpm`) are for engineering evidence — **not** shop SOP.

## Zero-touch / FRP exemption

Optional later for reseller-pre-registered units (D-049). Mark **BLOCKED** until lab proof exists. Not required for the default QR shop path.

## Product copy (short)

- Before wipe: “After reset, Google may ask for the previous account. Our app cannot skip that screen.”
- After wipe, before new QR: “Unlock FRP on the phone first, then scan a new QR.”
