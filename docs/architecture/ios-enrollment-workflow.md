# iOS enrollment workflow (architecture pointer)

**Canonical procedure:** [../device-management/IOS-ENROLLMENT.md](../device-management/IOS-ENROLLMENT.md).  
This file maps that procedure onto IOS-A–C slices and the customer app. Do not fork a second enrollment SOP.

## Actors

| Actor | System |
|-------|--------|
| Staff | Merchant Web enrollment wizard (session + **instructions**, not Android QR) |
| Host iPhone | Apple Configurator (iOS 16+) |
| Customer iPhone | Setup Assistant → Remote Management → customer Flutter app |
| Backend | Enrollment session + activate/bind (DM1/DM2 stubs exist; no Apple HTTP yet) |
| MDM | Vendor assigned in **merchant ABM** (not implemented) |

## Counter path (Configurator)

1. Prerequisites: merchant ABM linked, MDM healthy, Configurator host ready — else `IOS_PREREQ_UNMET`.  
2. Staff: ACTIVE contract + iOS IMEI + consent → `POST /devices/enrollment-sessions` (`platform=IOS`).  
3. Wizard shows **instructions** + optional shop code. `POST .../qr` returns `QR_NOT_APPLICABLE`.  
4. Erase only with explicit human authorization.  
5. Configurator on shop iPhone prepares the customer phone; ADE if serial already in ABM.  
6. Wi-Fi entered **on device**. No secrets in session material (D-045).  
7. Remote Management: shop legal name; customer/staff tap register (transparent).  
8. Do not require skipping passcode, Apple ID, or Location Services (D-047).  
9. After MDM check-in (future webhook/verify): staff **activate** + **bind** (already stubbed in DB).  
10. Customer app (IOS-B) shows enrollment/activation **status**; it does not become Device Owner/MDM. Merchant performs Configurator / ABM / MDM; the customer must not complete complex MDM setup.

## ADE path

Use when serials are in ABM before Setup Assistant. Same backend session; different staff instructions. Walk-in units often need Configurator add-to-ABM.

## Customer app role

The Flutter app is a **companion / lock UI**, not an enrollment agent:

- Activation screen: shop code + contract as **display / staff-assisted** fields. Bind remains staff-authorized (device-agent hints only).  
- Deep link `mipcustomer://lock` opens lock UI; contains no secrets.  
- Managed App Config (future): session id or tenant display name only — never APNs keys.

## Recovery / re-enrollment

Types from the enrollment API: `REENROLL`, `REPLACE`, `UNENROLL`, `RELEASE`, `CONTRACT_CLOSE`. Unenroll/wipe is **not** a collections action. Merchant offboarding revokes `secret_ref` and stops new sessions.
