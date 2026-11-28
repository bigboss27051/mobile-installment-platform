# Android DPC Teal/Sand UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Teal/Sand XML theme + split Lock UI (TH+EN, status dock with optional amount/contract) and restyle Reminder + lab activities without changing Lock Task / emergency / command semantics.

**Architecture:** Shared `colors` / `themes` / `strings` resources. Pure `LockUiModel` binder (unit-tested) decides which dock rows show. `MpPayLockActivity` inflates `activity_mp_pay_lock.xml`. Lab activities inflate `activity_lab_shell.xml`. Reminder copy moves to string resources.

**Tech Stack:** Android Views XML, AppCompat themes, JUnit4 unit tests (no Robolectric required for binder), Kotlin, existing `EmergencyDial` / `CommandExecutor`.

**Spec:** [../specs/2026-11-22-android-dpc-teal-sand-ui-design.md](../specs/2026-11-22-android-dpc-teal-sand-ui-design.md)

**Commits:** Only if the user asks (project user rule). Commit steps below are optional checkpoints.

---

## File map

| Path | Role |
|------|------|
| `apps/android-dpc/app/src/main/res/values/colors.xml` | `mip_teal`, `mip_teal_deep`, `mip_sand` |
| `apps/android-dpc/app/src/main/res/values/themes.xml` | `Theme.Mip.Dpc`, `Theme.Mip.Dpc.Lab` |
| `apps/android-dpc/app/src/main/res/values/strings.xml` | Lock / Reminder / lab copy (TH primary + EN secondary) |
| `apps/android-dpc/app/src/main/res/layout/activity_mp_pay_lock.xml` | Split Lock layout |
| `apps/android-dpc/app/src/main/res/layout/activity_lab_shell.xml` | Shared lab shell |
| `apps/android-dpc/app/src/main/java/com/mip/dpc/LockUiModel.kt` | Pure binder for dock visibility + display strings |
| `apps/android-dpc/app/src/test/java/com/mip/dpc/LockUiModelTest.kt` | Unit tests for binder |
| `apps/android-dpc/app/src/main/java/com/mip/dpc/MpPayLockActivity.kt` | Inflate layout, bind model, emergency click |
| `apps/android-dpc/app/src/main/java/com/mip/dpc/ReminderNotifier.kt` | String resources for title/body/channel |
| `apps/android-dpc/app/src/main/java/com/mip/dpc/LabShell.kt` | Helper: inflate lab shell, return title/body views |
| Lab activities (5) | Use `LabShell` instead of programmatic LinearLayout |
| `apps/android-dpc/app/src/main/AndroidManifest.xml` | Application / activity themes |
| `apps/android-dpc/app/build.gradle.kts` | Version `0.1.19-lab` |

**Out of this plan:** Backend optional amount payload; Compose; web UI; CommandExecutor extras wiring beyond reason (binder accepts extras when present; executor can keep reason-only until a follow-up).

---

### Task 1: LockUiModel + failing tests

**Files:**
- Create: `apps/android-dpc/app/src/main/java/com/mip/dpc/LockUiModel.kt`
- Create: `apps/android-dpc/app/src/test/java/com/mip/dpc/LockUiModelTest.kt`

- [ ] **Step 1: Write the failing tests**

