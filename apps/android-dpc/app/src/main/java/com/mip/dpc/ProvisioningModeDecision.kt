package com.mip.dpc

/**
 * Pure decision for [android.app.action.GET_PROVISIONING_MODE].
 * Values match [android.app.admin.DevicePolicyManager] provisioning mode constants.
 */
data class ProvisioningModeDecision(val mode: Int) {
    companion object {
        const val FULLY_MANAGED_DEVICE = 1
        const val MANAGED_PROFILE = 2

        fun forAllowedModes(allowedModes: IntArray?): ProvisioningModeDecision? {
            // Some OEM builds omit the extra; still request Device Owner.
            if (allowedModes == null || allowedModes.isEmpty()) {
                return ProvisioningModeDecision(FULLY_MANAGED_DEVICE)
            }
            if (!allowedModes.contains(FULLY_MANAGED_DEVICE)) {
                return null
            }
            return ProvisioningModeDecision(FULLY_MANAGED_DEVICE)
        }
    }
}
