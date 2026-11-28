package com.mip.dpc

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
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
    }
}
