package com.mip.dpc

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent

/**
 * Re-applies the last **authorized** desired presentation after reboot.
 * Does not escalate and does not invent overdue locks.
 */
object PolicyRecovery {
    fun reapply(context: Context, desiredPresentation: String): String {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, MipDeviceAdminReceiver::class.java)
        if (!dpm.isDeviceOwnerApp(context.packageName)) {
            return "NOT_DEVICE_OWNER"
        }
        return when (desiredPresentation) {
            "LOCK" -> {
                PackageSuspendHelper.unsuspendAll(context, dpm, admin)
                dpm.setLockTaskPackages(admin, arrayOf(context.packageName))
                context.startActivity(
                    Intent(context, MangoLockActivity::class.java)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        .putExtra(MangoLockActivity.EXTRA_REASON, "reboot-recovery"),
                )
                "REAPPLIED_LOCK"
            }
            "RESTRICT" -> {
                val result = PackageSuspendHelper.suspendNonEssential(context, dpm, admin)
                if (result.ok) "REAPPLIED_RESTRICT" else result.resultCode
            }
            else -> {
                PackageSuspendHelper.unsuspendAll(context, dpm, admin)
                "REAPPLIED_NONE"
            }
        }
    }
}
