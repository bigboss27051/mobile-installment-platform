package com.mip.dpc

/**
 * Derives the agent API base from the enrollment check-in URL.
 * Production expects HTTPS; lab cleartext (adb reverse / emulator) is allowed.
 */
object AgentApiBase {
    fun fromCheckInUrl(checkInUrl: String, allowCleartextLab: Boolean = true): String? {
        val trimmed = checkInUrl.trim()
        if (trimmed.isEmpty()) {
            return null
        }
        val marker = "/devices/enroll/check-in"
        val idx = trimmed.indexOf(marker)
        if (idx < 0) {
            return null
        }
        val base = trimmed.substring(0, idx).trimEnd('/')
        if (base.startsWith("https://")) {
            return base
        }
        if (allowCleartextLab && base.startsWith("http://")) {
            return base
        }
        return null
    }
}
