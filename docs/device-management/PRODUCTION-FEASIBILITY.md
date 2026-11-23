# Production feasibility (device financing)

Prototype Device Owner / MDM lab success is **not** commercial approval. Treat **lab prototype** and **pilot production** as separate milestones (D-046, D-054, D-057).

**2026-11-23 note:** Stripe PromptPay adapter is wired for pilot payments (D-069). Financing lock legal/enterprise clearance remains **Unverified**. Counsel packet: [LEGAL-COUNSEL-PACKET.md](./LEGAL-COUNSEL-PACKET.md). Ops host checklist: [PRODUCTION-DEPLOY.md](../operations/PRODUCTION-DEPLOY.md).

## Android gates

| Gate | Why | Status |
|------|-----|--------|
| Google Android Enterprise / custom DPC distribution eligibility | Shop QR download vs Play | **Unverified** (hosting checklist only) |
| Device financing / EMI policy | AMAPI explicitly forbids payment-based restriction (D-054). Custom DPC may still conflict with Play / Enterprise / OEM policies | **Unverified** — do not claim legal clearance |
| Manufacturer compatibility | 6-tap, DO, suspend, lock-task | Matrix **NOT RUN** on shop SKUs |
| Factory-reset re-enrollment | DO does not survive ordinary wipe | Zero-touch / OEM / FRP **unverified** for this product |
| Play Protect | Must not require disable (D-044) | Design accepted; shop APK warnings **unverified** |
| Emergency calling under LOCK | Hard requirement | Tests pending hardware |

AMAPI remains an **inquiry path** (human form in [OPERATOR-PACKET.md](./OPERATOR-PACKET.md)). A Google exception would **not** automatically replace the DPC prototype; it would be a new ADR.

## iOS gates

| Gate | Why | Status |
|------|-----|--------|
| MDM capability / entitlements | We use a vendor (`MdmProviderPort`), not in-house protocol | Vendor SKU **open** |
| Apple Business prerequisites | Model B: each merchant org | **Unverified** in Thailand ops |
| Merchant vs platform ABM | Platform-owned ABM (Model A) not used for retail pilot | Model A **rejected** unless Apple evidence |
| MDM provider terms | Financing / consumer devices | **Unverified** |
| Single App Mode eligibility | Supervised AppLock on customer app bundle | Lab **BLOCKED** |
| 30-day leave Remote Management | Configurator-added devices (R-022) | Disclose; counsel (D-051) |

## Shared gates

- PDPA / consumer-protection wording (D-051)  
- No lock from unverified payments  
- RBAC + audit on every restrict/unlock/enroll  
- Tenant isolation tests  
- Recovery / unenroll SOP including merchant offboarding  

## Explicit non-claims

- QR scan once ≠ permanent lock after every factory reset.  
- iOS does not reproduce Android package suspend or Device Owner.  
- Flutter full-screen is not OS lock.  
- Development Device Owner is not Google/Apple financing approval.  
