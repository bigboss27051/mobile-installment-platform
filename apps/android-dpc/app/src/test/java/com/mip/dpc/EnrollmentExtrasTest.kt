package com.mip.dpc

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class EnrollmentExtrasTest {
    @Test
    fun readsQrAdminExtras() {
        val extras = EnrollmentExtras.fromBundle(
            mapOf(
                EnrollmentExtras.SESSION_KEY to "11111111-1111-4111-8111-111111111111",
                EnrollmentExtras.TOKEN_KEY to "enc_from_qr",
                EnrollmentExtras.ENDPOINT_KEY to "https://api.example.test/api/v1/devices/enroll/check-in",
            ),
        )
        assertEquals("11111111-1111-4111-8111-111111111111", extras.sessionId)
        assertEquals("enc_from_qr", extras.enrollmentToken)
        assertEquals(
            "https://api.example.test/api/v1/devices/enroll/check-in",
            extras.enrollmentEndpoint,
        )
    }

    @Test
    fun ignoresBlankSessionId() {
        assertNull(
            EnrollmentExtras.fromBundle(mapOf(EnrollmentExtras.SESSION_KEY to " ")).sessionId,
        )
    }
}
