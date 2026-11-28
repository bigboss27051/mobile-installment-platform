package com.mip.dpc

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * CommandExecutor side effects must match [PolicyRecovery] so ladder escalate/unlock
 * does not leave packages suspended or Lock Task stuck after a later command.
 */
class CommandCleanupTest {
    @Test
    fun startLock_clearsSuspendLikePolicyRecovery() {
        assertTrue(CommandCleanup.requiresUnsuspend("START_LOCK_TASK"))
        assertTrue(CommandCleanup.requiresCancelReminder("START_LOCK_TASK"))
        assertFalse(CommandCleanup.requiresClearLockUi("START_LOCK_TASK"))
    }

    @Test
    fun stopLock_unsuspendsAndClearsLockUi() {
        // Payment unlock from LOCK only enqueues STOP_LOCK_TASK; leftover RESTRICT
        // packages must clear here (payment-to-unlock "unsuspend envelope").
        assertTrue(CommandCleanup.requiresUnsuspend("STOP_LOCK_TASK"))
        assertTrue(CommandCleanup.requiresClearLockUi("STOP_LOCK_TASK"))
        assertTrue(CommandCleanup.requiresClearLockHome("STOP_LOCK_TASK"))
        assertTrue(CommandCleanup.requiresCancelReminder("STOP_LOCK_TASK"))
    }

    @Test
    fun startPackageSuspend_exitsLockIfPresent() {
        assertTrue(CommandCleanup.requiresClearLockUi("START_PACKAGE_SUSPEND"))
        assertTrue(CommandCleanup.requiresClearLockHome("START_PACKAGE_SUSPEND"))
        assertTrue(CommandCleanup.requiresCancelReminder("START_PACKAGE_SUSPEND"))
        assertFalse(CommandCleanup.requiresUnsuspend("START_PACKAGE_SUSPEND"))
    }

    @Test
    fun stopPackageSuspend_unsuspendsOnly() {
        assertTrue(CommandCleanup.requiresUnsuspend("STOP_PACKAGE_SUSPEND"))
        assertTrue(CommandCleanup.requiresClearLockHome("STOP_PACKAGE_SUSPEND"))
        assertFalse(CommandCleanup.requiresClearLockUi("STOP_PACKAGE_SUSPEND"))
        assertTrue(CommandCleanup.requiresCancelReminder("STOP_PACKAGE_SUSPEND"))
    }
}
