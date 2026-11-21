package com.mip.dpc

import android.app.Activity
import android.app.admin.DevicePolicyManager
import android.content.Intent
import android.os.Bundle

/**
 * Android 12+ managed provisioning entry: choose fully managed Device Owner mode.
 */
class GetProvisioningModeActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val extras = EnrollmentExtras.fromBundle(
            LabProvisioningActivity.readAdminExtras(intent.extras),
        )
        EnrollmentExtrasStore(this).save(extras)

        val allowed = intent.getIntArrayExtra(DevicePolicyManager.EXTRA_PROVISIONING_ALLOWED_PROVISIONING_MODES)
        val decision = ProvisioningModeDecision.forAllowedModes(allowed)
        if (decision == null) {
            setResult(RESULT_CANCELED)
        } else {
            setResult(
                RESULT_OK,
                Intent().putExtra(DevicePolicyManager.EXTRA_PROVISIONING_MODE, decision.mode),
            )
        }
        finish()
    }
}
