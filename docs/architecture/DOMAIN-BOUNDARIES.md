# Domain Boundaries

## Bounded Contexts

| Context | Owns | Does not own |
|---------|------|--------------|
| Identity & Access | Users, credentials, sessions, RBAC | Business records |
| Tenant Ops | Tenant, branch, subscription entitlements | Installment money |
| Catalog & Stock | Products, variants, IMEI, stock movements | Contracts |
| Customer Trust | Customer profile, KYC, consents | Credit decision finality |
| Credit Origination | Applications, scorecard, approvals | Ledger postings |
| Contracting | Contract versions, schedules, settlements rules | Payment provider calls |
| Money Movement | Intents, transactions, ledger, allocation, reconciliation | Device policies |
| Collection | Overdue cases, workflows, authorized actions | Arbitrary ledger edits |
| Device Control | Registry, enrollment sessions, provisioning profiles, activation, contract bindings, policies, commands, heartbeats, recovery | Payment verification |
| Comms | Templates, deliveries, channel adapters | Business state changes |
| Audit | Immutable event records | Source-of-truth business mutations |

## Integration Rules

- Contexts communicate via application services / domain events inside the monolith.  
- No direct DB joins across contexts in controllers; use explicit queries in application layer.  
- Device Control may **read** payment/contract status but may not mark payments paid.  
- Money Movement may emit events consumed by Collection/Device; it does not push OS commands directly without Device Control.  

## Anti-Corruption Layers

| External | Adapter |
|----------|---------|
| Payment gateway | `PaymentProviderPort` |
| OCR | `OcrProviderPort` |
| E-sign | `ESignProviderPort` |
| iOS MDM | `MdmProviderPort` |
| Android Enterprise / AMAPI | `AndroidEnterprisePort` (optional until DM0 chooses stack) |
| SMS/LINE/Email/Push | `NotificationChannelPort` |

Sandbox/mock implementations are first-class until production credentials exist.
