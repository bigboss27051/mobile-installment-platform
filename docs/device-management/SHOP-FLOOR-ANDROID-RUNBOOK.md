# Shop-floor Android enrollment runbook

**Audience:** store staff. **No adb / no laptop required** for the normal path.  
**Software pack ≠ shop-ready claim:** multi-SKU evidence, Play/Enterprise approval, and financing-lock legal clearance remain separate gates ([PRODUCTION-FEASIBILITY.md](./PRODUCTION-FEASIBILITY.md)).

## Before handover (new / wiped unit)

1. Prefer stock with **no personal Google account** (or a known shop FRP account). See [FRP-AND-REENROLL.md](./FRP-AND-REENROLL.md).
2. Power on → Wi-Fi → if FRP appears, unlock **on the device** with the previous Google account (never type passwords into Merchant Web).
3. Merchant Web → **ตั้งค่าร้าน** once per shop: tick all four items and save. One item is that someone at the shop can unlock FRP on the device with the shop Google account. Do not type that email or password into the page. Android QR stays blocked until this save.
4. Merchant Web → **Enroll**:
   - Confirm DPC status shows ready (server `DPC_*` configured). If missing, stop — ops must host APK + set env ([DPC-HOSTING-CHECKLIST.md](./DPC-HOSTING-CHECKLIST.md)).
   - Complete three FRP attestations.
   - Consent → Create session → Issue QR (no secrets in QR). If the page says shop setup is required, go back to **ตั้งค่าร้าน**.
5. On phone: Welcome **6 taps** → scan QR → wait for Device Owner + check-in (`ENROLLING`).
6. Staff: activate device management + bind contract (reason required).
7. Spot-check: heartbeat / policy panel; under LOCK, emergency dial **112** must work.

## After customer wipe / re-enroll

1. Ask before wipe. Platform **cannot** clear FRP remotely.
2. Unlock FRP on-device → Wi-Fi.
3. Devices → recovery → **REENROLL** + reason.
4. New enroll session + **new** QR (old token dead).
5. 6-tap → scan → check-in → activate/bind again.

## Do not

- Disable Play Protect as an SOP (D-044).
- Use factory reset as collections.
- Use `adb` / `dpm set-device-owner` on the shop floor (lab-only).
- Claim production Device Owner from one lab Pad SKU.

## Related

- [HUMAN-OPS-NOW.md](./HUMAN-OPS-NOW.md)
- [ANDROID-ENROLLMENT.md](./ANDROID-ENROLLMENT.md)
- [apps/android-dpc/README.md](../../apps/android-dpc/README.md)
