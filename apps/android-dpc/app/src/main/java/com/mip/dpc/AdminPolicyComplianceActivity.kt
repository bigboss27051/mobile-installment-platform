package com.mip.dpc

import android.app.Activity
import android.app.admin.DevicePolicyManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.LinearLayout
import android.widget.TextView
import kotlin.concurrent.thread

/**
 * Android 12+ post-provisioning step. Must finish with RESULT_OK or Setup Wizard fails.
 * Persists/restores enrollment extras and attempts check-in before finishing (with timeout).
 */
class AdminPolicyComplianceActivity : Activity() {
    private val mainHandler = Handler(Looper.getMainLooper())
    private var finished = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val dpm = getSystemService(DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val status = DeviceOwnerStatus(
            packageName = packageName,
            isDeviceOwner = dpm.isDeviceOwnerApp(packageName),
        )
        val store = EnrollmentExtrasStore(this)
        val fromIntent = EnrollmentExtras.fromBundle(
            LabProvisioningActivity.readAdminExtras(intent.extras),
        )
        if (fromIntent.isCheckInReady()) {
            store.save(fromIntent)
        }
        val extras = EnrollmentExtrasResolver.resolve(fromIntent, store.load())
        val call = CheckInCall.plan(extras, status)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 48, 48, 48)
        }
        val statusView = TextView(this).apply {
            text = "Device Owner: ${status.isDeviceOwner}\nPolicy compliance. Play Protect stays on."
            textSize = 16f
        }
        val resultView = TextView(this)
        root.addView(statusView)
        root.addView(resultView)
        setContentView(root)

        if (call == null) {
            resultView.text = "No HTTPS enrollment extras; finishing provisioning."
            finishOk()
            return
        }

        resultView.text = "Checking in…"
        mainHandler.postDelayed({ finishOk() }, CHECK_IN_TIMEOUT_MS)
        thread {
            val result = CheckInHttp.post(call)
            if (!result.agentToken.isNullOrBlank() && !result.apiBase.isNullOrBlank()) {
                AgentTokenStore(this).save(
                    agentToken = result.agentToken,
                    apiBase = result.apiBase,
                    deviceId = result.deviceId.orEmpty(),
                )
                CommandPollScheduler.ensurePeriodic(applicationContext)
                PushTokenClient.registerIfPossible(applicationContext)
            }
            store.clear()
            runOnUiThread {
                resultView.text = result.message
                finishOk()
            }
        }
    }

    private fun finishOk() {
        if (finished || isFinishing) {
            return
        }
        finished = true
        mainHandler.removeCallbacksAndMessages(null)
        setResult(RESULT_OK)
        finish()
    }

    companion object {
        private const val CHECK_IN_TIMEOUT_MS = 20_000L
    }
}
