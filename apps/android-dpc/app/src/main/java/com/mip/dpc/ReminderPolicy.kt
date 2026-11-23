package com.mip.dpc

/**
 * Pure rules for REMINDER presentation (notification only — no suspend / lock-task).
 */
object ReminderPolicy {
    fun shouldShowReminder(desiredPresentation: String): Boolean =
        desiredPresentation == "REMINDER"

    fun shouldCancelReminder(desiredPresentation: String): Boolean =
        desiredPresentation != "REMINDER"

    fun shouldSuspend(desiredPresentation: String): Boolean =
        desiredPresentation == "RESTRICT"

    fun shouldStartLockTask(desiredPresentation: String): Boolean =
        desiredPresentation == "LOCK"

    fun resultCode(desiredPresentation: String): String =
        when (desiredPresentation) {
            "REMINDER" -> "REAPPLIED_REMINDER"
            "LOCK" -> "REAPPLIED_LOCK"
            "RESTRICT" -> "REAPPLIED_RESTRICT"
            else -> "REAPPLIED_NONE"
        }
}
