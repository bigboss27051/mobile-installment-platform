package com.mip.dpc

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class EmergencyDialTest {
    @Test
    fun uriIsTel112() {
        assertEquals("tel:112", EmergencyDial.uriString())
    }

    @Test
    fun usesActionDialNotCall() {
        assertEquals("android.intent.action.DIAL", EmergencyDial.intentAction())
    }

    @Test
    fun lockTaskPackagesIncludeDpcAndDialer() {
        val packages = EmergencyDial.lockTaskPackages("com.mip.dpc")
        assertEquals("com.mip.dpc", packages.first())
        assertTrue(packages.contains("com.android.dialer") || packages.contains("com.google.android.dialer"))
    }
}
