package com.mip.dpc

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ReminderPolicyTest {
    @Test
    fun reminderShowsNotificationAndDoesNotRestrict() {
        assertTrue(ReminderPolicy.shouldShowReminder("REMINDER"))
        assertFalse(ReminderPolicy.shouldSuspend("REMINDER"))
        assertFalse(ReminderPolicy.shouldStartLockTask("REMINDER"))
        assertEquals("REAPPLIED_REMINDER", ReminderPolicy.resultCode("REMINDER"))
    }

    @Test
    fun noneCancelsReminder() {
        assertTrue(ReminderPolicy.shouldCancelReminder("NONE"))
        assertFalse(ReminderPolicy.shouldShowReminder("NONE"))
        assertEquals("REAPPLIED_NONE", ReminderPolicy.resultCode("NONE"))
    }

    @Test
    fun lockAndRestrictDoNotUseReminderChannel() {
        assertFalse(ReminderPolicy.shouldShowReminder("LOCK"))
        assertFalse(ReminderPolicy.shouldShowReminder("RESTRICT"))
        assertTrue(ReminderPolicy.shouldCancelReminder("LOCK"))
        assertTrue(ReminderPolicy.shouldCancelReminder("RESTRICT"))
    }
}