```kotlin
package com.mip.dpc

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LockUiModelTest {
    @Test
    fun reasonOnly_hidesAmountAndContract_showsDefaultStatus() {
        val model =
            LockUiModel.from(
                reason = "lab lock",
                statusLabel = null,
                statusLabelEn = null,
                amountDue = null,
                dueDate = null,
                contractRef = null,
            )
        assertTrue(model.showStatus)
        assertEquals("รอชำระเงิน", model.statusTh)
        assertEquals("Awaiting payment", model.statusEn)
        assertFalse(model.showAmount)
        assertFalse(model.showContract)
        assertEquals("lab lock", model.reasonDetail)
    }

    @Test
    fun blankReason_hidesReasonDetail() {
        val model =
            LockUiModel.from(
                reason = "  ",
                statusLabel = null,
                statusLabelEn = null,
                amountDue = null,
                dueDate = null,
                contractRef = null,
            )
        assertEquals(null, model.reasonDetail)
    }

    @Test
    fun amountAndDue_showAmountRow() {
        val model =
            LockUiModel.from(
                reason = null,
                statusLabel = "ค้างชำระ",
                statusLabelEn = "Overdue",
                amountDue = "1250.00",
                dueDate = "15 Nov 2026",
                contractRef = null,
            )
        assertTrue(model.showAmount)
        assertEquals("฿1,250.00", model.amountDisplay)
        assertEquals("15 Nov 2026", model.dueDisplay)
        assertFalse(model.showContract)
        assertEquals("ค้างชำระ", model.statusTh)
        assertEquals("Overdue", model.statusEn)
    }

    @Test
    fun amountWithoutDue_stillShowsAmount() {
        val model =
            LockUiModel.from(
                reason = null,
                statusLabel = null,
                statusLabelEn = null,
                amountDue = "100.50",
                dueDate = null,
                contractRef = null,
            )
        assertTrue(model.showAmount)
        assertEquals("฿100.50", model.amountDisplay)
        assertEquals(null, model.dueDisplay)
    }

    @Test
    fun blankAmount_hidesAmountEvenIfDuePresent() {
        val model =
            LockUiModel.from(
                reason = null,
                statusLabel = null,
                statusLabelEn = null,
                amountDue = "  ",
                dueDate = "15 Nov 2026",
                contractRef = null,
            )
        assertFalse(model.showAmount)
    }

    @Test
    fun contractRef_showsContractRow() {
        val model =
            LockUiModel.from(
                reason = null,
                statusLabel = null,
                statusLabelEn = null,
                amountDue = null,
                dueDate = null,
                contractRef = "MIP-2026-0042",
            )
        assertTrue(model.showContract)
        assertEquals("MIP-2026-0042", model.contractRef)
    }

    @Test
    fun invalidAmount_notShown() {
        val model =
            LockUiModel.from(
                reason = null,
                statusLabel = null,
                statusLabelEn = null,
                amountDue = "not-a-number",
                dueDate = null,
                contractRef = null,
            )
        assertFalse(model.showAmount)
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/tanawutmeesubprung/Documents/mobile-installment-platform/apps/android-dpc
./gradlew :app:testDebugUnitTest --tests com.mip.dpc.LockUiModelTest
```

Expected: FAIL (class `LockUiModel` unresolved) or compile error.

- [ ] **Step 3: Minimal implementation**

Create `LockUiModel.kt`:

```kotlin
package com.mip.dpc

import java.math.BigDecimal
import java.math.RoundingMode
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale

data class LockUiModel(
    val reasonDetail: String?,
    val showStatus: Boolean,
    val statusTh: String,
    val statusEn: String,
    val showAmount: Boolean,
    val amountDisplay: String?,
    val dueDisplay: String?,
    val showContract: Boolean,
    val contractRef: String?,
) {
    companion object {
        fun from(
            reason: String?,
            statusLabel: String?,
            statusLabelEn: String?,
            amountDue: String?,
            dueDate: String?,
            contractRef: String?,
        ): LockUiModel {
            val reasonDetail = reason?.trim()?.takeIf { it.isNotEmpty() }
            val statusTh = statusLabel?.trim()?.takeIf { it.isNotEmpty() } ?: "รอชำระเงิน"
            val statusEn = statusLabelEn?.trim()?.takeIf { it.isNotEmpty() } ?: "Awaiting payment"
            val amountDisplay = formatAmount(amountDue)
            val due = dueDate?.trim()?.takeIf { it.isNotEmpty() }
            val contract = contractRef?.trim()?.takeIf { it.isNotEmpty() }
            return LockUiModel(
                reasonDetail = reasonDetail,
                showStatus = true,
                statusTh = statusTh,
                statusEn = statusEn,
                showAmount = amountDisplay != null,
                amountDisplay = amountDisplay,
                dueDisplay = if (amountDisplay != null) due else null,
                showContract = contract != null,
                contractRef = contract,
            )
        }

        private fun formatAmount(raw: String?): String? {
            val trimmed = raw?.trim()?.takeIf { it.isNotEmpty() } ?: return null
            return try {
                val value = BigDecimal(trimmed).setScale(2, RoundingMode.UNNECESSARY)
                val symbols = DecimalFormatSymbols(Locale.US)
                val df = DecimalFormat("#,##0.00", symbols)
                "฿${df.format(value)}"
            } catch (_: Exception) {
                null
            }
        }
    }
}
```

