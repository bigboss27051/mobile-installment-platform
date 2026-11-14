# Google AMAPI permissible-usage inquiry (D-054)

**Status:** Draft for a human to submit. Do not paste secrets.  
**Form:** [Android Management API Permissible Usage](https://developers.google.com/android/management/permissible-usage) (inquiry / quota forms linked from that page).  
**Why:** Published policy forbids “device financing / EMI” control. Our product includes **graduated restriction after overdue**, so we must not call AMAPI for that until Google answers.

Fill Cloud project ID, legal entity, and contact email at submit time. Do not invent Google credentials.

---

## Suggested English text (copy into Google’s form)

**Organization:** [LEGAL NAME], Thailand  
**Product:** Multi-tenant SaaS for **mobile phone retailers** who sell handsets on **merchant-funded installment** (the platform does **not** lend).  
**Intended AMAPI role:** Commercial EMM for those merchants (external customers), fully managed / company-owned enrollment at the point of sale (QR; Zero-touch when a reseller has pre-registered the IMEI).

**What we want AMAPI to do**

1. Enroll new or factory-reset GMS devices as fully managed via official QR / Android Device Policy (no Play Protect-off SOP; no Wi-Fi passwords in QR).  
2. One AMAPI enterprise per merchant tenant where quotas allow.  
3. Apply **graduated** policies that the **merchant** configures, disclosed in the **customer contract**, with audit, expiry, human approval for severe levels, **emergency calling always available**, no hidden DPC, no Lost Mode / wipe as collections.  
4. Policy steps (product names): (1) normal (2) warning/notifications only (3) limit entertainment apps (4) lock screen with call-shop path (5) maximum restrict short of blocking emergency services. Transitions are tied to **verified installment arrears** and reverse when the account is current.

**What we will not do with AMAPI**

- Covert surveillance, keylogging, accessibility-API stalking, advertising IDs.  
- In-house-only first-party fleet with no merchant customers.  
- Lost Mode or factory reset as a debt-collection action.

**Question to Google**

Does this **retail installment / EMI-adjacent** use, with **informed contract consent** and **merchant as creditor**, fall under the prohibited “device financing solutions … based on payment status” clause?

- If **yes (prohibited):** we will not use AMAPI to change policy or issue LOCK based on arrears. Please confirm whether **enrollment-only / inventory-only** AMAPI (no payment-triggered policy) is still allowed for the same merchants.  
- If **no (allowed)** or **allowed with conditions:** please list conditions (partner program, quotas, disclosure, prohibited commands).  
- We request **initial device quota** for a development project (and later production) once usage is approved.

**Direct customer agreement:** each merchant tenant will have a contract with us; end-customers sign the retail installment contract that discloses device management.

---

## Operator checklist

1. Create (or use) a Google Cloud project; enable Android Management API; note project ID.  
2. Paste the text above into Google’s inquiry/quota form.  
3. Store the ticket/email ID here when submitted: `_not submitted_`  
4. File Google’s written answer under `docs/device-management/lab-evidence/` (no secrets) and add a Decision Log row updating D-054.

Until a written **allow** exists, **do not implement** `policies.patch` / `issueCommand` LOCK triggered by overdue events.
