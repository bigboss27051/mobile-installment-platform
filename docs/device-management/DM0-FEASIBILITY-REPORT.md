# DM0 Feasibility Report

**Date:** 2026-11-14  
**Kind:** Desk lab (official docs). **No physical devices, Google Cloud project, ABM org, or MDM tenant were available in this environment.**  
**Does not reopen** D-042/D-043 as product intent. **Does** flag a Google ToS conflict that can block AMAPI in production.

Sources (retrieved 2026-11-14):

- [AMAPI Permissible Usage](https://developers.google.com/android/management/permissible-usage) (updated 2026-03-30)  
- [Create an enterprise](https://developers.google.com/android/management/create-enterprise)  
- [Enroll and provision a device](https://developers.google.com/android/management/provision-device)  
- [enterprises.policies](https://developers.google.com/android/management/reference/rest/v1/enterprises.policies)  
- [Dedicated device policies](https://developers.google.com/android/management/policies/dedicated-devices)  
- [issueCommand](https://developers.google.com/android/management/reference/rest/v1/enterprises.devices/issueCommand)  
- [Apple: add devices with Configurator](https://support.apple.com/guide/business/add-devices-using-apple-configurator-axm200a54d59/web)  
- Google blog: Zero-touch partners including **Thailand: A2 Network, DTAC**

Hardware results: [COMPATIBILITY-MATRIX-RESULTS.md](./COMPATIBILITY-MATRIX-RESULTS.md)  
Policy map: [AMAPI-POLICY-MAPPING.md](./AMAPI-POLICY-MAPPING.md)  
Hands-on runbook: [PHYSICAL-LAB-RUNBOOK.md](./PHYSICAL-LAB-RUNBOOK.md)

---

## Verdict

| Question | Desk result | Production claim |
|----------|-------------|------------------|
| AMAPI can technically enroll via 6-tap QR using Google’s Cloud DPC | **Yes** (docs). Token + `qrCode` from `enrollmentTokens.create`. Android **7+**. | **Not proven** on Thai retail SKUs |
| Play Protect off required? | **No.** QR installs `com.google.android.apps.work.clouddpc` from Play/managed download URL | Do not add SOP |
| Wi-Fi password in QR? | Google **allows** `PROVISIONING_WIFI_*`. **Our rule D-045 forbids it.** Staff enter Wi-Fi on device. | Follow D-045 |
| One enterprise per tenant (D-053) | **Yes, API supports** multiple enterprises per Cloud project / org | **Quota is per project**, not multiplied per enterprise |
| Default AMAPI device quota | Community + Google: new projects often **0 devices** until partner justification; initial grant **up to 500** via form; >500 needs Android Enterprise application. Max **2 projects** per developer (dev+prod) | **BLOCKED** until Google quota + partner review |
| Zero-touch in Thailand | Historical partners **A2 Network, DTAC** listed by Google. Still need **this** merchant’s reseller contract. Walk-in = QR | Matches D-049 |
| iOS Configurator on iPhone | **Official:** host **iOS 16+**, target **iOS 16+** at Wi-Fi Setup pane; Managed Apple Account with device-management role; **30-day user release window** after enroll | **Product risk** for mandatory enroll (D-050) |
| Model B + vendor MDM | Required: merchant ABM, MDM assigned in ABM, APNs. Vendor SKU still open | Lab not run |

---

## CRITICAL: AMAPI Permissible Usage vs installment lock

Google **explicitly disallows**:

> Device financing solutions — including those used in conjunction with hardware lease arrangements or other B2C/retail scenarios — that manage, restrict, or control device usage or functionality **based on payment status** (e.g., non-payment of Equated Monthly Installments (EMI)).

That is **this product’s levels 3–5 driven by overdue**. Using AMAPI as the EMM for **payment-based restriction** is **out of stated policy** unless Google grants an exception via [their inquiry form](https://developers.google.com/android/management/permissible-usage).

**Implications (do not ignore):**

1. D-042 remains the **intended** stack but is **not production-legal under published AMAPI ToS**.  
2. Do **not** start DM1 AMAPI integration for lock-on-overdue until Google answers, **or** split: AMAPI only for inventory/enrollment (if even that is allowed) vs another stack for restriction.  
3. Custom Device Owner DPC is **not automatically allowed** either; Android Enterprise / Play policy can still reject financing lockers. AMAPI is the document that says it in plain language.  
4. **Next mandatory action:** submit Google’s permissible-usage inquiry; record as **D-054** (pending). Legal counsel in parallel (D-051 copy still later).

Until that returns, DM1 may still build **our** enrollment session tables (tenant-safe, no Google calls) but must **not** claim AMAPI production.

---

## Android desk findings (keep D-042 technically)

**Enrollment**

- `enterprises.enrollmentTokens.create` → `qrCode` JSON with Cloud DPC component + checksum + Play download URL + `EXTRA_ENROLLMENT_TOKEN`.  
- Default token TTL **1 hour** (we wanted 30–120 min — compatible). `oneTimeOnly` supported.  
- Fully managed: `allowPersonalUsage` = personal usage **disallowed**.  
- 6-tap QR is the documented counter path.

**Enterprises**

- Customer-managed signup: `signupUrls.create` → admin Gmail **not already bound** → `enterprises.create`.  
- `enterpriseDisplayName` / `primaryColor` / `logo` can brand provisioning UI (not a substitute for iOS shop legal name).  
- Multiple enterprises per project: **supported**. Device **quota shared** across them.

**Commands (collections)**

- `LOCK`, `RESET_PASSWORD` exist.  
- `START_LOST_MODE` exists on AMAPI — **do not use for debt** (same spirit as iOS Lost Mode ban).  
- `WIPE` — not a collections action.  
- Kiosk = `installType: KIOSK` or `kioskCustomLauncherEnabled` (deprecated `lockTaskAllowed`).

See [AMAPI-POLICY-MAPPING.md](./AMAPI-POLICY-MAPPING.md) for levels 1–5 **technical** mapping and gaps.

---

## iOS desk findings (keep D-043)

- Configurator iPhone path is real and matches the reference video.  
- Devices added this way get supervision + MDM, then a **30-day** “leave Remote Management” window. After 30 days it behaves like ADE. **Mandatory enroll (D-050) cannot prevent the customer from leaving RM during those 30 days** if Apple shows the control. Product/legal must disclose this.  
- ADE from Apple/reseller is better when serials are in ABM (no 30-day window in the same way as Configurator-added devices — confirm in physical lab).  
- Host and customer phones: **iOS 16+**. Older iPhones in Thai retail **fail the Configurator-iPhone path** → matrix = unsupported for installment or use Mac Configurator 2 (separate lab).  
- MDM vendor still unchosen. Adapter remains `MdmProviderPort`.

---

## What this session could not do

| Item | Why |
|------|-----|
| Enroll 3 Android SKUs | No hardware, no Cloud project, no AMAPI credentials in `.env` |
| Zero-touch claim | No reseller portal access |
| Create 2 AMAPI enterprises | No `gcloud`/OAuth in this workspace for the product |
| ABM + Configurator | No merchant Apple org |
| DeviceLock on a supervised iPhone | No MDM tenant |

Those remain **BLOCKED**. Run [PHYSICAL-LAB-RUNBOOK.md](./PHYSICAL-LAB-RUNBOOK.md).

---

## Recommended next (order)

1. **Google permissible-usage inquiry** (D-054) — blocks honest AMAPI lock-on-overdue.  
2. Legal note on Configurator **30-day release**.  
3. Physical lab when devices + trial Google/Apple/MDM exist.  
4. Only then DM1 **Google-backed** QR. Session schema without Google can proceed if the team accepts rework.

**DM0 is not exited.** Architecture ADRs exist; **evidence and ToS clearance do not.**
