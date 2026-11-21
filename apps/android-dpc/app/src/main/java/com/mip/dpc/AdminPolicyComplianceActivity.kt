package com.mip.dpc

import android.app.Activity
import android.app.admin.DevicePolicyManager
import android.os.Bundle
import android.widget.LinearLayout
import android.widget.TextView
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

/**
 * Android 12+ post-provisioning step. Must finish with RESULT_OK or Setup Wizard fails.
 */
class AdminPolicyComplianceActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val dpm = getSystemService(DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val status = DeviceOwnerStatus(
            packageName = packageName,
            isDeviceOwner = dpm.isDeviceOwnerApp(packageName),
        )
        val extras = EnrollmentExtras.fromBundle(
            LabProvisioningActivity.readAdminExtras(intent.extras),
        )
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

        // Setup Wizard requires RESULT_OK promptly. Do not block on network check-in.
        if (call == null) {
            resultView.text = "No HTTPS enrollment extras; finishing provisioning."
            finishOk()
            return
        }

        resultView.text = "Finishing provisioning; check-in in background…"
        finishOk()
        thread {
            postCheckIn(call)
        }
    }

    private fun finishOk() {
        setResult(RESULT_OK)
        finish()
    }

    private fun postCheckIn(call: CheckInCall): String {
        val connection = URL(call.url).openConnection() as HttpURLConnection
        return try {
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("X-Enrollment-Token", call.enrollmentToken)
            connection.doOutput = true
            OutputStreamWriter(connection.outputStream).use { it.write(call.body) }
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val response = stream?.bufferedReader()?.readText().orEmpty()
            "$code $response"
        } catch (error: Exception) {
            error.message ?: "check-in failed"
        } finally {
            connection.disconnect()
        }
    }
}
