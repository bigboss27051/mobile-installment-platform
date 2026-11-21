package com.mip.dpc

import android.app.Activity
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.os.Bundle
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Lab LOCK presentation. Uses Lock Task Mode — not [DevicePolicyManager.lockNow].
 */
class MangoLockActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val reason = intent.getStringExtra(EXTRA_REASON).orEmpty()
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 48, 48, 48)
        }
        root.addView(
            TextView(this).apply {
                text = "MIP Lock (lab)\nLock Task Mode active.\nEmergency calling must remain available.\n$reason"
                textSize = 18f
            },
        )
        setContentView(root)

        val dpm = getSystemService(DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(this, MipDeviceAdminReceiver::class.java)
        if (dpm.isDeviceOwnerApp(packageName)) {
            dpm.setLockTaskPackages(admin, arrayOf(packageName))
            startLockTask()
        }
    }

    companion object {
        const val EXTRA_REASON = "reason"
    }
}
