# Multi-tenant device ownership models

Critical requirement: many independent phone retailers on one SaaS, with **tenant isolation** of devices, enrollment tokens, MDM credentials, and commands.

## Isolation rules (apply to every model)

- Every enrollment session, device, command, and MDM config row has `tenant_id`.  
- Tokens and QR codes encode a **session id + high-entropy secret**; server maps to tenant — clients never send `tenant_id` as authorization.  
- Cross-tenant bind, command, or heartbeat → 403/404.  
- Merchant offboarding must unenroll or transfer devices; leftover MDM access is a security incident.  
- Integration credentials live in a secret manager, referenced by id; never in QR, logs, or git.

---

## Android models

| Model | Who owns the Enterprise | Shop UX | SaaS fit | Notes |
|-------|-------------------------|---------|----------|--------|
| **G1. Platform EMM (AMAPI)** | Platform Google Enterprise / AMAPI project; devices enrolled into per-tenant AMAPI enterprises **or** one enterprise with tenancy in *our* DB only | QR from our wizard | Strong if Google allows many enterprises per customer | **Pending:** AMAPI multi-enterprise quotas and whether one Google Cloud project may host many merchant enterprises |
| **G2. Per-merchant Android Enterprise** | Each merchant completes Android Enterprise with our EMM | Heavier onboarding | Strong isolation; worse ops | Similar to iOS Model B |
| **G3. Custom DPC, platform-signed** | No Google EMM; QR installs our DPC as Device Owner | QR 6-tap like the reference video | Fast prototype; Play Protect / sideload / OEM risk | Matches Phase 0 assumption; Play Protect disable must **not** be required |
| **G4. Third-party EMM** | Vendor tenants | Vendor console + our adapter | Fast if vendor has multi-tenant EMM | Extra cost; capability mapping |

**Recommendation (not a decision):** **G1 or G3 for DM0 prototypes in parallel.** Pilot commercial path likely **G1 (AMAPI)** for maintainability, with a **companion app** if lock-task UX cannot be expressed in AMAPI. G3 remains the fallback for lock-task levels 4–5. G2 only if Google forbids platform-hosted multi-enterprise.

**SaaS tenancy in G1:** prefer **one AMAPI enterprise per merchant tenant** (true isolation, offboarding = delete enterprise) over a single shared enterprise tagged in our DB.

---

## iOS models

### Model A — Platform-owned Apple Business

The SaaS legal entity enrolls in Apple Business Manager (or equivalent). Devices are assigned to the **platform** MDM server. Remote Management may show the platform name unless Apple/MDM allows a customer-facing organization name.

| | |
|--|--|
| Operational complexity | High once, then centralized. Apple account, DUNS, MDM push cert, legal terms are ours. |
| Merchant onboarding | Low Apple paperwork; still need Configurator/ADE process at the counter. |
| Scalability | Good for many small shops if Apple allows devices we do not own to sit in our ABM. |
| Security | Blast radius is platform-wide if MDM credentials leak. Offboarding is our job. |
| Permissions | We are the supervising organization. Customers see **our** (or configured) org on Remote Management. |
| Maintenance | We operate MDM 24/7. |
| SaaS suitability | Attractive **if eligible**. |
| Apple limitations | **Unverified:** ABM is for devices the organization owns/manages. Retail installment phones are often **sold to consumers**. Apple may reject using platform ABM for devices legally owned by merchants or customers. Supervision + personal Apple ID is a known tension. |

### Model B — Merchant-owned Apple Business

Each retailer has (or we help them create) an ABM organization. They assign our MDM server (or their MDM with our adapter). Remote Management can show **the shop’s legal name** (matches the iOS reference video’s “Anaheim Digital Tech Co, Ltd.” pattern).

| | |
|--|--|
| Operational complexity | High per merchant: ABM signup, MDM server token, Configurator pairing, staff training. |
| Merchant onboarding | Slow; blockers if shop has no legal entity Apple will accept. |
| Scalability | Hard for very small shops; correct for chains. |
| Security | Better blast-radius isolation; we store per-tenant MDM tokens. |
| Permissions | Merchant authorizes MDM; they can revoke. We cannot silently keep control after offboarding without their ABM. |
| Maintenance | Token expiry, ABM admin turnover, Configurator devices. |
| SaaS suitability | Honest about Apple’s org-centric model. |
| Apple limitations | Still **unverified** that installment-sold consumer devices may remain supervised by the *merchant* after sale. Legal review required. |

### Model C — Commercial MDM hosts Apple protocol (orthogonal)

A or B can sit behind Jamf/Mosyle/etc. We implement `MdmProviderPort` only. **Recommended engineering approach** regardless of A vs B.

---

## Comparison summary

| Concern | Android G1 AMAPI | Android G3 custom DPC | iOS A | iOS B |
|---------|------------------|----------------------|-------|-------|
| Counter UX | QR | QR | ADE or Configurator | Configurator / ADE |
| Merchant Apple/Google admin | Low–medium | Low | Low | High |
| Tenant isolation | Per-enterprise if allowed | Our DB + DO | Shared ABM | Per-merchant ABM |
| Consumer-sale legality | Review | Review | Review | Review |
| Matches iOS video org name | N/A | N/A | Only if display name customizable | Yes |
| Pilot recommendation | Prototype | Prototype | Only after Apple eligibility | Default planning assumption |

**Planning assumption (not accepted as architecture):** design APIs and tables so **either iOS A or B** can be stored as `device_management_accounts` (platform-level vs tenant-level). Do not hard-code a single ABM org in application config.

## Merchant offboarding

1. Stop new enrollment sessions.  
2. Drain commands; record reason `TENANT_OFFBOARD`.  
3. Unenroll or factory-reset **only** with contractual + legal authority (not silent wipe as collection).  
4. Revoke MDM/AMAPI credentials for that tenant.  
5. Retain audit logs per retention policy.

## Device ownership vs legal ownership

Installment collateral does **not** automatically grant OS-level Device Owner / supervision rights. Enrollment must be:

- Disclosed in the customer contract  
- Performed on a **new or factory-reset** device at sale (observed pattern)  
- Reversible on settlement / lawful termination  

DM0 must include a legal/compliance note, not only a technical prototype.
