package com.mip.dpc

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

class CommandPollWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {
    override suspend fun doWork(): Result {
        return try {
            CommandExecutor.runOnce(applicationContext)
            Result.success()
        } catch (_: Exception) {
            Result.retry()
        }
    }
}