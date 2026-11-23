package com.mip.dpc

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import kotlin.concurrent.thread

/**
 * Runs after boot/unlock so recovery is not blocked by background-activity limits.
 */
class PolicyRecoveryService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        try {
            ensureChannel()
            val notification: Notification = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Notification.Builder(this, CHANNEL_ID)
                    .setContentTitle("MIP policy recovery")
                    .setContentText("Re-applying authorized device policy")
                    .setSmallIcon(android.R.drawable.ic_lock_lock)
                    .build()
            } else {
                @Suppress("DEPRECATION")
                Notification.Builder(this)
                    .setContentTitle("MIP policy recovery")
                    .setContentText("Re-applying authorized device policy")
                    .setSmallIcon(android.R.drawable.ic_lock_lock)
                    .build()
            }
            startForeground(NOTIFICATION_ID, notification)
        } catch (error: Exception) {
            Log.e(TAG, "startForeground failed", error)
            stopSelf(startId)
            return START_NOT_STICKY
        }

        thread {
            try {
                val session = AgentTokenStore(this).load()
                val cache = PolicyCacheStore(this)
                val remote = session?.let { PolicyClient.fetch(it) }
                val desired = remote?.desiredPresentation ?: cache.load().desiredPresentation
                if (remote != null) {
                    cache.save(remote.desiredPresentation, remote.platformState, remote.policyVersion)
                }
                val result = PolicyRecovery.reapply(this, desired)
                Log.i(TAG, "recovery desired=$desired result=$result")
                if (desired != "LOCK") {
                    Handler(Looper.getMainLooper()).post {
                        startActivity(
                            Intent(this, CommandPollActivity::class.java)
                                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                        )
                    }
                }
            } catch (error: Exception) {
                Log.e(TAG, "recovery failed", error)
            } finally {
                Handler(Looper.getMainLooper()).postDelayed({
                    stopForeground(STOP_FOREGROUND_REMOVE)
                    stopSelf(startId)
                }, 2_000L)
            }
        }
        return START_NOT_STICKY
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }
        val manager = getSystemService(NotificationManager::class.java)
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Policy recovery",
            NotificationManager.IMPORTANCE_LOW,
        )
        manager.createNotificationChannel(channel)
    }

    companion object {
        private const val TAG = "MipPolicyRecovery"
        private const val CHANNEL_ID = "mip_policy_recovery"
        private const val NOTIFICATION_ID = 42001
    }
}
