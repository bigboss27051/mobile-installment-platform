# iOS MDM architecture (IOS-A)

**Status:** Architecture accepted. **Production MDM BLOCKED** until merchant Apple Business Manager (ABM) + vendor MDM lab evidence.  
**Decisions:** D-043 (Model B + vendor MDM), D-047 (no skip Setup Assistant), D-056 (Single App Mode is the financing lock; not DeviceLock / Lost Mode).  
**Canonical enrollment ops:** [../device-management/IOS-ENROLLMENT.md](../device-management/IOS-ENROLLMENT.md).  
**Ownership models:** [../device-management/TENANT-OWNERSHIP-MODELS.md](../device-management/TENANT-OWNERSHIP-MODELS.md).  
**Vendor shortlist:** [../device-management/MDM-VENDOR-SHORTLIST.md](../device-management/MDM-VENDOR-SHORTLIST.md).

This document is the IOS-A feasibility record. It does **not** claim a working MDM integration.

## Goal

Reproduce the *observable* retail enrollment from `docs/reference/mango_ios.mp4` (Configurator on iPhone → Remote Management with shop legal name → app activation with shop code / customer / contract) and later apply **consented, recoverable** collection policy on **supervised** iPhones.

Do not assume Android Device Owner, kiosk APIs, or “the Flutter app locked the whole phone.”

## Integration decision (A vs B)

| Option | What it is | Verdict for this SaaS |
|--------|------------|------------------------|
| **A. Self-hosted Apple MDM** | NestJS (or sidecar) speaks the Apple MDM check-in protocol, holds APNs MDM push cert, issues configuration profiles and commands | **Rejected for R2 / IOS-C–E.** Requires Apple MDM vendor / push-certificate operations, plist command lifecycle, and 24/7 check-in. No entitlement proof in this repo. High blast radius if we get the protocol wrong. |
| **B. Commercial MDM vendor** | Vendor already has APNs MDM certificate and ABM MDM server assignment. NestJS talks **vendor REST** through `MdmProviderPort` | **Chosen (D-043).** Maps to Model B: each merchant’s ABM assigns *that* vendor as the MDM server. Platform stores `secret_ref` only. |

A vendor still uses Apple’s MDM protocol **behind** the adapter. We do not re-implement check-in, `Connect`, or raw `CommandUUID` plists until/unless we become an MDM vendor ourselves (out of scope).

**SKU still pending:** Jamf, Mosyle, SimpleMDM, Kandji, Intune — see shortlist. Lab must prove: ABM assignment, supervised check-in, **AppLock / Single App Mode** on a known bundle ID, command acknowledgement, and **no Lost Mode** for collections.

## Tenant ownership (SaaS model)

**Chosen: Model B — merchant-owned Apple Business organization** plus **centralized vendor MDM adapter**.

- Remote Management shows the **shop legal name** (matches the reference video org string pattern).  
- Per-tenant MDM tokens in secret storage (`device_management_accounts.secret_ref` when that table ships).  
- Platform does **not** put installment phones into a single platform ABM (Model A) for the retail pilot. Apple’s programs assume organization-managed devices; a shared platform ABM for phones sold to consumers is legally and operationally unverified.  
- Model C (vendor hosts protocol) is the engineering shape of B, not a competing ownership model.

**Unresolved Apple requirements**

- Whether installment-sold consumer iPhones may remain supervised by the *merchant* after legal sale (counsel; D-051 copy).  
- Per-merchant ABM eligibility in Thailand (DUNS / legal entity).  
- Configurator-added devices’ **30-day leave Remote Management** window vs mandatory enrollment (D-050).  
- Activation Lock / Find My interaction after customer Apple ID sign-in.  
- MDM vendor contract, data residency, and Thailand support hours.  
- Bundle ID of the customer app must be installed as a **managed app** before Single App Mode can target it.

## Platform-independent ports

Business logic must not import Apple command payloads. Intended ports (names aligned with existing `MdmProviderPort`):

| Port | Responsibility |
|------|----------------|
| `DeviceManagementProvider` / `MdmProviderPort` | Enqueue management actions; map vendor errors to `UNSUPPORTED_CAPABILITY` |
| `DeviceEnrollmentProvider` | Session instructions, vendor enrollment state (not Android QR) |
| `DevicePolicyProvider` | Desired presentation vs **actual** OS enforcement |
| `DeviceCommandProvider` | Command lifecycle (queued → sent → acked/failed) |
| `DeviceStatusProvider` | Inventory / last check-in from vendor |

Apple-specific classes (`AppleMdmProvider`, profile XML, AppLock payload) live only in `backend/src/devices/adapters/` after a vendor is chosen. IOS-A ships a **sandbox** adapter that never reports OS lock success.

Do **not** create `apple_mdm_*` tables that duplicate `devices`, `device_enrollment_sessions`, or (when added) `device_commands`. Vendor command IDs are columns/JSON on generic command rows. Certificates stay in a secret manager, referenced by id.

## Command lifecycle (target; not implemented in IOS-A)

Track: enable/disable Single App Mode, Device Information Query, restriction profile update, authorized profile removal, and DeviceLock **only** as a distinct, non-collections default.

Never set business `LOCKED` / `UNLOCKED` from HTTP 201. Wait for vendor acknowledgement or a reliable device query. Handle APNs delay, offline device, timeout, duplicate callbacks, enrollment removal, and replacement.

## What IOS-A does not do

- No vendor HTTP client, no APNs, no configuration profile bytes in git.  
- No AMAPI changes.  
- No claim that Device Owner / MDM / live lock works.

## External dependencies

- Apple Business Manager per merchant  
- Apple Configurator (iPhone host iOS 16+; Mac Configurator 2 as fallback)  
- Chosen MDM vendor + APNs (vendor-held)  
- Supervised test iPhone (explicit human authorization before any erase)  
- Customer Flutter app bundle ID installed via MDM  