Note: `setScale(2, UNNECESSARY)` rejects amounts with >2 fraction digits; if lab sends `1250`, scale up with `RoundingMode.HALF_UP` instead — prefer:

```kotlin
val value = BigDecimal(trimmed).setScale(2, RoundingMode.HALF_UP)
```

Use `HALF_UP` in the implementation (update test expectations if needed; `1250.00` and `100.50` still pass).

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/tanawutmeesubprung/Documents/mobile-installment-platform/apps/android-dpc
./gradlew :app:testDebugUnitTest --tests com.mip.dpc.LockUiModelTest
```

Expected: BUILD SUCCESSFUL, all `LockUiModelTest` tests PASS.

- [ ] **Step 5: Commit (only if user asked)**

```bash
git add apps/android-dpc/app/src/main/java/com/mip/dpc/LockUiModel.kt \
  apps/android-dpc/app/src/test/java/com/mip/dpc/LockUiModelTest.kt
git commit -m "feat(android-dpc): add LockUiModel binder for Teal/Sand lock dock"
```

---

### Task 2: Colors, themes, strings

**Files:**
- Create: `apps/android-dpc/app/src/main/res/values/colors.xml`
- Create: `apps/android-dpc/app/src/main/res/values/themes.xml`
- Modify: `apps/android-dpc/app/src/main/res/values/strings.xml`

- [ ] **Step 1: Add colors**

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="mip_teal">#0F5C56</color>
    <color name="mip_teal_deep">#0A4540</color>
    <color name="mip_sand">#E8DFD0</color>
</resources>
```

- [ ] **Step 2: Add themes**

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.Mip.Dpc" parent="Theme.AppCompat.NoActionBar">
        <item name="android:windowBackground">@color/mip_teal</item>
        <item name="android:statusBarColor">@color/mip_teal</item>
        <item name="android:navigationBarColor">@color/mip_teal_deep</item>
        <item name="colorPrimary">@color/mip_teal</item>
        <item name="colorAccent">@color/mip_sand</item>
    </style>

    <style name="Theme.Mip.Dpc.Lab" parent="Theme.AppCompat.Light.NoActionBar">
        <item name="android:windowBackground">@color/mip_sand</item>
        <item name="android:statusBarColor">@color/mip_teal</item>
        <item name="android:navigationBarColor">@color/mip_teal</item>
        <item name="colorPrimary">@color/mip_teal</item>
        <item name="colorAccent">@color/mip_teal</item>
    </style>
</resources>
```

- [ ] **Step 3: Expand strings.xml**

Replace/extend `strings.xml` with at least:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">MIP Lab DPC</string>

    <string name="lock_brand">MIP</string>
    <string name="lock_title_th">อุปกรณ์ถูกล็อก</string>
    <string name="lock_title_en">Device locked</string>
    <string name="lock_body_th">ค้างชำระ — ชำระในแอปลูกค้าเพื่อปลดล็อก</string>
    <string name="lock_body_en">Overdue — pay in the customer app to unlock</string>
    <string name="lock_status_heading">สถานะ · STATUS</string>
    <string name="lock_amount_heading">ยอดค้าง · AMOUNT DUE</string>
    <string name="lock_due_heading">กำหนดชำระ · Due</string>
    <string name="lock_contract_heading">สัญญา · CONTRACT</string>
    <string name="lock_contact_merchant">ติดต่อร้าน · Contact your merchant</string>
    <string name="lock_emergency">โทรฉุกเฉิน 112 · Emergency</string>

    <string name="reminder_channel_name">ค้างชำระ · Overdue reminder</string>
    <string name="reminder_channel_desc">MIP REMINDER — device usable; pay reminder only</string>
    <string name="reminder_title">ค้างชำระงวด · Installment overdue</string>
    <string name="reminder_body">ชำระในแอปลูกค้า — ยังใช้งานเครื่องได้. Pay in customer app — device stays usable.</string>

    <string name="lab_brand">MIP LAB</string>
</resources>
```

