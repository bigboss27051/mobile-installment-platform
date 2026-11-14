# DM1 safe scope (until D-054 and hardware lab)

DM0 is **not exited**. This freeze prevents building the forbidden path by accident.

## Shipped in DM1 stub

- `device_enrollment_sessions` + `POST/GET /api/v1/devices/enrollment-sessions`, `.../qr`, `.../cancel`  
- Hashed tokens, Idempotency-Key, tenant isolation e2e, QR JSON without Wi-Fi passwords  
- **No** Google/Apple HTTP; QR extras are a local stub (`session:{id}`), not a live AMAPI token  

Merchant Web wizard still mock-only.

## Forbidden until Google writes “allow” for payment-triggered control

- `enterprises.policies.patch` or equivalent driven by overdue / allocation events.  
- `issueCommand` `LOCK` / `RESET_PASSWORD` / kiosk switch driven by arrears.  
- `START_LOST_MODE`, `WIPE` as collections (forbidden even if Google allows AMAPI).

## Forbidden until physical SKU lab has at least one success

- Claiming QR enroll works on Thai retail devices.  
- Shipping Android Device Policy as production-ready.

## iOS (independent of AMAPI ToS)

- Still Model B + vendor MDM.  
- Disclose **30-day leave Remote Management** for Configurator-added devices (R-022) in D-051 copy later.  
- No MDM vendor code until a vendor is chosen; `MdmProviderPort` sandbox only.

## If Google says AMAPI EMI lock is prohibited

Keep D-042 for **enrollment** only if Google allows that slice; otherwise new ADR for a non-AMAPI Android path. Do not silently revert to custom DPC as EMM without a Decision Log row.
