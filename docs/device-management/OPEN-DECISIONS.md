# Device Management — open vs accepted decisions

Legend: **Accepted** (implement against) · **Pending** (lab, vendor, or legal copy).

## Accepted (stakeholder 2026-11-14)

| ID | Decision |
|----|----------|
| D-003 / D-004 | Graduated 5-level enforcement remains post-enrollment Android product. |
| D-041 | Provisioning + enrollment platform. |
| D-042 | **Android Management API** as EMM. No custom DPC as primary. |
| D-043 | **iOS Model B** + vendor MDM (`MdmProviderPort`) + Configurator on iPhone. Apple rules (D-047). |
| D-044 | Play Protect disable is not a required step. |
| D-045 | No secrets in QR / Configurator payloads. |
| D-046 | DM0–DM5 slices; production claims need evidence. |
| D-047 | Do not require skipping iOS passcode, Apple ID, Location Services. |
| D-049 | QR default at counter; Zero-touch when reseller pre-registered the unit. |
| D-050 | Device management **mandatory**; block handover until enrollment completed. |
| D-051 | Legal/PDPA contract wording **after** mockups. |
| D-052 | Supported Android = GMS + sold-by-merchant + matrix pass. |
| D-053 | One AMAPI enterprise per tenant (provisional). |
| Existing | Lost Mode forbidden for collections. Emergency calling. No lock from unverified payments. |

## Still pending

| Topic | Why |
|-------|-----|
| **D-054 AMAPI ToS vs EMI lock** | Google forbids payment-based device restriction on AMAPI unless they grant an exception |
| Exact MDM vendor (Jamf, Mosyle, SimpleMDM, …) | Adapter exists; vendor SKU not chosen |
| AMAPI device quota (often 0 until partner form) | D-053 / usage page |
| Levels 4–5 mapping onto AMAPI `Policy` (lock-task) | May need UX companion, not a second EMM |
| Compatibility matrix rows (Samsung/Xiaomi/OPPO/vivo + iOS versions) | Hardware lab — [DM0-LAB-PROTOCOL.md](./DM0-LAB-PROTOCOL.md) |
| Per-merchant ABM signup success in Thailand | Ops, not architecture |
| IMEI vs `enterpriseSpecificId` as bind key | Duplicate handling |
| Contract disclosure / consent text | D-051 draft in LEGAL-COPY-D-051-DRAFT.md — counsel must review; not live copy |
| Merchant offboarding unenroll SOP details | Model B: merchant ABM admin + our revoke `secret_ref` |

Do not re-open D-042/D-043 without a new Decision Log row.
