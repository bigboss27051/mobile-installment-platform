package com.mip.dpc

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LockClearRequestTest {
    @Test
    fun clearExtraTrue_isClearAction() {
        assertEquals(LockIntentAction.CLEAR, LockClearRequest.action(clearLock = true))
        assertTrue(LockClearRequest.shouldClear(clearLock = true))
    }

    @Test
    fun clearExtraFalseOrMissing_isShowAction() {
        assertEquals(LockIntentAction.SHOW, LockClearRequest.action(clearLock = false))
        assertEquals(LockIntentAction.SHOW, LockClearRequest.action(clearLock = null))
        assertFalse(LockClearRequest.shouldClear(clearLock = false))
        assertFalse(LockClearRequest.shouldClear(clearLock = null))
    }

    @Test
    fun singleTaskReuse_mustUseSameRouterAsOnCreate() {
        // WorkManager unlock starts MpPayLockActivity with EXTRA_CLEAR_LOCK while the
        // lock screen is already visible (singleTask). Android delivers that via
        // onNewIntent — both lifecycle entry points must call LockClearRequest.
        val reusedIntentClear = LockClearRequest.action(clearLock = true)
        val coldStartClear = LockClearRequest.action(clearLock = true)
        assertEquals(LockIntentAction.CLEAR, reusedIntentClear)
        assertEquals(reusedIntentClear, coldStartClear)
    }
}
