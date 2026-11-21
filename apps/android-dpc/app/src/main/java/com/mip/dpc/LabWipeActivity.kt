package com.mip.dpc

import android.app.Activity
import android.app.admin.DevicePolicyManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.widget.TextView

/**
 * Lab-only factory wipe via Device Owner.
 * Requires explicit human approval. Not collections. Not a remote FRP bypass tool —
 * ordinary wipe still leaves Google FRP for the next Setup Wizard when accounts existed.
 */
class LabWipeActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val view = TextView(this).apply {
            text = "Lab wipe…"
            textSize = 18f
            setPadding(48, 48, 48, 48)
        }
        setContentView(view)

        val confirmed = intent?.getBooleanExtra(EXTRA_CONFIRM, false) == true
        if (!confirmed) {
            view.text = "Refused: pass confirm=true only after human wipe approval."
            return
        }

        val dpm = getSystemService(DEVICE_POLICY_SERVICE) as DevicePolicyManager
        if (!dpm.isDeviceOwnerApp(packageName)) {
            view.text = "Refused: not Device Owner."
            return
        }

        val flags = DevicePolicyManager.WIPE_EXTERNAL_STORAGE
        val reason = "MIP lab FRP re-prove (approved wipe)"
        view.text = "Wiping via Device Owner (flags=$flags). Device should reboot."
        Log.w(TAG, "Lab wipe starting: flags=$flags reason=$reason")
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                dpm.wipeDevice(flags)
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                dpm.wipeData(flags, reason)
            } else {
                @Suppress("DEPRECATION")
                dpm.wipeData(flags)
            }
            Log.w(TAG, "wipe call returned without exception")
        } catch (error: Exception) {
            Log.e(TAG, "wipe failed", error)
            view.text = "wipe failed: ${error.javaClass.simpleName}: ${error.message}"
        }
    }

    companion object {
        const val EXTRA_CONFIRM = "confirm"
        private const val TAG = "MipLabWipe"
    }
}
