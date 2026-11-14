# Device Management — open vs accepted decisions

Legend: **Accepted** (may implement against) · **Pending** (DM0 or legal/Apple/Google must answer) · **Recommendation** (not a decision).

## Accepted (this documentation revision)

| ID | Decision |
|----|----------|
| D-003 / D-004 | Graduated 5-level enforcement remains the *post-enrollment* Android product; merchants configure presets. |
| D-041 | R2 is a provisioning + enrollment platform, not only a command queue. |
| D-044 | Disabling Google Play Protect is **not** a required enrollment step. |
| D-045 | QR / Configurator payloads must not contain passwords, private keys, or integration secrets. |
| D-046 | R2 delivery is sliced DM0–DM5. Production Device Owner / MDM claims stay BLOCKED until evidence. |
| Existing | Lost Mode must not be used for debt collection. Emergency calling remains at all levels. Unverified payments must not lock devices. |

## Pending — Android

| Topic | Options | Recommendation (not decided) | Validation |
|-------|---------|------------------------------|------------|
| Management stack | (1) Android Management API + Google-hosted EMM (2) Custom DPC Device Owner (3) Hybrid: AMAPI policies + companion app (4) Third-party EMM | **(3) Hybrid** if AMAPI can express levels 1–5; else **(2)** for lock-task UX we fully control | Enroll 3+ OEM SKUs with QR; map each level to AMAPI `Policy` vs DPC APIs |
| Enrollment modes | QR (6-tap), Zero-touch, NFC, DPC extra, QR from AMAPI | **QR for shop counter** in pilot; Zero-touch optional for high-volume merchants with reseller | Confirm QR extras for chosen stack; Zero-touch Thai reseller availability |
| Min OS / SKU | TBD compatibility matrix | Android 8+ fully managed as *target*; prove 10/12/14 and Samsung/Xiaomi/OPPO/Vivo common in TH retail | Device lab in DM0 |
| Play distribution | Play-distributed DPC vs sideload URL in QR | Prefer Play or AMAPI DPC so Play Protect is not disabled | Install without Play Protect off |

## Pending — iOS

| Topic | Options | Recommendation (not decided) | Validation |
|-------|---------|------------------------------|------------|
| Apple org ownership | Model A platform ABM · Model B merchant ABM · Model B + commercial MDM | **Model B + commercial MDM adapter** for SaaS isolation; Model A only if Apple counsel confirms multi-customer ADE | Apple Business enrollment, D&B/legal entity, MDM server assignment |
| Enrollment method | ADE (zero-touch), Configurator iPhone, Configurator Mac, Account-driven User Enrollment | **Supervised** path required for meaningful management. Configurator-on-iPhone is the *observed retail* method; ADE is better at scale | Configurator iOS version, Mac Configurator 2, ADE with 1 test org |
| MDM implementation | In-house MDM protocol + APNs vs vendor (Jamf, Mosyle, Kandji, SimpleMDM, MicroMDM, etc.) | **Vendor MDM adapter** first (`MdmProviderPort`); in-house MDM is a multi-quarter protocol project | Push cert, check-in, InstallProfile, DeviceLock, query |
| Apple ID / passcode / location | Competitor skips Apple ID during setup | **Do not require skipping** security/privacy screens. Customer may use personal Apple ID unless DM0 proves Managed Apple ID is mandatory | Legal + UX review |
| Eligibility | ABM vs Apple School Manager; Thailand entity; volume | Unknown until merchant/platform applies | Apple program status |

## Pending — product / legal

| Topic | Why it is open |
|-------|----------------|
| Contract disclosure text for enrollment + graduated restriction | PDPA / consumer protection (R-001) |
| Whether device management is optional per contract or mandatory SKU | Entitlements exist in vision; packaging not sold yet |
| IMEI vs serial vs Android `enterpriseSpecificId` as binding key | Duplicate-device handling |
| Merchant offboarding: who unenrolls Apple devices if Model B | Needs Model A/B choice |

When DM0 closes an item, add a Decision Log row and replace “Pending” here.
