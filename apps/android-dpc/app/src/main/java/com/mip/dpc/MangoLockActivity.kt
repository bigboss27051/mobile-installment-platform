package com.mip.dpc

import android.app.Activity
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Lab LOCK presentation. Uses Lock Task Mode — not [DevicePolicyManager.lockNow].
 */
class MangoLockActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (intent.getBooleanExtra(EXTRA_CLEAR_LOCK, false)) {
            try {
                stopLockTask()
            } catch (_: Exception) {
                // already stopped
            }
            finish()
            return
        }
        val reason = intent.getStringExtra(EXTRA_REASON).orEmpty()
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 48, 48, 48)
        }
        root.addView(
            TextView(this).apply {
                text =
                    "MIP Lock (lab)\nLock Task Mode active.\nEmergency calling must remain available.\n$reason"
                textSize = 18f
            },
        )
        root.addView(
            Button(this).apply {
                text = "Emergency call (112)"
                setOnClickListener {
                    startActivity(EmergencyDial.intent())
                }
            },
        )
        setContentView(root)

        val dpm = getSystemService(DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(this, MipDeviceAdminReceiver::class.java)
        if (dpm.isDeviceOwnerApp(packageName)) {
            dpm.setLockTaskPackages(admin, EmergencyDial.lockTaskPackages(packageName))
            startLockTask()
        }
    }

    companion object {
        const val EXTRA_REASON = "reason"
        /** When true, exit Lock Task and finish (used from WorkManager / non-Activity context). */
        const val EXTRA_CLEAR_LOCK = "clearLock"
    }
}
