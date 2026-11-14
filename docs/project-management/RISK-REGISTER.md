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
| R-014 | AMAPI cannot express lock-task levels 4–5 | High | Medium | Hybrid companion DPC; document iOS/Android gaps | Open |
| R-015 | OEM QR/6-tap fragmentation (incl. non-GMS) | High | High | Compatibility matrix; unsupported SKUs | Open |
| R-016 | Secrets leaked via QR / Configurator / logs | Critical | Medium | D-045; hashed tokens; secret_ref only | Open |
| R-017 | Unauthorized bind (shop code stuffing, stolen QR) | High | Medium | Short TTL, staff confirm, rate limits, IMEI match | Open |
| R-018 | Merchant offboarding leaves MDM access | High | Medium | Revoke accounts; unenroll SOP | Open |
| R-019 | Zero-touch unavailable for same-day walk-in stock | Medium | High | Default to QR/Configurator; ZT optional | Open |
| R-020 | Copying competitor Play Protect / skip-Apple-ID SOP causes security or review failure | High | Medium | D-044, D-047; Play-distributed or AMAPI agent | Open |
| R-021 | Google AMAPI Permissible Usage forbids EMI/payment-based device control | Critical | High | D-054 inquiry; do not implement AMAPI overdue lock until exception or new stack | Open |
| R-022 | Configurator-added iOS devices have a 30-day user release from RM/MDM | High | High | Disclose; prefer ADE when serials in ABM; legal review | Open |
