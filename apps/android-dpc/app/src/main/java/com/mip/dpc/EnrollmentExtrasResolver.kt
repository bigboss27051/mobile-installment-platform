package com.mip.dpc

object EnrollmentExtrasResolver {
    fun resolve(
        fromIntent: EnrollmentExtras,
        fromStore: EnrollmentExtras?,
    ): EnrollmentExtras {
        if (fromIntent.isCheckInReady()) {
            return fromIntent
        }
        return fromStore ?: fromIntent
    }
}
