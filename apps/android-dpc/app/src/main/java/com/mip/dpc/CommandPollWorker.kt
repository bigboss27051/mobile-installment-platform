package com.mip.dpc

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.ServiceInfo
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.ForegroundInfo
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

    /** Required for expedited work on API < 31; also used when quota falls back. */
    override suspend fun getForegroundInfo(): ForegroundInfo {
        ensureChannel()
        val notification: Notification =
            NotificationCompat.Builder(applicationContext, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.stat_notify_sync)
                .setContentTitle("MIP")
                .setContentText("Syncing device policy…")
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build()
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ForegroundInfo(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
            )
        } else {
            ForegroundInfo(NOTIFICATION_ID, notification)
        }
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }
        val manager =
            applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (manager.getNotificationChannel(CHANNEL_ID) != null) {
            return
        }
        manager.createNotificationChannel(
            NotificationChannel(
                CHANNEL_ID,
                "Policy sync",
                NotificationManager.IMPORTANCE_LOW,
            ),
        )
    }

    companion object {
        private const val CHANNEL_ID = "mip_command_poll"
        private const val NOTIFICATION_ID = 44021
    }
}
