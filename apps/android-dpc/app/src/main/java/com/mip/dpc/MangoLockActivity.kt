package com.mip.dpc

import android.app.Activity
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.os.Bundle
import android.view.View
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

        setContentView(R.layout.activity_mango_lock)
        val model =
            LockUiModel.from(
                reason = intent.getStringExtra(EXTRA_REASON),
                statusLabel = intent.getStringExtra(EXTRA_STATUS_LABEL),
                statusLabelEn = intent.getStringExtra(EXTRA_STATUS_LABEL_EN),
                amountDue = intent.getStringExtra(EXTRA_AMOUNT_DUE),
                dueDate = intent.getStringExtra(EXTRA_DUE_DATE),
                contractRef = intent.getStringExtra(EXTRA_CONTRACT_REF),
            )
        bindLockUi(model)
        findViewById<Button>(R.id.lock_emergency).setOnClickListener {
            startActivity(EmergencyDial.intent())
        }

        val dpm = getSystemService(DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(this, MipDeviceAdminReceiver::class.java)
        if (dpm.isDeviceOwnerApp(packageName)) {
            dpm.setLockTaskPackages(admin, EmergencyDial.lockTaskPackages(packageName))
            startLockTask()
        }
    }

    private fun bindLockUi(model: LockUiModel) {
        val reasonView = findViewById<TextView>(R.id.lock_reason_detail)
        if (model.reasonDetail != null) {
            reasonView.text = model.reasonDetail
            reasonView.visibility = View.VISIBLE
        } else {
            reasonView.visibility = View.GONE
        }

        findViewById<TextView>(R.id.lock_status_th).text = model.statusTh
        findViewById<TextView>(R.id.lock_status_en).text = model.statusEn

        val amountRow = findViewById<LinearLayout>(R.id.lock_amount_row)
        if (model.showAmount) {
            amountRow.visibility = View.VISIBLE
            findViewById<TextView>(R.id.lock_amount_value).text = model.amountDisplay
            val dueView = findViewById<TextView>(R.id.lock_due_value)
            if (model.dueDisplay != null) {
                dueView.text = getString(R.string.lock_due_heading) + " " + model.dueDisplay
                dueView.visibility = View.VISIBLE
            } else {
                dueView.visibility = View.GONE
            }
        } else {
            amountRow.visibility = View.GONE
        }

        val contractRow = findViewById<LinearLayout>(R.id.lock_contract_row)
        if (model.showContract) {
            contractRow.visibility = View.VISIBLE
            findViewById<TextView>(R.id.lock_contract_value).text = model.contractRef
        } else {
            contractRow.visibility = View.GONE
        }
    }

    companion object {
        const val EXTRA_REASON = "reason"
        const val EXTRA_STATUS_LABEL = "statusLabel"
        const val EXTRA_STATUS_LABEL_EN = "statusLabelEn"
        const val EXTRA_AMOUNT_DUE = "amountDue"
        const val EXTRA_DUE_DATE = "dueDate"
        const val EXTRA_CONTRACT_REF = "contractRef"

        /** When true, exit Lock Task and finish (used from WorkManager / non-Activity context). */
        const val EXTRA_CLEAR_LOCK = "clearLock"
    }
}
