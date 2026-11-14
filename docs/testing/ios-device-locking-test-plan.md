# iOS device locking test plan

**Hardware tests require explicit authorization.** Do not factory-reset a physical iPhone from this plan without a human OK.

## Software (IOS-A / IOS-B — no MDM)

| Case | How | Pass |
|------|-----|------|
| Lock UI gallery | Customer app → Lock screens (preview) | All listed screens render; locked copy does **not** claim OS Single App Mode |
| Overdue + QR | Login OTP → contract → lock status + sandbox PromptPay | QR shown; paid only on `SUCCEEDED` |
| Tenant isolation | Backend lock-status / portal tests | Other tenant/customer 404 |
| Sandbox MDM port | Unit tests | Commands stay `QUEUED`; never `ACKNOWLEDGED` as locked |
| Deep link parser | Unit tests | `mipcustomer://lock?screen=` maps to a screen; no secrets in URI |

Commands: `cd backend && pnpm test -- lock-presentation mdm-provider portal`; `cd apps/customer-mobile && flutter test`.

## Hardware (IOS-C–F — BLOCKED until ABM + vendor)

| Case | Notes |
|------|--------|
| Fresh setup | New or authorized-erased iPhone |
| Configurator enrollment | Shop host iPhone; Remote Management shows merchant name |
| ADE | Serial in ABM |
| Single App Mode on / off | Bundle ID = customer app; reboot persistence |
| Device offline | Unlock command queued; OS stays locked until check-in |
| Payment while offline | Intent SUCCEEDED; UI unlock-pending |
| Failed MDM command | Command `FAILED`; business not marked unlocked |
| Device replacement / re-enroll | Recovery types |
| Merchant offboarding | Token revoke; no leftover MDM |

Lost Mode and DeviceLock-as-collections are **fail** if used.

## Evidence

Record iOS version, model, MDM vendor, command UUIDs, and screenshots in `docs/device-management/lab-evidence/`. Without that, do not mark IOS-C/D done.
