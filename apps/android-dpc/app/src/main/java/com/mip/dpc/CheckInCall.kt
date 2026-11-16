package com.mip.dpc

data class CheckInCall(
    val url: String,
    val enrollmentToken: String,
    val body: String,
) {
    companion object {
        fun plan(extras: EnrollmentExtras, status: DeviceOwnerStatus): CheckInCall? {
            val token = extras.enrollmentToken?.trim().orEmpty()
            val endpoint = extras.enrollmentEndpoint?.trim().orEmpty()
            if (token.isEmpty() || !isHttpsCheckIn(endpoint)) {
                return null
            }
            return CheckInCall(
                url = endpoint,
                enrollmentToken = token,
                body = CheckInRequest.from(status, extras).toJson(),
            )
        }

        private fun isHttpsCheckIn(endpoint: String): Boolean {
            return endpoint.startsWith("https://") &&
                !endpoint.contains("@") &&
                !endpoint.contains("?") &&
                !endpoint.contains("#") &&
                endpoint.endsWith("/api/v1/devices/enroll/check-in")
        }
    }
}
