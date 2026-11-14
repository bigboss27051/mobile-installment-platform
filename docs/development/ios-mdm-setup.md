# iOS MDM setup (operators)

**Status:** Human/ops checklist. Software cannot complete this without Apple + vendor accounts.  
**Do not** put APNs keys, MDM private keys, or ABM tokens in git. Use `.env.example` keys that point at a secret manager.

## Prerequisites (Model B)

1. Merchant legal entity enrolls in [Apple Business Manager](https://business.apple.com).  
2. Merchant assigns a **commercial MDM** as the MDM server (token from vendor).  
3. Platform stores only `DEVICE_MDM_SECRET_REF` (or per-tenant secret id) — never the file contents in the repo.  
4. Shop **Configurator host iPhone** on iOS 16+ with a Managed Apple Account that may add devices.  
5. Customer phones: iOS 16+ for Configurator-iPhone path; older SKUs need a Mac Configurator 2 lab row or are unsupported.  
6. Customer app bundle ID available to the MDM app catalog / TestFlight.

## Local software

- Backend: NestJS `MdmProviderPort` sandbox (`SANDBOX`) until vendor credentials exist.  
- Flutter: `apps/customer-mobile` iOS target. Run lock **preview** without MDM (`Lock screens (preview)` on login).  
- Merchant Web: iOS enrollment session shows instructions, not a fake Android QR.

## Lab (DM0-002)

Follow [../device-management/PHYSICAL-LAB-RUNBOOK.md](../device-management/PHYSICAL-LAB-RUNBOOK.md). **Ask before erase/reset** of a physical device.

Until lab evidence is in `docs/device-management/lab-evidence/`, production iOS management stays **BLOCKED**.
