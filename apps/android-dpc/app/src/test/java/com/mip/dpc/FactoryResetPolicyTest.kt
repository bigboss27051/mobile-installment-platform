package com.mip.dpc

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FactoryResetPolicyTest {
    @Test
    fun blocksSettingsFactoryResetOnlyWhileDeviceOwner() {
        assertTrue(FactoryResetPolicy.shouldBlock(isDeviceOwner = true))
        assertFalse(FactoryResetPolicy.shouldBlock(isDeviceOwner = false))
    }
}
