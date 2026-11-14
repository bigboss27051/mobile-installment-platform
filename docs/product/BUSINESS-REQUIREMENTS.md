# Business Requirements

## BR-1 Multi-Tenant SaaS

- BR-1.1 System supports many merchant companies (tenants) on one platform.  
- BR-1.2 Tenant data must be isolated; cross-tenant access is forbidden.  
- BR-1.3 Platform owner can suspend tenants and manage subscriptions.  
- BR-1.4 Entitlements may limit branches, employees, contracts, managed devices.  

## BR-2 Merchant Organization

- BR-2.1 Tenant has one or more branches.  
- BR-2.2 Employees are assigned roles and branch access.  
- BR-2.3 Merchant configures installment plans and device enforcement policy.  

## BR-3 Inventory & IMEI

- BR-3.1 Products have variants (storage/color/etc.).  
- BR-3.2 IMEI is unique within the relevant inventory scope.  
- BR-3.3 An IMEI cannot bind to multiple active contracts.  
- BR-3.4 Stock reserve on application; commit on contract activation; release on cancel.  
- BR-3.5 Inventory movements are transactional and auditable.  

## BR-4 Customer & KYC

- BR-4.1 Customers register with Thai identity profile for pilot.  
- BR-4.2 KYC is separate from credit assessment.  
- BR-4.3 Consents are captured and respected for contact/automation.  
- BR-4.4 Sensitive document contents are not written to application logs.  
- BR-4.5 Support access/correction/deletion workflows where legally applicable (PDPA).  

## BR-5 Credit Assessment

- BR-5.1 System computes a risk scorecard for each application.  
- BR-5.2 Merchant authorized roles approve or reject after viewing scorecard.  
- BR-5.3 Approval actions are immutable audit events.  
- BR-5.4 Platform does not fund the receivable; merchant is creditor.  

## BR-6 Installment & Contract

- BR-6.1 Plans support configurable terms and fee rules.  
- BR-6.2 Interest formula is selectable per plan: flat or reducing balance.  
- BR-6.3 Financial math is decimal-safe with documented rounding.  
- BR-6.4 Approved applications can generate versioned contracts.  
- BR-6.5 Contracts generate payment schedules whose totals match terms.  
- BR-6.6 Contract status is separate from payment status.  
- BR-6.7 Early settlement and cancellation follow explicit rules and audits.  

## BR-7 Payments & Collection

- BR-7.1 Customer payments primarily via PromptPay through licensed gateway.  
- BR-7.2 Webhooks must be signature-verified and idempotent.  
- BR-7.3 Frontend “paid” state is never trusted alone.  
- BR-7.4 Allocation updates schedule and ledger transactionally.  
- BR-7.5 Partial payments, refunds, and reversals are supported and auditable.  
- BR-7.6 Overdue management drives reminders and optional device policy transitions.  

## BR-8 Device Management

- BR-8.1 Android uses **Android Management API** (fully managed). Custom DPC is not the EMM (D-042).  
- BR-8.2 Enforcement levels: (1) normal (2) warn (3) app limit (4) screen lock (5) suspend.  
- BR-8.3 Merchants choose presets and customize overdue days / human approval gates.  
- BR-8.4 Restrictive commands require reason, actor, tenant, expiry, and result tracking.  
- BR-8.5 API acceptance ≠ device execution success.  
- BR-8.6 Emergency calling remains available; recovery/dispute paths exist.  
- BR-8.7 Unverified payment webhooks must not trigger restrictive actions.  
- BR-8.8 iOS: merchant Apple Business (Model B) + vendor MDM via `MdmProviderPort`; Configurator on iPhone at the counter; capabilities are a subset; no Lost Mode for debt collection.  
- BR-8.9 Enrollment is an auditable session: generate credentials → provision → verify identity → activate → bind contract.  
- BR-8.10 Enrollment tokens are short-lived and hashed at rest; QR/Configurator material contains no Wi-Fi passwords, private keys, or integration secrets.  
- BR-8.11 Disabling Play Protect is not a required Android step.  
- BR-8.12 iOS enrollment must not require skipping passcode, Apple ID, or Location Services.  
- BR-8.13 Customer consent and contract authorization are required before bind.  
- BR-8.14 Tenant isolation applies to devices, sessions, MDM configs, and commands; unauthorized bind is rejected.  
- BR-8.15 Device replacement, unenrollment, and contract termination have explicit recovery workflows.  
- BR-8.16 Device management is **mandatory** for installment device sales; handover is blocked until enrollment `COMPLETED` (D-050).  
- BR-8.17 Unsupported (non-GMS / matrix-fail) units cannot be sold on installment (D-052).  
- BR-8.18 Contract/PDPA disclosure copy is filled after UX mockups (D-051); lack of final copy does not waive consent capture.  

## BR-9 Notifications

- BR-9.1 Support push, SMS, email, LINE via adapters.  
- BR-9.2 Templates are tenant-configurable within platform policy.  
- BR-9.3 Automated collection contacts respect consent and contact policies.  

## BR-10 SaaS Billing

- BR-10.1 Subscription plans, invoices, upgrades/downgrades, suspension.  
- BR-10.2 SaaS billing is ledger-separated from customer installment payments.  

## BR-11 Security & Audit

- BR-11.1 Password hashing, JWT/OAuth2-compatible auth, refresh, OTP where needed.  
- BR-11.2 RBAC on all mutating endpoints.  
- BR-11.3 Immutable audit logs for financial, KYC, approval, and device actions.  
- BR-11.4 Secrets never committed; production credentials never invented.  

## Installment Calculation Rules (Baseline)

### Flat (add-on)
- InterestTotal = Principal × Rate × TermFactor (per plan definition)  
- InstallmentAmount = round((Principal + InterestTotal + Fees) / N)  
- Final installment adjusted for remainder per rounding policy  

### Reducing balance
- Periodic interest on remaining principal per plan rate/period  
- Schedule generated installment-by-installment with decimal types  
- Rounding policy applied consistently; schedule hash stored on contract version  

### Rounding Policy (default assumption)
- Currency: THB with 2 decimal places  
- Round half-up to satang unless plan overrides with documented rule  
- Schedule regeneration creates a new contract version; prior version retained  

## Payment State Machine (summary)

`INTENT_CREATED → AWAITING_PROVIDER → PROVIDER_SUCCEEDED → VERIFIED → ALLOCATED`  
Failures: `FAILED`, `EXPIRED`, `CANCELLED`  
Corrections: `REVERSED`, `REFUNDED` as new ledger entries (no silent mutation)
