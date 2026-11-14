# DM1 safe scope (until D-054 and hardware lab)

DM0 is **not exited**. This freeze prevents building the forbidden path by accident.

## Shipped in DM1 stub

- `device_enrollment_sessions` + `POST/GET /api/v1/devices/enrollment-sessions`, `.../qr`, `.../cancel`  
- Hashed tokens, Idempotency-Key, tenant isolation e2e, QR JSON without Wi-Fi passwords  
- **No** Google/Apple HTTP; QR extras are a local stub (`session:{id}`), not a live AMAPI token  

Merchant Web **enroll** page creates a session and shows stub QR from the API (still not AMAPI).

## Shipped in DM2 stub (no Google/Apple HTTP)

- `POST /api/v1/devices/activate`, `GET /api/v1/devices/:id/activation`  
- `POST /api/v1/devices/:id/bind-contract`, `POST /api/v1/devices/:id/unbind-contract`  
- Tenant isolation, IMEI must match the contract unit, Idempotency-Key, audit event + reason  
- Unbind is owner-elevated; history retained as `UNBOUND`

## Forbidden until Google writes “allow” for payment-triggered control

- `enterprises.policies.patch` or equivalent driven by overdue / allocation events.  
- `issueCommand` `LOCK` / `RESET_PASSWORD` / kiosk switch driven by arrears.  
- `START_LOST_MODE`, `WIPE` as collections (forbidden even if Google allows AMAPI).

## Forbidden until physical SKU lab has at least one success

- Claiming QR enroll works on Thai retail devices.  
- Shipping Android Device Policy as production-ready.

## iOS (independent of AMAPI ToS)

- Still Model B + vendor MDM.  
- Disclose **30-day leave Remote Management** for Configurator-added devices (R-022). Draft copy: [LEGAL-COPY-D-051-DRAFT.md](./LEGAL-COPY-D-051-DRAFT.md) (counsel must review).  
- No MDM vendor code until a vendor is chosen; `MdmProviderPort` sandbox only.

## Android implementation path (D-057)

Custom DPC + QR is the **implementation** ADR. Do **not** implement AMAPI overdue lock. Do **not** claim shop Device Owner from ADB. **Ask before factory-resetting physical devices.**

AMAPI inquiry (D-054) is optional history; it does not gate Phase 1–3 DPC work.
