package com.mip.dpc

data class CheckInRequest(
    val deviceOwner: Boolean,
    val sessionId: String?,
    val errorCode: String?,
) {
    fun toJson(): String {
        val session = sessionId?.let { "\"sessionId\":\"${escape(it)}\"," } ?: ""
        val error = errorCode?.let { "\"errorCode\":\"${escape(it)}\"," } ?: ""
        return "{$session$error\"deviceOwner\":$deviceOwner}"
    }

    companion object {
        fun from(status: DeviceOwnerStatus, extras: EnrollmentExtras): CheckInRequest {
            return CheckInRequest(
                deviceOwner = status.isDeviceOwner,
                sessionId = extras.sessionId,
                errorCode = status.errorCode,
            )
        }

        private fun escape(value: String): String {
            return value.replace("\\", "\\\\").replace("\"", "\\\"")
        }
    }
}
