package com.mip.dpc

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class DeviceOwnerStatusTest {
    @Test
    fun reportsNotDeviceOwner() {
        val status = DeviceOwnerStatus(packageName = "com.mip.dpc", isDeviceOwner = false)
        assertEquals("NOT_DEVICE_OWNER", status.errorCode)
    }

    @Test
    fun clearsErrorWhenOwner() {
        val status = DeviceOwnerStatus(packageName = "com.mip.dpc", isDeviceOwner = true)
        assertNull(status.errorCode)
    }
}
