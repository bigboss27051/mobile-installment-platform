package com.mip.dpc

/**
 * Routes lock-screen intents for both cold start ([android.app.Activity.onCreate]) and
 * [android.app.Activity.onNewIntent] when [MpPayLockActivity] is `singleTask` and already
 * visible. WorkManager unlock sends [EXTRA_CLEAR_LOCK]; without handling onNewIntent the
 * phone stays locked while the backend still receives ACKED_SUCCESS.
 */
enum class LockIntentAction {
    SHOW,
    CLEAR,
}

object LockClearRequest {
    const val EXTRA_CLEAR_LOCK = "clearLock"

    fun shouldClear(clearLock: Boolean?): Boolean = clearLock == true

    fun action(clearLock: Boolean?): LockIntentAction =
        if (shouldClear(clearLock)) LockIntentAction.CLEAR else LockIntentAction.SHOW
}