- [ ] **Step 4: Sanity compile resources**

```bash
cd /Users/tanawutmeesubprung/Documents/mobile-installment-platform/apps/android-dpc
./gradlew :app:mergeDebugResources
```

Expected: SUCCESS.

- [ ] **Step 5: Commit (only if user asked)**

```bash
git add apps/android-dpc/app/src/main/res/values/colors.xml \
  apps/android-dpc/app/src/main/res/values/themes.xml \
  apps/android-dpc/app/src/main/res/values/strings.xml
git commit -m "feat(android-dpc): add Teal/Sand theme and Lock/Reminder strings"
```

---

### Task 3: Lock layout + MpPayLockActivity

**Files:**
- Create: `apps/android-dpc/app/src/main/res/layout/activity_mp_pay_lock.xml`
- Modify: `apps/android-dpc/app/src/main/java/com/mip/dpc/MpPayLockActivity.kt`
- Modify: `apps/android-dpc/app/src/main/AndroidManifest.xml` (theme on `MpPayLockActivity`)

- [ ] **Step 1: Create `activity_mp_pay_lock.xml`**

Use a vertical `LinearLayout` root (`match_parent`, teal background) with:

- Top block (`layout_weight=1`, padding 24dp): brand, title TH, title EN, body TH, body EN, optional `lock_reason_detail` (`gone` by default)
- Bottom dock (`mip_teal_deep`, padding 20dp):  
  - status heading + `lock_status_th` + `lock_status_en`  
  - `lock_amount_row` (vertical, `gone`): heading, amount, due line  
  - `lock_contract_row` (vertical, `gone`): heading, contract ref, contact line  
  - Emergency `Button` id `lock_emergency` (sand background, teal text)

IDs required: `lock_reason_detail`, `lock_status_th`, `lock_status_en`, `lock_amount_row`, `lock_amount_value`, `lock_due_value`, `lock_contract_row`, `lock_contract_value`, `lock_emergency`.

- [ ] **Step 2: Rewrite `MpPayLockActivity` to inflate + bind**

Keep `EXTRA_CLEAR_LOCK` / `EXTRA_REASON` behavior. Add companion extras:

```kotlin
const val EXTRA_STATUS_LABEL = "statusLabel"
const val EXTRA_STATUS_LABEL_EN = "statusLabelEn"
const val EXTRA_AMOUNT_DUE = "amountDue"
const val EXTRA_DUE_DATE = "dueDate"
const val EXTRA_CONTRACT_REF = "contractRef"
```

On create (non-clear path):

```kotlin
setContentView(R.layout.activity_mp_pay_lock)
val model = LockUiModel.from(
    reason = intent.getStringExtra(EXTRA_REASON),
    statusLabel = intent.getStringExtra(EXTRA_STATUS_LABEL),
    statusLabelEn = intent.getStringExtra(EXTRA_STATUS_LABEL_EN),
    amountDue = intent.getStringExtra(EXTRA_AMOUNT_DUE),
    dueDate = intent.getStringExtra(EXTRA_DUE_DATE),
    contractRef = intent.getStringExtra(EXTRA_CONTRACT_REF),
)
bindLockUi(model)
findViewById<Button>(R.id.lock_emergency).setOnClickListener {
    startActivity(EmergencyDial.intent())
}
// then existing Device Owner lock-task block unchanged
```

`bindLockUi` sets texts; `lock_reason_detail.visibility = if (model.reasonDetail != null) VISIBLE else GONE`; amount/contract rows likewise from `showAmount` / `showContract`.

- [ ] **Step 3: Manifest theme for Lock**

On `MpPayLockActivity` (and alias inherits target):

```xml
android:theme="@style/Theme.Mip.Dpc"
```

- [ ] **Step 4: Compile**

```bash
cd /Users/tanawutmeesubprung/Documents/mobile-installment-platform/apps/android-dpc
./gradlew :app:compileDebugKotlin
```

