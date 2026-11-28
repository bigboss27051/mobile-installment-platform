package com.mip.dpc

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.os.Build
import android.os.UserManager

object FactoryResetGuard {
    fun apply(context: Context) {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager
            ?: return
        if (!FactoryResetPolicy.shouldBlock(dpm.isDeviceOwnerApp(context.packageName))) {
            return
        }
        val admin = ComponentName(context, MipDeviceAdminReceiver::class.java)
        dpm.addUserRestriction(admin, UserManager.DISALLOW_FACTORY_RESET)
        if (FactoryResetPolicy.shouldLockAccounts(true)) {
            dpm.addUserRestriction(admin, UserManager.DISALLOW_MODIFY_ACCOUNTS)
        }
        if (FactoryResetPolicy.shouldBlockSideload(true)) {
            dpm.addUserRestriction(admin, UserManager.DISALLOW_INSTALL_UNKNOWN_SOURCES)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                dpm.addUserRestriction(admin, UserManager.DISALLOW_INSTALL_UNKNOWN_SOURCES_GLOBALLY)
            }
        }
        if (FactoryResetPolicy.shouldBlockDeveloperMode(true, BuildConfig.ALLOW_DEVELOPER_MODE)) {
            dpm.addUserRestriction(admin, UserManager.DISALLOW_DEBUGGING_FEATURES)
        }
    }
}
