package com.mip.dpc

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class MipDeviceAdminReceiver : DeviceAdminReceiver() {
    override fun onEnabled(context: Context, intent: Intent) {
        Log.i(TAG, "device admin enabled")
        launchCheckIn(context, intent)
    }

    override fun onProfileProvisioningComplete(context: Context, intent: Intent) {
        Log.i(TAG, "profile provisioning complete")
        launchCheckIn(context, intent)
    }

    private fun launchCheckIn(context: Context, source: Intent) {
        val launch = Intent(context, LabProvisioningActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            source.extras?.let { putExtras(it) }
        }
        context.startActivity(launch)
    }

    companion object {
        private const val TAG = "MipDeviceAdmin"
    }
}