Expected: SUCCESS.

- [ ] **Step 5: Re-run unit tests**

```bash
./gradlew :app:testDebugUnitTest --tests com.mip.dpc.LockUiModelTest --tests com.mip.dpc.EmergencyDialTest
```

Expected: PASS.

- [ ] **Step 6: Commit (only if user asked)**

```bash
git add apps/android-dpc/app/src/main/res/layout/activity_mp_pay_lock.xml \
  apps/android-dpc/app/src/main/java/com/mip/dpc/MpPayLockActivity.kt \
  apps/android-dpc/app/src/main/AndroidManifest.xml
git commit -m "feat(android-dpc): Teal/Sand split Lock layout with optional dock rows"
```

---

### Task 4: ReminderNotifier strings

**Files:**
- Modify: `apps/android-dpc/app/src/main/java/com/mip/dpc/ReminderNotifier.kt`

- [ ] **Step 1: Use string resources**

In `show` / `ensureChannel`:

```kotlin
.setContentTitle(context.getString(R.string.reminder_title))
.setContentText(context.getString(R.string.reminder_body))
```

Channel:

```kotlin
NotificationChannel(
    CHANNEL_ID,
    context.getString(R.string.reminder_channel_name),
    NotificationManager.IMPORTANCE_DEFAULT,
).apply {
    description = context.getString(R.string.reminder_channel_desc)
}
```

If API allows, `setColor(ContextCompat.getColor(context, R.color.mip_teal))` on the builder (AppCompat already on classpath). Keep `setOngoing(true)` and cancel path unchanged.

- [ ] **Step 2: Compile + ReminderPolicy tests**

```bash
cd /Users/tanawutmeesubprung/Documents/mobile-installment-platform/apps/android-dpc
./gradlew :app:testDebugUnitTest --tests com.mip.dpc.ReminderPolicyTest
```

Expected: PASS (policy tests do not assert notification copy).

- [ ] **Step 3: Commit (only if user asked)**

```bash
git add apps/android-dpc/app/src/main/java/com/mip/dpc/ReminderNotifier.kt
git commit -m "feat(android-dpc): Teal/Sand Reminder notification copy from resources"
```

---

### Task 5: Lab shell + migrate lab activities

**Files:**
- Create: `apps/android-dpc/app/src/main/res/layout/activity_lab_shell.xml`
- Create: `apps/android-dpc/app/src/main/java/com/mip/dpc/LabShell.kt`
- Modify:  
  `LabProvisioningActivity.kt`, `CommandPollActivity.kt`, `LabWipeActivity.kt`,  
  `PolicyRecoveryActivity.kt`, `AdminPolicyComplianceActivity.kt`
- Modify: `AndroidManifest.xml` — lab activities / application default theme

- [ ] **Step 1: Create lab shell layout**

Sand background; brand `@string/lab_brand`; `lab_title` TextView; `lab_body` TextView (teal panel background `@color/mip_teal`, sand text) for status updates.

- [ ] **Step 2: `LabShell.kt` helper**

```kotlin
package com.mip.dpc

import android.app.Activity
import android.view.View
import android.widget.TextView

data class LabShellViews(
    val root: View,
    val title: TextView,
    val body: TextView,
)

object LabShell {
    fun inflate(activity: Activity, title: String): LabShellViews {
        val root = activity.layoutInflater.inflate(R.layout.activity_lab_shell, null)
        val titleView = root.findViewById<TextView>(R.id.lab_title)
        val bodyView = root.findViewById<TextView>(R.id.lab_body)
        titleView.text = title
        activity.setContentView(root)
        return LabShellViews(root, titleView, bodyView)
    }
}
```

- [ ] **Step 3: Migrate each activity**

Replace programmatic LinearLayout/`TextView` roots with:

```kotlin
val shell = LabShell.inflate(this, "…title…")
// use shell.body.text = "…" wherever status/result was updated
```

Preserve all business logic (check-in threads, wipe confirm, poll handler, recovery finish). Titles examples:

