# Android DPC Teal/Sand UI Design

**Date:** 2026-11-22  
**Status:** Implemented + Pad visual accepted (DPC `0.1.19-lab`; Xiaomi Pad 6 2026-11-22)  
**Parent:** R2 Android DPC lab — usable shop-facing Lock / Reminder presentation  
**Depends on:** Existing Lock Task Mode (`MangoLockActivity`), `ReminderNotifier`, Device Owner lab activities  
**Scope choice:** User approved **Approach 1** — XML layouts + shared theme resources (not programmatic-only, not Compose)

## Goal

Replace the plain lab LinearLayout Lock / Reminder / lab activity UIs with a memorable, finance-trustworthy **Teal + Sand** visual system that is usable in a shop: Thai primary + English secondary, split Lock layout with status dock, and the same tokens across customer-facing and lab screens.

## Non-Goals

- Jetpack Compose migration  
- Merchant web / customer Android app redesign  
- Changing Lock Task, emergency dial packages, command authz, or enrollment flows  
- Requiring backend amount/contract fields for Lock to work (optional extras only)  
- Showing amount on the Reminder notification in this slice  
- Play Protect / Device Owner provisioning UX overhaul  

## Decisions

| ID | Decision |
|----|----------|
| U-1 | Palette: `mip_teal` `#0F5C56`, `mip_teal_deep` `#0A4540`, `mip_sand` `#E8DFD0` |
| U-2 | Lock layout: **split status** — message top, dock bottom (status · amount/due · contract · emergency) |
| U-3 | Copy: Thai primary + English secondary lines |
| U-4 | Status dock shows status + amount/due + contract when extras present; **hide** empty rows |
| U-5 | Apply Teal/Sand to **all** DPC UI surfaces in this slice: Lock, Reminder, lab activities (Provision / Poll / Wipe / Recovery / Compliance) |
| U-6 | Implementation: XML layouts + `colors` / `themes` / `strings` resources |
| U-7 | Emergency CTA always visible and dials 112 via existing `EmergencyDial` |
| U-8 | Lab without extras: show status “รอชำระเงิน / Awaiting payment” only; amount/contract rows hidden |
| U-9 | Reminder: TH+EN string resources + teal accent; still notification-only, device usable |

## Visual system

| Token | Hex | Use |
|-------|-----|-----|
| `mip_teal` | `#0F5C56` | Lock primary surface, lab accents, notification accent |
| `mip_teal_deep` | `#0A4540` | Lock status dock |
| `mip_sand` | `#E8DFD0` | Primary text on teal; Lock emergency button fill; lab ground |

Themes:

- `Theme.Mip.Dpc` — Lock (teal window background)  
- `Theme.Mip.Dpc.Lab` — lab activities (sand window background)

## Lock screen

**Structure**

1. Top: brand `MIP` · title อุปกรณ์ถูกล็อก / Device locked · reason (TH + EN)  
2. Bottom dock:  
   - Status label (default รอชำระเงิน / Awaiting payment)  
   - Amount due + due date (optional)  
   - Contract ref + “ติดต่อร้าน / Contact your merchant” (optional)  
   - Emergency button: โทรฉุกเฉิน 112 · Emergency  

**Intent extras** (additive; keep `EXTRA_REASON`, `EXTRA_CLEAR_LOCK`)

| Extra | Type | Row if blank |
|-------|------|--------------|
| `statusLabel` / `statusLabelEn` | string | Use default TH/EN status |
| `amountDue` | string (decimal text, e.g. `1250.00`) | Hide amount row |
| `dueDate` | string (display-ready) | Hide due line if amount also blank; if amount present and due blank, show amount only |
| `contractRef` | string | Hide contract row |

No float parsing on device. No PAN/CVV. Do not log full national IDs.

**Behavior unchanged:** Device Owner → `setLockTaskPackages` + `startLockTask`; `EXTRA_CLEAR_LOCK` stops lock task and finishes.

## Reminder

- Channel name / title / body from string resources (TH primary phrasing with EN in same strings as designed).  
- Ongoing notification; cancel path unchanged.  
- No amount/contract on notification this slice.  
- Small icon may use teal colorization where API allows; fallback system info icon OK for lab.

## Lab screens

Activities using programmatic LinearLayout today move to XML (or one shared lab shell layout) under `Theme.Mip.Dpc.Lab`:

- `LabProvisioningActivity`  
- `CommandPollActivity`  
- `LabWipeActivity`  
- `PolicyRecoveryActivity`  
- `AdminPolicyComplianceActivity`  

Lab copy may stay denser/technical; brand strip `MIP LAB` + teal status panel on sand ground.

## Data flow

```
START_LOCK_TASK (existing reason)
        │
        ▼
CommandExecutor → MangoLockActivity intent
        │
        ├─ EXTRA_REASON (required today)
        └─ optional amountDue / dueDate / contractRef / statusLabel*
                │
                ▼
        activity_mango_lock.xml bind → hide empty rows

* Backend optional payload fields are a follow-up if not shipped in the same PR;
  UI must work with reason-only.
```

## Security / product rules

- Emergency calling remains available at all lock levels.  
- Restrictive actions still require reason + authz; UI does not invent locks from unverified payments.  
- Decimal-safe money display only (string from trusted command path).  
- Tenant isolation of commands unchanged.

## Tests

| Area | Requirement |
|------|-------------|
| Lock extras | Missing amount/contract → those views `GONE`; present → visible with values |
| Emergency | CTA launches `EmergencyDial.intent()` |
| Reminder | `show` / `cancel`; content from resources |
| Regression | Existing `EmergencyDial`, `ReminderPolicy`, CommandExecutor / PolicyRecovery tests stay green |

## Out of scope (explicit)

- Compose  
- Web portals  
- Mandatory backend finance payload  
- iOS  
- Changing FCM / WorkManager poll behavior  

## Acceptance

- Lock on Pad looks like split Teal/Sand mock (TH+EN, emergency dock).  
- Reminder copy matches design language.  
- Lab activities share palette (not default white/system crash aesthetic).  
- Reason-only LOCK still works; optional rows appear when extras set (unit/instrumented or activity bind helper test).  
