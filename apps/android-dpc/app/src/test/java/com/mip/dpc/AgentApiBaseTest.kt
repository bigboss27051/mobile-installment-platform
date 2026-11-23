package com.mip.dpc

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class AgentApiBaseTest {
    @Test
    fun derivesHttpsBaseFromCheckInUrl() {
        assertEquals(
            "https://api.example.test/api/v1",
            AgentApiBase.fromCheckInUrl(
                "https://api.example.test/api/v1/devices/enroll/check-in",
            ),
        )
    }

    @Test
    fun allowsLabCleartextWhenEnabled() {
        assertEquals(
            "http://10.0.2.2:3000/api/v1",
            AgentApiBase.fromCheckInUrl(
                "http://10.0.2.2:3000/api/v1/devices/enroll/check-in",
                allowCleartextLab = true,
            ),
        )
    }

    @Test
    fun rejectsCleartextWhenLabFlagOff() {
        assertNull(
            AgentApiBase.fromCheckInUrl(
                "http://10.0.2.2:3000/api/v1/devices/enroll/check-in",
                allowCleartextLab = false,
            ),
        )
    }

    @Test
    fun rejectsMissingCheckInPath() {
        assertNull(AgentApiBase.fromCheckInUrl("https://api.example.test/api/v1/other"))
    }
}
