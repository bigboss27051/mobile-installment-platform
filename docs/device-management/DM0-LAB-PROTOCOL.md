# DM0 lab protocol

Product architecture is chosen (D-042, D-043). This lab **does not reopen** those decisions. It produces **evidence** for production claims and the compatibility matrix.

**Do not** implement DM1 APIs as part of this protocol. Sandbox Google/Apple consoles and vendor trial accounts are enough.

## Android (AMAPI)

Minimum: **3 GMS SKUs** common in Thai retail (e.g. Samsung + Xiaomi + OPPO or vivo), Android 10+ if available.

For each SKU record: model, OS, 6-tap QR available Y/N, AMAPI QR enroll **without** Play Protect off Y/N, enterprise id, IMEI visible to AMAPI, notes.

Also:

1. Map policy levels 1–5 to AMAPI `Policy` fields; mark gaps (especially lock-task).  
2. One **Zero-touch** unit via the existing reseller vs one **walk-in QR** unit.  
3. Confirm whether **one AMAPI enterprise per tenant** is creatable (D-053).

Fail = SKU listed **unsupported** (cannot sell installment), not a Play Protect SOP.

## iOS (Model B)

1. One merchant-like ABM org (or trial).  
2. Connect chosen/trial **MDM vendor**; assign server in ABM.  
3. Shop iPhone **Configurator** prepares a wiped target iPhone.  
4. Confirm Remote Management shows **merchant** legal name.  
5. Complete Setup Assistant **with** passcode; Apple ID optional per customer.  
6. Check-in visible in vendor + note identifiers (UDID/serial).  
7. Attempt DeviceLock-class command; confirm Lost Mode is **not** used.

Record Configurator iOS version and target iOS version.

## Exit (documentation)

Fill `docs/device-management/COMPATIBILITY-MATRIX-RESULTS.md` when lab runs (file not created until there is data). Then DM1 may start.
