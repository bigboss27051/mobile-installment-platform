package com.mip.dpc

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class EnrollmentExtrasResolverTest {
    private val complete = EnrollmentExtras(
        sessionId = "sess-1",
        enrollmentToken = "enc_live",
        enrollmentEndpoint = "https://api.example.test/api/v1/devices/enroll/check-in",
    )

    @Test
    fun prefersCompleteIntentExtrasOverStore() {
        val stored = complete.copy(enrollmentToken = "enc_old")
        val resolved = EnrollmentExtrasResolver.resolve(
            fromIntent = complete,
            fromStore = stored,
        )
        assertEquals("enc_live", resolved.enrollmentToken)
    }

    @Test
    fun fallsBackToStoreWhenIntentMissingToken() {
        val incomplete = EnrollmentExtras(
            sessionId = "sess-1",
            enrollmentToken = null,
            enrollmentEndpoint = null,
        )
        val resolved = EnrollmentExtrasResolver.resolve(
            fromIntent = incomplete,
            fromStore = complete,
        )
        assertEquals("enc_live", resolved.enrollmentToken)
        assertEquals(
            "https://api.example.test/api/v1/devices/enroll/check-in",
            resolved.enrollmentEndpoint,
        )
    }

    @Test
    fun detectsCheckInReadyExtras() {
        assertTrue(complete.isCheckInReady())
        assertFalse(
            EnrollmentExtras(
                sessionId = "sess-1",
                enrollmentToken = "enc_x",
                enrollmentEndpoint = null,
            ).isCheckInReady(),
        )
    }
}
