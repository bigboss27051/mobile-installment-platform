package com.mip.dpc

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper

/**
 * Re-applies the last **authorized** desired presentation after reboot / policy fetch.
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
                ReminderNotifier.cancel(app)
                PackageSuspendHelper.unsuspendAll(app, dpm, admin)
                dpm.setLockTaskPackages(admin, EmergencyDial.lockTaskPackages(app.packageName))
                LockHomeHelper.enableLockHome(app, dpm, admin)
                Handler(Looper.getMainLooper()).post {
                    app.startActivity(
                        Intent(app, MpPayLockActivity::class.java)
                            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            .putExtra(MpPayLockActivity.EXTRA_REASON, "reboot-recovery"),
                    )
                }
                ReminderPolicy.resultCode("LOCK")
            }
            "RESTRICT" -> {
                ReminderNotifier.cancel(app)
                LockHomeHelper.clearLockHome(app, dpm, admin)
                val result = PackageSuspendHelper.suspendNonEssential(app, dpm, admin)
                if (result.ok) ReminderPolicy.resultCode("RESTRICT") else result.resultCode
            }
            "REMINDER" -> {
                LockHomeHelper.clearLockHome(app, dpm, admin)
                PackageSuspendHelper.unsuspendAll(app, dpm, admin)
                ReminderNotifier.show(app)
                ReminderPolicy.resultCode("REMINDER")
            }
            else -> {
                ReminderNotifier.cancel(app)
                LockHomeHelper.clearLockHome(app, dpm, admin)
                PackageSuspendHelper.unsuspendAll(app, dpm, admin)
                ReminderPolicy.resultCode("NONE")
            }
        }
    }
}
