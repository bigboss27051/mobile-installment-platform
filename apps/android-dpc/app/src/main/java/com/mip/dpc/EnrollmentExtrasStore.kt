package com.mip.dpc

import android.content.Context

/**
 * Short-lived lab persistence so [AdminPolicyComplianceActivity] can check in when the
 * compliance intent omits provisioning admin extras.
 */
class EnrollmentExtrasStore(context: Context) {
    private val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun save(extras: EnrollmentExtras) {
        if (!extras.isCheckInReady()) {
            return
        }
        prefs.edit()
            .putString(EnrollmentExtras.SESSION_KEY, extras.sessionId)
            .putString(EnrollmentExtras.TOKEN_KEY, extras.enrollmentToken)
            .putString(EnrollmentExtras.ENDPOINT_KEY, extras.enrollmentEndpoint)
            .apply()
    }

    fun load(): EnrollmentExtras? {
        val extras = EnrollmentExtras(
            sessionId = prefs.getString(EnrollmentExtras.SESSION_KEY, null),
            enrollmentToken = prefs.getString(EnrollmentExtras.TOKEN_KEY, null),
            enrollmentEndpoint = prefs.getString(EnrollmentExtras.ENDPOINT_KEY, null),
        )
        return extras.takeIf { it.isCheckInReady() }
    }

    fun clear() {
        prefs.edit().clear().apply()
    }

    companion object {
        private const val PREFS = "mip_enrollment_extras"
    }
}
