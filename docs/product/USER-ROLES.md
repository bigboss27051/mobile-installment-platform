# User Roles

## Platform (Cross-Tenant)

| Role | Scope | Capabilities |
|------|-------|--------------|
| `SUPER_ADMIN` | Global | Manage tenants, subscriptions, packages, suspensions, global config, global reports, audit |
| `PLATFORM_SUPPORT` | Global (limited) | Read tenant health, assist unlocks under policy, cannot change financial ledgers arbitrarily |
| `PLATFORM_FINANCE` | Global | SaaS billing invoices, settlement reports (platform fees), not customer installment ledgers |

## Tenant (Merchant Organization)

| Role | Scope | Capabilities |
|------|-------|--------------|
| `MERCHANT_OWNER` | Tenant | All tenant settings, branches, employees, plans, enforcement policy, reports |
| `MERCHANT_MANAGER` | Tenant / assigned branches | Branch ops, approvals, inventory, contracts, collections oversight |
| `SALES_AGENT` | Assigned branches | Customer registration, KYC capture, applications, contract signing assist, sales history |
| `CASHIER` | Assigned branches | Payment collection, receipt lookup; limited create rights |
| `KYC_REVIEWER` | Tenant / branches | Review KYC packets, request resubmission |
| `CREDIT_OFFICER` | Tenant / branches | View scorecard, approve/reject applications |
| `COLLECTION_AGENT` | Tenant / branches | Overdue queues, authorized device commands per policy |
| `ACCOUNTANT` | Tenant | Payment reconciliation views, financial exports; no device lock rights |
| `BRANCH_READONLY` | Branch | Dashboards and lists without mutating financial/device state |

## Customer

| Role | Scope | Capabilities |
|------|-------|--------------|
| `CUSTOMER` | Own records | Profile, KYC, contracts, schedules, payments, device status (own), support requests |

## System Actors

| Actor | Purpose |
|-------|---------|
| `PAYMENT_WEBHOOK` | Ingest signed gateway events |
| `SCHEDULER` | Reminders, overdue transitions, subscription billing jobs |
| `DEVICE_AGENT` | DPC/MDM check-in, heartbeat, command ack (not bind-contract) |
| `NOTIFICATION_WORKER` | Deliver templated messages |

## Permission Model Notes

- Permissions are explicit grants; roles are bundles of permissions  
- Financial mutate and device restrict permissions are separate  
- Device levels 4–5 require elevated permission even if merchant policy allows automation  
- Cross-tenant access is denied for all tenant roles  
- Branch assignment is mandatory for staff roles that touch inventory, sales, or collection  

## Matrix Sketch (Critical Actions)

| Action | Owner | Manager | Credit | Sales | Collection | Customer |
|--------|-------|---------|--------|-------|------------|----------|
| Configure enforcement policy | Y | N* | N | N | N | N |
| Approve application | Y | Y | Y | N | N | N |
| Create contract from approval | Y | Y | Y | Y† | N | N |
| Collect payment | Y | Y | N | Y | Y | Self-pay |
| Start enrollment session | Y | Y | N | Y† | N | N |
| Bind / unbind device | Y | Y | N | N | Y‡ | N |
| Issue device level ≥4 | Y | Y | N | N | Y‡ | N |
| View other tenants | N | N | N | N | N | N |

\* Optional grant  
† If permitted by tenant setting  
‡ Only when policy + permission allow  
