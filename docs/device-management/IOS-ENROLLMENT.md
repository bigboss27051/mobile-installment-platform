# iOS enrollment

**Status:** Planning. Production MDM **BLOCKED** until DM0 (Apple program + MDM test env).  
**Reference UX:** [REFERENCE-VIDEO-OBSERVATIONS.md](./REFERENCE-VIDEO-OBSERVATIONS.md).  
**Ownership options:** [TENANT-OWNERSHIP-MODELS.md](./TENANT-OWNERSHIP-MODELS.md).

## What Apple actually requires (planning; verify in DM0)

Meaningful management (Remote Management, supervision, DeviceLock-class actions) generally needs:

1. **Apple Business Manager (ABM)** or Apple School Manager — organizational enrollment, not a normal Apple ID.  
2. An **MDM server** assigned in ABM (vendor or in-house) with APNs MDM push certificate.  
3. **Supervision**, typically via:  
   - **Automated Device Enrollment (ADE / former DEP)** — device serial in ABM, assigned to MDM, Setup Assistant shows Remote Management; or  
   - **Apple Configurator** — staff prepare the device (Mac or **iPhone Configurator app**, as in the reference video).  
4. Device in **Setup Assistant** (new or erased). You cannot quietly MDM-supervise a customer’s already-set-up iPhone without erase/ADE.

**Account-driven User Enrollment** is for BYOD and is **not** the installment-collateral path.

### Eligibility and limitations (unverified)

- ABM eligibility (legal entity, DUNS, region including Thailand) is **not confirmed** for the platform or for typical small retailers.  
- Apple’s programs are built for **organization-owned** devices. Selling the phone to a consumer on installment may conflict with “organization-owned” — **legal + Apple review required**.  
- We cannot centrally manage every merchant’s iPhones without **some** ABM + MDM authorization (Model A or B).  
- Capabilities are a **subset** of Android; never fake level 5 parity. Lost Mode is **forbidden** for collections.

### Apple Configurator

| Host | Role in retail |
|------|----------------|
| **iPhone (Configurator app)** | Observed in the reference video: shop iPhone prepares the customer iPhone (overlay “preparing iPhone”), then target reboots into setup with Remote Management. Requires a prepared host device and Apple’s current Configurator iOS requirements (**version matrix in DM0**). |
| **Mac (Configurator 2)** | Traditional prepare/supervise; USB; more control; less portable at a stall. |

Configurator does **not** replace ABM/MDM: the video still hits **Remote Management** with an organization legal name. Staff need:

- A host device enrolled/authorized for Configurator  
- Network to Apple and the MDM  
- The merchant (or platform) ABM org already linked to MDM  

### Automated Device Enrollment

Better for volume if serials are in ABM **before** setup. Same-day walk-in units often are **not** pre-assigned. Retail pilot should support **Configurator add-to-ABM** (or equivalent “add device to Apple Business”) plus ADE when serials exist.

### Operations that need merchant-side Apple access

If **Model B**: merchant ABM admin invites, assigns MDM server, manages Configurator hosts, accepts T&Cs.  
If **Model A**: merchants do **not** get ABM; they still operate Configurator/Wi-Fi at the counter and our wizard. Remote Management may show the **platform** name unless a display-name feature exists (**unverified**).

## Target merchant flow (our product)

1. Prerequisites checklist in the wizard (ABM linked, MDM healthy, Configurator host ready) — fail closed with `IOS_PREREQ_UNMET`.  
2. Staff: customer + ACTIVE contract + iOS + consent.  
3. Create enrollment session; show **instructions** (not an Android-style DO QR unless Apple adds an equivalent we validate). Optional: display **shop enrollment code** (like competitor `988887`) bound to the session/tenant.  
4. Staff: erase if needed → Configurator prepare **or** ADE boot.  
5. Setup Assistant: language, Wi-Fi **on device**, **Remote Management** (customer/staff taps register — this is transparent org management, not stealth).  
6. Customer may set passcode, Location Services, and Apple ID **as they choose**. Product **must not** require skipping those screens.  
7. After MDM check-in, device agent or MDM webhook notifies our backend (`verify`).  
8. On-device or staff-side **activation**: shop code (if used), customer, contract — then bind.  
9. Apply iOS-capable policies only; `UNSUPPORTED_CAPABILITY` otherwise.

Competitor step “skip Apple ID / set up later” is **not** our requirement.

## MDM integration architecture (recommendation, not decision)

```text
Merchant wizard / staff
        → NestJS Enrollment + Device modules
                → MdmProviderPort (sandbox | vendor | future in-house)
                        → Vendor MDM / Apple APNs / check-in
iOS device ← Remote Management / profiles / commands
```

In-house MDM protocol (check-in, SCEP, APNs, `InstallProfile`) is a large, security-sensitive project. **Do not schedule it inside DM1–DM2.** DM3 uses an adapter + sandbox until a vendor or in-house path is proven.

## Shop code vs QR

iOS has no 6-tap Enterprise QR equivalent in the reference video. Binding used:

- Organization supervision (MDM)  
- Then **application-level** shop code + customer + contract  

Our design: MDM proves **device identity + supervision**; **activation API** proves **which contract** (staff-authorized, idempotent). Shop code is a tenant enrollment alias, not a secret with admin power; still rate-limit and expire.

## Passcode, Apple ID, location, emergency

- Do not design around “no passcode” or “no Apple ID”.  
- Find My / Activation Lock interactions must be documented in DM0 (risk of customer Activation Lock after enrollment).  
- Emergency calling remains available; no Lost Mode for debt.
