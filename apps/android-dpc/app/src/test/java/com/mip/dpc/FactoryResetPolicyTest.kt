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

    @Test
    fun locksGoogleAccountChangesOnlyWhileDeviceOwner() {
        assertTrue(FactoryResetPolicy.shouldLockAccounts(isDeviceOwner = true))
        assertFalse(FactoryResetPolicy.shouldLockAccounts(isDeviceOwner = false))
    }

    @Test
    fun blocksSideloadOnlyWhileDeviceOwner() {
        assertTrue(FactoryResetPolicy.shouldBlockSideload(isDeviceOwner = true))
        assertFalse(FactoryResetPolicy.shouldBlockSideload(isDeviceOwner = false))
    }

    @Test
    fun blocksDeveloperModeForCustomersAndLeavesTheLabBuildOpen() {
        assertTrue(
            FactoryResetPolicy.shouldBlockDeveloperMode(
                isDeviceOwner = true,
                allowDeveloperMode = false,
            ),
        )
        assertFalse(
            FactoryResetPolicy.shouldBlockDeveloperMode(
                isDeviceOwner = true,
                allowDeveloperMode = true,
            ),
        )
        assertFalse(
            FactoryResetPolicy.shouldBlockDeveloperMode(
                isDeviceOwner = false,
                allowDeveloperMode = false,
            ),
        )
    }

    @Test
    fun blocksUsbDataForCustomersAndLeavesTheLabCableOpen() {
        assertTrue(
            FactoryResetPolicy.shouldBlockUsbData(
                isDeviceOwner = true,
                allowDeveloperMode = false,
            ),
        )
        assertFalse(
            FactoryResetPolicy.shouldBlockUsbData(
                isDeviceOwner = true,
                allowDeveloperMode = true,
            ),
        )
        assertFalse(
            FactoryResetPolicy.shouldBlockUsbData(
                isDeviceOwner = false,
                allowDeveloperMode = false,
            ),
        )
    }
}
