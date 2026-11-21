package com.mip.dpc

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper

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
        val app = context.applicationContext
        return when (desiredPresentation) {
            "LOCK" -> {
                PackageSuspendHelper.unsuspendAll(app, dpm, admin)
                dpm.setLockTaskPackages(admin, arrayOf(app.packageName))
                LockHomeHelper.enableLockHome(app, dpm, admin)
                Handler(Looper.getMainLooper()).post {
                    app.startActivity(
                        Intent(app, MangoLockActivity::class.java)
                            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            .putExtra(MangoLockActivity.EXTRA_REASON, "reboot-recovery"),
                    )
                }
                "REAPPLIED_LOCK"
            }
            "RESTRICT" -> {
                LockHomeHelper.clearLockHome(app, dpm, admin)
                val result = PackageSuspendHelper.suspendNonEssential(app, dpm, admin)
                if (result.ok) "REAPPLIED_RESTRICT" else result.resultCode
            }
            else -> {
                LockHomeHelper.clearLockHome(app, dpm, admin)
                PackageSuspendHelper.unsuspendAll(app, dpm, admin)
                "REAPPLIED_NONE"
            }
        }
    }
}
