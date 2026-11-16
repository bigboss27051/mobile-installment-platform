package com.mip.dpc

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.os.Bundle
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class LabProvisioningActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val dpm = getSystemService(DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val status = DeviceOwnerStatus(
            packageName = packageName,
            isDeviceOwner = dpm.isDeviceOwnerApp(packageName),
        )
        val extras = EnrollmentExtras.fromBundle(readAdminExtras(intent.extras))
        val call = CheckInCall.plan(extras, status)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 48, 48, 48)
        }
        val statusView = TextView(this).apply {
            text = "Device Owner: ${status.isDeviceOwner}\nQR check-in only. Play Protect stays on. No kiosk."
            textSize = 16f
        }
        val resultView = TextView(this).apply {
            text = if (call == null) {
                "No HTTPS enrollment extras on this launch."
            } else {
                "Checking in…"
            }
        }
        root.addView(statusView)
        root.addView(resultView)
        setContentView(root)

        if (call != null) {
            thread {
                val message = postCheckIn(call)
                runOnUiThread { resultView.text = message }
            }
        }
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

    companion object {
        fun adminComponent(packageName: String): ComponentName {
            return ComponentName(packageName, MipDeviceAdminReceiver::class.java.name)
        }

        fun readAdminExtras(extras: Bundle?): Map<String, String?> {
            val bundle = extras?.getBundle(DevicePolicyManager.EXTRA_PROVISIONING_ADMIN_EXTRAS_BUNDLE)
                ?: extras
            if (bundle == null) {
                return emptyMap()
            }
            return mapOf(
                EnrollmentExtras.SESSION_KEY to bundle.getString(EnrollmentExtras.SESSION_KEY),
                EnrollmentExtras.TOKEN_KEY to bundle.getString(EnrollmentExtras.TOKEN_KEY),
                EnrollmentExtras.ENDPOINT_KEY to bundle.getString(EnrollmentExtras.ENDPOINT_KEY),
            )
        }
    }
}
