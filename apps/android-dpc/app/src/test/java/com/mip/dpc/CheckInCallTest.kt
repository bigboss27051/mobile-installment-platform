package com.mip.dpc

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class CheckInCallTest {
    private val owner = DeviceOwnerStatus("com.mip.dpc", true)

    @Test
    fun plansHttpsCheckInWithoutPuttingTokenInBody() {
        val call = CheckInCall.plan(
            EnrollmentExtras(
                sessionId = "sess-1",
                enrollmentToken = "enc_from_qr",
                enrollmentEndpoint = "https://api.example.test/api/v1/devices/enroll/check-in",
            ),
            owner,
        )
        assertEquals("https://api.example.test/api/v1/devices/enroll/check-in", call!!.url)
        assertEquals("enc_from_qr", call.enrollmentToken)
        assertEquals(false, call.body.contains("enc_from_qr"))
        assertEquals(true, call.body.contains("\"sessionId\":\"sess-1\""))
        assertEquals(true, call.body.contains("\"deviceOwner\":true"))
    }

    @Test
    fun refusesCleartextEndpoint() {
        assertNull(
            CheckInCall.plan(
                EnrollmentExtras(
                    sessionId = "sess-1",
                    enrollmentToken = "enc_from_qr",
                    enrollmentEndpoint = "http://10.0.2.2:3000/api/v1/devices/enroll/check-in",
                ),
                owner,
            ),
        )
    }
}
