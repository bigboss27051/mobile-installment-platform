# Device Management — open vs accepted decisions

Legend: **Accepted** (implement against) · **Pending** (lab, vendor, or legal copy).

## Accepted (stakeholder 2026-11-14, Android path updated D-057)

| ID | Decision |
|----|----------|
| D-003 / D-004 | Graduated 5-level enforcement remains post-enrollment Android product; mapped to REMINDER/RESTRICT/LOCK (D-058). |
| D-041 | Provisioning + enrollment platform. |
| D-042 | **Superseded for implementation.** AMAPI remains an evaluated EMM; not the payment-lock engine. |
| D-057 | **Android:** native Kotlin custom DPC + Device Owner + QR provisioning. |
| D-043 | **iOS Model B** + vendor MDM (`MdmProviderPort`) + Configurator on iPhone. Apple rules (D-047). |
| D-056 | iOS lock = supervised Single App Mode via vendor MDM; not DeviceLock/Lost Mode/self-hosted protocol. |
| D-044 | Play Protect disable is not a required step. |
| D-045 | No secrets in QR / Configurator payloads. |
| D-046 | Production claims need evidence; prototype ≠ commercial. |
| D-047 | Do not require skipping iOS passcode, Apple ID, Location Services. |
| D-049 | QR default at counter (DPC extras); Zero-touch when reseller pre-registered the unit. |
| D-050 | Device management **mandatory**; block handover until enrollment completed. |
| D-051 | Legal/PDPA contract wording **after** mockups. |
| D-052 | Supported Android = GMS + sold-by-merchant + matrix pass. |
| D-053 | AMAPI enterprise-per-tenant is **moot for DPC path**; keep if AMAPI enrollment is ever revived. |
| D-058 | `QR_GENERATED` session state; business vs platform lock fields. |
| Existing | Lost Mode forbidden for collections. Emergency calling. No lock from unverified payments. Factory reset is not collections. QR once ≠ permanent post-wipe lock. |

## Still pending

| Topic | Why |
|-------|-----|
| **D-054 AMAPI ToS vs EMI lock** | Google forbids payment-based restriction on AMAPI unless they grant an exception. Does **not** block DPC prototype; still relevant if anyone proposes AMAPI lock |
| Custom DPC Play / Enterprise distribution eligibility | Production gate |
| Hosted APK URL + checksum on target OEM Setup Wizards | Lab |
| Exact MDM vendor (Jamf, Mosyle, SimpleMDM, …) | Adapter exists; vendor SKU not chosen |
| Compatibility matrix rows (Samsung/Xiaomi/OPPO/vivo + iOS versions) | Hardware lab — [DM0-LAB-PROTOCOL.md](./DM0-LAB-PROTOCOL.md) |
| Factory-reset re-enrollment (Zero-touch / OEM / FRP) | Must not claim permanence |
| Per-merchant ABM signup success in Thailand | Ops, not architecture |
| IMEI vs hardware fingerprint as bind key | Duplicate handling |
| Contract disclosure / consent text | D-051 draft — counsel must review |
| Merchant offboarding unenroll SOP details | Model B: merchant ABM admin + our revoke `secret_ref` |

Do not re-open D-043/D-056 without a new Decision Log row. D-057 is the Android implementation ADR.
