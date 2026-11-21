package com.mip.dpc

data class EnrollmentExtras(
    val sessionId: String?,
    val enrollmentToken: String?,
    val enrollmentEndpoint: String?,
) {
    fun isCheckInReady(): Boolean {
        return !enrollmentToken.isNullOrBlank() && !enrollmentEndpoint.isNullOrBlank()
    }

    companion object {
        const val SESSION_KEY = "enrollmentSessionId"
        const val TOKEN_KEY = "enrollmentToken"
        const val ENDPOINT_KEY = "enrollmentEndpoint"

        fun fromBundle(values: Map<String, String?>): EnrollmentExtras {
            return EnrollmentExtras(
                sessionId = values[SESSION_KEY]?.takeIf { it.isNotBlank() },
                enrollmentToken = values[TOKEN_KEY]?.takeIf { it.isNotBlank() },
                enrollmentEndpoint = values[ENDPOINT_KEY]?.takeIf { it.isNotBlank() },
            )
        }
    }
}
