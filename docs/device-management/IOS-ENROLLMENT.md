# iOS enrollment

**Status:** Architecture **accepted (D-043)**. Production MDM **BLOCKED** until merchant ABM + vendor MDM lab ([DM0-LAB-PROTOCOL.md](./DM0-LAB-PROTOCOL.md)).  
**Reference UX:** [REFERENCE-VIDEO-OBSERVATIONS.md](./REFERENCE-VIDEO-OBSERVATIONS.md).  
**Ownership:** **Model B** (merchant Apple Business) + vendor MDM via `MdmProviderPort`. Retail path: **Configurator on iPhone**. Follow Apple rules (D-047).

## What Apple actually requires (planning; verify in DM0)

Meaningful management (Remote Management, supervision, DeviceLock-class actions) generally needs:

1. **Apple Business Manager (ABM)** or Apple School Manager — organizational enrollment, not a normal Apple ID.  
2. An **MDM server** assigned in ABM (vendor or in-house) with APNs MDM push certificate.  
3. **Supervision**, typically via:  
   - **Automated Device Enrollment (ADE / former DEP)** — device serial in ABM, assigned to MDM, Setup Assistant shows Remote Management; or  
   - **Apple Configurator** — staff prepare the device (Mac or **iPhone Configurator app**, as in the reference video).  
4. Device in **Setup Assistant** (new or erased). You cannot quietly MDM-supervise a customer’s already-set-up iPhone without erase/ADE.

**Account-driven User Enrollment** is for BYOD and is **not** the installment-collateral path.

### Eligibility and limitations

- Each **merchant** must enroll in Apple Business (Model B). Platform does not host a shared ABM for all shops.  
- Apple programs assume organization-managed devices. Installment sale to a consumer must stay **within Apple rules** (supervision at sale via Configurator/ADE, transparent Remote Management, no stealth). Legal **wording** is deferred (D-051); process must still be lawful.  
- Capabilities are a **subset** of Android; never fake level 5 parity. Lost Mode is **forbidden** for collections.

### Apple Configurator

| Host | Role in retail |
|------|----------------|
| **iPhone (Configurator app)** | **Chosen retail path (D-043).** Shop iPhone prepares the customer iPhone; target reboots into Remote Management. Record host/target iOS versions in the lab. |
| **Mac (Configurator 2)** | Traditional prepare/supervise; USB; more control; less portable at a stall. |

Configurator does **not** replace ABM/MDM: the video still hits **Remote Management** with an organization legal name. Staff need:

- A host device enrolled/authorized for Configurator  
- Network to Apple and the MDM  
- The merchant (or platform) ABM org already linked to MDM  

### Automated Device Enrollment

Better for volume if serials are in ABM **before** setup. Same-day walk-in units often are **not** pre-assigned. Retail pilot should support **Configurator add-to-ABM** (or equivalent “add device to Apple Business”) plus ADE when serials exist.

### Operations that need merchant-side Apple access (Model B)

Merchant ABM admin: accept T&Cs, assign **vendor MDM** server, keep Configurator host iPhones, add customer devices. Platform stores per-tenant `device_management_accounts.secret_ref` only. Remote Management display name = **shop legal name**.

## Target merchant flow (our product)

1. Prerequisites checklist in the wizard (ABM linked, MDM healthy, Configurator host ready) — fail closed with `IOS_PREREQ_UNMET`.  
2. Staff: customer + ACTIVE contract + iOS + consent.  
3. Create enrollment session; show **instructions** (not an Android-style DO QR unless Apple adds an equivalent we validate). Optional: display **shop enrollment code** (like competitor `988887`) bound to the session/tenant.  
4. Staff: erase if needed → **Configurator on shop iPhone** (ADE if serial already in ABM).  
5. Setup Assistant: language, Wi-Fi **on device**, **Remote Management** (customer/staff taps register — this is transparent org management, not stealth).  
6. Customer may set passcode, Location Services, and Apple ID **as they choose**. Product **must not** require skipping those screens.  
7. After MDM check-in, device agent or MDM webhook notifies our backend (`verify`).  
8. On-device or staff-side **activation**: shop code (if used), customer, contract — then bind.  
9. Apply iOS-capable policies only; `UNSUPPORTED_CAPABILITY` otherwise.

Competitor step “skip Apple ID / set up later” is **not** our requirement.

## MDM integration architecture (D-043)

```text
Merchant wizard / staff
        → NestJS Enrollment + Device modules
                → MdmProviderPort (sandbox | production vendor)
                        → Vendor MDM / Apple APNs / check-in
iOS device ← Remote Management / profiles / commands
```

Exact vendor SKU is still open. **Do not** build in-house MDM protocol in DM1–DM3.

## Shop code vs QR

iOS has no 6-tap Enterprise QR equivalent in the reference video. Binding used:

- Organization supervision (MDM)  
- Then **application-level** shop code + customer + contract  

Our design: MDM proves **device identity + supervision**; **activation API** proves **which contract** (staff-authorized, idempotent). Shop code is a tenant enrollment alias, not a secret with admin power; still rate-limit and expire.

## Passcode, Apple ID, location, emergency

- Do not design around “no passcode” or “no Apple ID”.  
- Find My / Activation Lock interactions must be documented in DM0 (risk of customer Activation Lock after enrollment).  
- Emergency calling remains available; no Lost Mode for debt.
