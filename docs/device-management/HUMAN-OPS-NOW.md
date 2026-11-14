# Human ops now (not software)

**Date:** 2026-11-14  
**Owner:** stakeholder / ops, not the engineering agent  
**Rule:** without a written Google **allow** and a physical lab pass, **do not claim** Device Owner / MDM works in a shop.

This list can run **in parallel with DM2 software** (activate/bind, no AMAPI HTTP).

## 1. Submit AMAPI permissible-usage inquiry (DM0-006) — first

Printable steps + shopping list: [OPERATOR-PACKET.md](./OPERATOR-PACKET.md).  
Copy-paste English: [GOOGLE-AMAPI-USAGE-INQUIRY.md](./GOOGLE-AMAPI-USAGE-INQUIRY.md).  
**Submit URL:** https://services.google.com/fb/forms/AMAPIUsageInquiry/

1. Create or reuse a Google Cloud project; enable Android Management API; copy **project ID**.  
2. Fill legal entity name + contact email (do not invent credentials in git).  
3. Paste the English text from the inquiry doc into [the AMAPI usage inquiry form](https://services.google.com/fb/forms/AMAPIUsageInquiry/).  
4. Record ticket/email ID in the inquiry doc (`_not submitted_` until you have one).  
5. File Google’s written answer under `docs/device-management/lab-evidence/` (no secrets) and add a Decision Log row for D-054.

Until Google writes **allow**, **do not** implement `policies.patch` or `issueCommand` LOCK / RESET_PASSWORD / kiosk driven by arrears.

## 2. Android lab hardware (DM0-001) — BLOCKED until devices exist

Need **3+ GMS** SKUs the merchant actually sells (Samsung / Xiaomi / OPPO / vivo typical). New or factory-reset.

Checklist: [PHYSICAL-LAB-RUNBOOK.md](./PHYSICAL-LAB-RUNBOOK.md)  
Results table: [COMPATIBILITY-MATRIX-RESULTS.md](./COMPATIBILITY-MATRIX-RESULTS.md)

Do **not** disable Play Protect. Do **not** put Wi-Fi passwords in QR. Staff enter Wi-Fi **on the phone**.

Zero-touch: only if a reseller has already registered the IMEI; otherwise QR at the counter.

## 3. iOS lab (DM0-002) — BLOCKED until ABM exists

Need:

- Merchant (or pilot entity) **Apple Business Manager**  
- MDM vendor **trial** assigned as default MDM for iPhone  
- Shop **Configurator iPhone** (iOS 16+)  
- Target iPhone (iOS 16+), erased, stopped at Wi-Fi in Setup Assistant  

Follow [IOS-ENROLLMENT.md](./IOS-ENROLLMENT.md). Lost Mode is **not** a collections tool.

## 4. Choose MDM vendor (open) + legal copy (D-051)

- Shortlist (not a decision): [MDM-VENDOR-SHORTLIST.md](./MDM-VENDOR-SHORTLIST.md)  
- Draft shop/customer wording including the **30-day leave Remote Management** window: [LEGAL-COPY-D-051-DRAFT.md](./LEGAL-COPY-D-051-DRAFT.md)  

Do not silently close the vendor SKU. Counsel must review D-051 before it is printed on contracts.

## 5. What engineering may do while this is in flight

- Enrollment sessions + stub QR (already on `develop`)  
- **Activate + bind/unbind** against our database only (DM2)  
- Merchant Web wizard that **creates a session and shows stub QR**  

Forbidden until Google **allow** + hardware evidence: AMAPI lock-on-overdue, password reset, kiosk switch from arrears, Lost Mode for debt, production Device Owner / MDM claims.
