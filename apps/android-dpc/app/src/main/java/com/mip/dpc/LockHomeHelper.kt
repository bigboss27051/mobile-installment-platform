package com.mip.dpc

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager

/**
 * Makes [LockHomeAlias] → [MpPayLockActivity] the HOME target while desired is LOCK.
 * Reliable reboot path on OEMs that suppress BOOT_COMPLETED (e.g. MIUI).
 */
object LockHomeHelper {
    private fun alias(context: Context) = ComponentName(context, "com.mip.dpc.LockHomeAlias")

    fun enableLockHome(context: Context, dpm: DevicePolicyManager, admin: ComponentName) {
        val pm = context.packageManager
        pm.setComponentEnabledSetting(
            alias(context),
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
            PackageManager.DONT_KILL_APP,
        )
        val filter = IntentFilter(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
            addCategory(Intent.CATEGORY_DEFAULT)
        }
        dpm.addPersistentPreferredActivity(admin, filter, alias(context))
    }

    fun clearLockHome(context: Context, dpm: DevicePolicyManager, admin: ComponentName) {
        dpm.clearPackagePersistentPreferredActivities(admin, context.packageName)
        context.packageManager.setComponentEnabledSetting(
            alias(context),
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
            PackageManager.DONT_KILL_APP,
        )
    }
}