| Activity | Title |
|----------|-------|
| LabProvisioning | Device Owner check-in |
| CommandPoll | Command poller |
| LabWipe | Lab wipe |
| PolicyRecovery | Reboot recovery |
| AdminPolicyCompliance | Policy compliance |

- [ ] **Step 4: Manifest themes**

- `android:theme="@style/Theme.Mip.Dpc.Lab"` on application (or each lab activity).  
- Keep `MpPayLockActivity` on `@style/Theme.Mip.Dpc`.  
- `GetProvisioningModeActivity` can stay lab theme (no custom UI required).

- [ ] **Step 5: Compile + full unit tests**

```bash
cd /Users/tanawutmeesubprung/Documents/mobile-installment-platform/apps/android-dpc
./gradlew :app:testDebugUnitTest
```

Expected: all existing unit tests PASS.

- [ ] **Step 6: Commit (only if user asked)**

```bash
git add apps/android-dpc/app/src/main/res/layout/activity_lab_shell.xml \
  apps/android-dpc/app/src/main/java/com/mip/dpc/LabShell.kt \
  apps/android-dpc/app/src/main/java/com/mip/dpc/LabProvisioningActivity.kt \
  apps/android-dpc/app/src/main/java/com/mip/dpc/CommandPollActivity.kt \
  apps/android-dpc/app/src/main/java/com/mip/dpc/LabWipeActivity.kt \
  apps/android-dpc/app/src/main/java/com/mip/dpc/PolicyRecoveryActivity.kt \
  apps/android-dpc/app/src/main/java/com/mip/dpc/AdminPolicyComplianceActivity.kt \
  apps/android-dpc/app/src/main/AndroidManifest.xml
git commit -m "feat(android-dpc): apply Teal/Sand lab shell across DPC activities"
```

---

### Task 6: Version bump + acceptance checklist

**Files:**
- Modify: `apps/android-dpc/app/build.gradle.kts` — `versionCode = 19`, `versionName = "0.1.19-lab"`

- [ ] **Step 1: Bump version**

```kotlin
versionCode = 19
versionName = "0.1.19-lab"
```

- [ ] **Step 2: Assemble debug APK**

```bash
cd /Users/tanawutmeesubprung/Documents/mobile-installment-platform/apps/android-dpc
./gradlew :app:assembleDebug
```

Expected: APK under `app/build/outputs/apk/debug/`.

- [ ] **Step 3: Manual lab acceptance (Pad when available)**

1. Install `0.1.19-lab` on Device Owner Pad.  
2. Enqueue `START_LOCK_TASK` — Lock shows Teal/Sand split, TH+EN, emergency dials 112.  
3. Reason-only: amount/contract rows hidden; status “รอชำระเงิน”.  
4. (Optional adb) start Lock with extras `amountDue=1250.00`, `dueDate=…`, `contractRef=…` — rows appear.  
5. Enqueue REMINDER — notification uses new TH+EN copy.  
6. Open Command poller / Provisioning — sand lab shell visible.  
7. `STOP_LOCK_TASK` still clears via `EXTRA_CLEAR_LOCK`.

- [ ] **Step 4: Commit (only if user asked)**

```bash
git add apps/android-dpc/app/build.gradle.kts
git commit -m "chore(android-dpc): bump to 0.1.19-lab for Teal/Sand UI"
```

---

## Spec coverage (self-review)

| Spec item | Task |
|-----------|------|
| U-1 palette tokens | Task 2 |
| U-2 split Lock | Task 3 |
| U-3 TH+EN | Tasks 2–4 |
| U-4 hide empty rows | Tasks 1, 3 |
| U-5 all DPC surfaces | Tasks 3–5 |
| U-6 XML + themes | Tasks 2–5 |
| U-7 Emergency | Task 3 |
| U-8 lab defaults | Task 1 |
| U-9 Reminder | Task 4 |
| Tests binder / regression | Tasks 1, 3, 5 |
| Version / acceptance | Task 6 |
| Non-goals (Compose, backend payload, authz) | Explicitly omitted |

**Type consistency:** Extra names `statusLabel`, `statusLabelEn`, `amountDue`, `dueDate`, `contractRef` match `LockUiModel.from` and `MpPayLockActivity` companion constants.
