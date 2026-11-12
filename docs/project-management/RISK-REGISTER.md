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
