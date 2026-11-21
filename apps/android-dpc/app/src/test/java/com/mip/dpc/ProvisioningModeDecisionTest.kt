package com.mip.dpc

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ProvisioningModeDecisionTest {
    @Test
    fun selectsFullyManagedDeviceWhenAllowed() {
        val decision = ProvisioningModeDecision.forAllowedModes(
            intArrayOf(
                ProvisioningModeDecision.MANAGED_PROFILE,
                ProvisioningModeDecision.FULLY_MANAGED_DEVICE,
            ),
        )
        assertEquals(ProvisioningModeDecision.FULLY_MANAGED_DEVICE, decision!!.mode)
    }

    @Test
    fun returnsNullWhenFullyManagedIsNotAllowed() {
        assertNull(
            ProvisioningModeDecision.forAllowedModes(
                intArrayOf(ProvisioningModeDecision.MANAGED_PROFILE),
            ),
        )
    }

    @Test
    fun defaultsToFullyManagedWhenAllowedModesMissing() {
        assertEquals(
            ProvisioningModeDecision.FULLY_MANAGED_DEVICE,
            ProvisioningModeDecision.forAllowedModes(null)!!.mode,
        )
        assertEquals(
            ProvisioningModeDecision.FULLY_MANAGED_DEVICE,
            ProvisioningModeDecision.forAllowedModes(intArrayOf())!!.mode,
        )
    }
}
