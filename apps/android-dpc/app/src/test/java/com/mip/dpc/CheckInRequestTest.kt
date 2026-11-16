package com.mip.dpc

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CheckInRequestTest {
    @Test
    fun jsonOmitsSecrets() {
        val json = CheckInRequest.from(
            DeviceOwnerStatus("com.mip.dpc", true),
            EnrollmentExtras("sess-1", null, null),
        ).toJson()
        assertTrue(json.contains("\"sessionId\":\"sess-1\""))
        assertTrue(json.contains("\"deviceOwner\":true"))
        assertFalse(json.contains("enc_"))
        assertFalse(json.contains("WIFI"))
    }

    @Test
    fun jsonIncludesNotOwnerError() {
        val json = CheckInRequest.from(
            DeviceOwnerStatus("com.mip.dpc", false),
            EnrollmentExtras(null, null, null),
        ).toJson()
        assertEquals("{\"errorCode\":\"NOT_DEVICE_OWNER\",\"deviceOwner\":false}", json)
    }
}
