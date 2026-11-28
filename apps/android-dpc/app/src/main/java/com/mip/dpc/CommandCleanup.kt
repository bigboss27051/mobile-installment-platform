package com.mip.dpc

/**
 * Declares cleanup that [CommandExecutor] must apply per command type so it stays
 * aligned with [PolicyRecovery] (unsuspend on LOCK/NONE, clear lock home on step-down).
 */
object CommandCleanup {
    fun requiresUnsuspend(type: String): Boolean =
        type == "START_LOCK_TASK" ||
            type == "STOP_LOCK_TASK" ||
            type == "STOP_PACKAGE_SUSPEND"

    fun requiresClearLockUi(type: String): Boolean =
        type == "STOP_LOCK_TASK" || type == "START_PACKAGE_SUSPEND"

    fun requiresClearLockHome(type: String): Boolean =
        type == "STOP_LOCK_TASK" ||
            type == "START_PACKAGE_SUSPEND" ||
            type == "STOP_PACKAGE_SUSPEND"

    fun requiresCancelReminder(type: String): Boolean =
        type == "START_LOCK_TASK" ||
            type == "STOP_LOCK_TASK" ||
            type == "START_PACKAGE_SUSPEND" ||
            type == "STOP_PACKAGE_SUSPEND"
}
