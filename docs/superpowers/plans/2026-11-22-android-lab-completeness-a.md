# Android Lab Completeness (Approach A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** DPC REMINDER notification + LOCK emergency dial (`0.1.17-lab`); customer Flutter pays contract outstanding; portal exposes `outstandingBalance` on contract detail.

**Architecture:** Pure helpers for dial URI and reminder apply codes (unit-tested). `PolicyRecovery` branches `REMINDER` / clears notification on `NONE`. Portal reuses schedule leftover math already used in `getLockStatus`. Flutter contract detail reads `outstandingBalance` for the pay CTA.

**Tech Stack:** Kotlin JUnit (android-dpc), NestJS + Jest (portal), Flutter widget/unit tests.

**Spec:** [../specs/2026-11-22-android-lab-completeness-a-design.md](../specs/2026-11-22-android-lab-completeness-a-design.md)

---

### Task 1: Emergency dial helper (DPC)

**Files:**
- Create: `apps/android-dpc/app/src/main/java/com/mip/dpc/EmergencyDial.kt`
- Test: `apps/android-dpc/app/src/test/java/com/mip/dpc/EmergencyDialTest.kt`

- [x] **Step 1: Failing test** — `EmergencyDial.uri()` returns `tel:112`
- [x] **Step 2: Implement** `object EmergencyDial { fun uri(): Uri = Uri.parse("tel:112") }`
- [x] **Step 3:** `./gradlew :app:test` green for that class

### Task 2: PolicyRecovery REMINDER branch (DPC)

**Files:**
- Modify: `apps/android-dpc/app/src/main/java/com/mip/dpc/PolicyRecovery.kt`
- Create: `apps/android-dpc/app/src/main/java/com/mip/dpc/ReminderNotifier.kt` (channel + notify/cancel; no Android test for NotificationManager)
- Test: `apps/android-dpc/app/src/test/java/com/mip/dpc/PolicyRecoveryReminderTest.kt` — test a pure mapper `fun reminderResultCode(desired: String): String?` OR extract `PolicyApplyPlan` if needed

Prefer: extend `PolicyRecovery.reapply` with `"REMINDER" -> { clear lock home; unsuspend; ReminderNotifier.show; "REAPPLIED_REMINDER" }` and `"NONE" -> { ReminderNotifier.cancel; ... existing }`. Unit-test a small `fun shouldShowReminder(desired: String): Boolean` / `fun shouldCancelReminder(desired: String): Boolean` if full reapply needs Context.

- [x] **Step 1: Tests for reminder desired flags**
- [x] **Step 2: ReminderNotifier + PolicyRecovery branch**
- [x] **Step 3: Wire MpPayLockActivity emergency button using EmergencyDial**
- [x] **Step 4: versionName `0.1.17-lab`; update README**

### Task 3: Portal outstandingBalance

**Files:**
- Modify: `backend/src/portal/portal.service.ts` (`getContract`)
- Modify: `backend/src/portal/portal.service.spec.ts`

- [x] **Step 1: Failing test** — getContract returns `outstandingBalance` matching leftover sum
- [x] **Step 2: Implement** using same leftover loop as `getLockStatus` / `remainingBalance`
- [x] **Step 3: `npm test` / jest portal spec green

### Task 4: Customer Flutter outstanding pay + lock entry

**Files:**
- Modify: `apps/customer-mobile/lib/main.dart`
- Create or modify: `apps/customer-mobile/lib/outstanding_pay.dart` (pure: pick amount)
- Test: `apps/customer-mobile/test/outstanding_pay_test.dart`
- Light UX: contracts page lock status label; login disclaimer note optional

- [x] **Step 1: Test** `payAmountFromContract({'outstandingBalance':'10600.00'}) == '10600.00'`; missing/zero → null (no pay)
- [x] **Step 2: Wire ContractDetailPage CTA
- [x] **Step 3: `flutter test`

### Task 5: Docs

**Files:**
- Modify: `docs/roadmap/CURRENT-PHASE.md`
- Modify: `docs/superpowers/specs/2026-11-22-android-lab-completeness-a-design.md` status → Implemented
- Modify: `docs/project-management/TASK-BACKLOG.md` (add R2-P4-005 or note DONE lab completeness A)
- Modify: `apps/android-dpc/README.md`

- [x] **Step 1: Update docs; no production DO claim**

---

**Commits:** Only if user asks (project user rule).
