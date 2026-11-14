# Enrollment wizard mockup (Merchant Web / Merchant Mobile)

**Status:** UX wireframe only. No application code. Legal copy TBD (D-051).  
**Rules:** Device management is **mandatory** (D-050). Android = AMAPI QR (D-042, D-049). iOS = Model B + Configurator iPhone (D-043).

Sale cannot be marked **handed over** while enrollment is not `COMPLETED`. Staff may have an `ACTIVE` contract (R1) but the phone stays in-store until this wizard finishes.

## Shared frames

### 0. Gate

```text
Contract CT-…  |  Customer …  |  IMEI …
Device management: REQUIRED

[ Continue to enroll ]
```

If tenant iOS MDM account ≠ `CONNECTED` and platform is iOS → block with `IOS_PREREQ_UNMET` (ABM + vendor MDM + Configurator host).

Consent checkbox placeholder: `[ ] Customer agreed to device management (wording TBD)`. Cannot continue unchecked.

### 1. Platform

```text
( ) Android    ( ) iPhone
[ Start enrollment ]
```

### States (status chip + primary action)

| State | Screen | Primary |
|-------|--------|---------|
| WAITING_FOR_DEVICE | QR or iOS steps | Cancel / Refresh |
| PROVISIONING / ENROLLING | Progress, do not leave | — |
| VERIFYING | IMEI/serial vs stock | Confirm identity |
| ACTIVATING | Binding | — |
| COMPLETED | Success; handover unlocked | Done |
| FAILED / EXPIRED / CANCELLED | Error code | Retry / new session |
| RECOVERY_REQUIRED | Partial enroll | Recovery |

---

## Android frames

### A. Instructions

```text
1. Phone must be new or factory reset (GMS).
2. Connect shop Wi-Fi ON THE PHONE when asked. Do not scan Wi-Fi passwords from this app.
3. On Welcome, tap 6 times → scan this QR.
4. Accept “This device belongs to your organization”.
Do NOT turn off Play Protect.
```

### B. QR

```text
┌─────────────┐
│  AMAPI QR   │
└─────────────┘
Expires 21:10    Session …    [ Regenerate QR ]

Status: Waiting for device …
```

QR contains enrollment token / AMAPI extras only (D-045).

### C. Verify

```text
Reported IMEI  …  Stock IMEI  …  MATCH / MISMATCH
OS  …   Enterprise id  …
[ Confirm and bind ]   mismatch → cannot handover
```

### D. Done

```text
Enrolled with Android Management API
Policy level 1
Handover unlocked — customer may leave with the phone
```

---

## iOS frames

### I. Prerequisites (must all be true)

```text
[x] Merchant Apple Business is active (this shop)
[x] MDM vendor connected
[x] Shop iPhone has Apple Configurator
[x] Customer iPhone is new or erased
[ Start ]
```

Do **not** instruct: skip passcode, skip Apple ID, skip Location Services, Lost Mode.

### J. Steps

```text
1. Open Configurator on the shop iPhone → add this device to Apple Business.
2. Customer iPhone restarts → Setup Assistant.
3. Join Wi-Fi on the device. Remote Management shows THIS SHOP legal name.
4. Tap Register. Complete passcode / Apple ID as the customer chooses.
5. Wait until status = Enrolling, then verify.
Optional shop code (tenant alias):  482910
```

### K. Verify / done

Same as Android C–D, plus “Supervised by {merchant legal name}”.

---

## Blocked handover (all platforms)

Anywhere the UI would print invoice / release IMEI physically:

```text
Cannot complete handover
Enrollment not completed
[ Open enrollment wizard ]
```

Unsupported Android SKU (matrix fail) → **cannot start installment on this IMEI** (D-052), not “enroll anyway”.
