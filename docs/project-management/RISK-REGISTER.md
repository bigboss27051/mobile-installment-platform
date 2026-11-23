# Risk Register

| ID | Risk | Impact | Likelihood | Mitigation | Status |
|----|------|--------|------------|------------|--------|
| R-001 | PDPA / consumer protection issues around device lock | High | Medium | Consent, transparency, emergency dial, human gates, legal review before pilot | Open |
| R-002 | Android OEM fragmentation for Device Owner | High | High | PoC matrix per OEM; document unsupported devices | Open |
| R-003 | iOS cannot mirror Android controls | High | High | Capability matrix; no false feature parity | Open |
| R-004 | Payment provider credentials unavailable | High | High | Sandbox adapters; mark production BLOCKED | Open |
| R-005 | Incorrect installment math / rounding disputes | High | Medium | Decimal-safe lib + golden tests for flat/reducing | Open |
| R-006 | Cross-tenant data leak | Critical | Low–Med | Mandatory isolation tests + authz middleware | Open |
| R-007 | Duplicate webhook double-allocation | Critical | Medium | Idempotency keys + unique provider event ids | Open |
| R-008 | Auto-enforcement from unverified payment state | Critical | Medium | Device reacts only to verified ledger events | Open |
| R-009 | Scope overload (full stack) delays core revenue | High | High | Enforce R0–R3 gates; no phase skip without decision | Open |
| R-010 | E-sign / OCR vendor lock-in | Medium | Medium | Ports/adapters | Open |
| R-011 | Secret leakage in repo/logs | High | Medium | .env.example only; redaction; scanning | Open |
| R-012 | Collection UX harms emergency calling | Critical | Low | Explicit Level 5 constraint + tests | Open |
| R-013 | Apple rejects platform or merchant ABM for installment-sold consumer devices | High | High | DM0 legal/Apple review; iOS device mgmt may stay limited or opt-in | Open |
| R-014 | AMAPI cannot express lock-task / is ToS-blocked for EMI | High | High | **Mitigated for prototype by D-057 custom DPC**; AMAPI lock still forbidden | Open |
| R-015 | OEM QR/6-tap fragmentation (incl. non-GMS) | High | High | Compatibility matrix; unsupported SKUs | Open |
| R-016 | Secrets leaked via QR / Configurator / logs | Critical | Medium | D-045; hashed tokens; secret_ref only | Open |
| R-017 | Unauthorized bind (shop code stuffing, stolen QR) | High | Medium | Short TTL, staff confirm, rate limits, IMEI match | Open |
| R-018 | Merchant offboarding leaves MDM access | High | Medium | Revoke accounts; unenroll SOP | Open |
| R-019 | Zero-touch unavailable for same-day walk-in stock | Medium | High | Default to QR/Configurator; ZT optional | Open |
| R-020 | Copying competitor Play Protect / skip-Apple-ID SOP causes security or review failure | High | Medium | D-044, D-047; do not require Protect-off | Open |
| R-021 | Google AMAPI Permissible Usage forbids EMI/payment-based device control | Critical | High | Do not implement AMAPI overdue lock. Custom DPC path (D-057) still needs **separate** Google/Play/OEM policy review for commercial financing | Open |
| R-023 | Custom DPC sideload / checksum / OEM Setup Wizard rejects QR extras | High | High | Compatibility matrix; Play-hosted DPC as production gate; lab on real SKUs | Open |
| R-024 | Staff believe one QR scan survives every factory reset | High | High | Document re-enroll; Zero-touch optional; wizard copy after wipe; [FRP-AND-REENROLL.md](../device-management/FRP-AND-REENROLL.md) | Open |
| R-026 | GMS FRP after wipe blocks re-provision until previous Google account unlocks; personal accounts on lab/shop units strand operators | High | High | D-060; FRP-free lab stock preferred; shop SOP before wipe; Merchant Web FRP checklist before new QR; no remote bypass | Open |
| R-025 | Mixing Android DPM and Apple MDM in one service causes wrong commands | High | Medium | Separate adapters; shared policy engine only | Open |
| R-022 | Configurator-added iOS devices have a 30-day user release from RM/MDM | High | High | Disclose; prefer ADE when serials in ABM; legal review | Open |
