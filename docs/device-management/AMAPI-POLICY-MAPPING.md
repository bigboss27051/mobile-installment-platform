# AMAPI policy mapping (desk lab)

**Historical / alternative only (D-042 superseded by D-057).** Maps product levels 1–5 onto [AMAPI Policy](https://developers.google.com/android/management/reference/rest/v1/enterprises.policies). **Not applied to a device. Not the lock adapter.** Emergency calling: never set `outgoingCallsDisabled: true`. Production lock path is custom DPC Lock Task Mode ([../architecture/android-kiosk-locking.md](../architecture/android-kiosk-locking.md)).

**ToS warning:** payment-triggered use of these policies may violate [AMAPI Permissible Usage](https://developers.google.com/android/management/permissible-usage). Mapping is technical only.

| Level | Product intent | AMAPI fields (proposed) | Gap |
|-------|----------------|-------------------------|-----|
| 1 Normal | Usable phone; baseline | Fully managed; `playStoreMode` BLACKLIST empty; `outgoingCallsDisabled` false; companion app `FORCE_INSTALLED` optional | None expected |
| 2 Warning | Notify; no hard restrict | Same policy as 1; notifications via **our** FCM/SMS/LINE, not AMAPI | AMAPI is not a messaging product |
| 3 App limit | Block entertainment/social; keep phone/chat/banking | `applications[].installType: BLOCKED` (or `disabled: true`) for denylist packages; keep dialer/messages/banking `AVAILABLE`/`FORCE_INSTALLED`. Alternative: `playStoreMode: WHITELIST` + allowlist | Must maintain Thai package denylist per OEM (YouTube, TikTok, games). **Lab required.** Whitelist is safer but harsher |
| 4 Screen lock | Lock with call-shop path | `issueCommand` type `LOCK`; and/or `passwordPolicies` + `RESET_PASSWORD`+`LOCK_NOW`; companion as lock-task **or** `kioskCustomLauncherEnabled` with only companion + Phone | **KIOSK/dedicated device** is a different UX (single-purpose). Consumer phone + kiosk is a **gap**. Prefer `LOCK` + companion overlay if ToS allows. Do **not** use `START_LOST_MODE` for collections |
| 5 Suspend | Max restrict; emergency remains | Stronger than 4: `installAppsDisabled`; kiosk launcher with Phone + emergency; still `outgoingCallsDisabled: false` | Same kiosk-vs-consumer gap. `WIPE` / factory reset **forbidden** as collection |

Deprecated: `lockTaskAllowed`, `statusBarDisabled` — use `KIOSK` / `kioskCustomLauncherEnabled` if dedicated mode is chosen.

**Commands never for debt:** `START_LOST_MODE`, `WIPE`, factory reset as punishment.

**Companion app:** allowed for “call shop / pay QR” UI (D-042). It is not a second EMM.
