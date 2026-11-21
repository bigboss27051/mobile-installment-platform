package com.mip.dpc

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.os.Bundle
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import kotlin.concurrent.thread

class LabProvisioningActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val dpm = getSystemService(DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val status = DeviceOwnerStatus(
            packageName = packageName,
            isDeviceOwner = dpm.isDeviceOwnerApp(packageName),
        )
        val store = EnrollmentExtrasStore(this)
        val fromIntent = EnrollmentExtras.fromBundle(readAdminExtras(intent.extras))
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
                val result = CheckInHttp.post(call)
                if (!result.agentToken.isNullOrBlank() && !result.apiBase.isNullOrBlank()) {
                    AgentTokenStore(this).save(
                        agentToken = result.agentToken,
                        apiBase = result.apiBase,
                        deviceId = result.deviceId.orEmpty(),
                    )
                }
                store.clear()
                runOnUiThread { resultView.text = result.message }
            }
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
