package com.mip.dpc

import android.app.ActivityOptions
import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock
import android.util.Log
import kotlin.concurrent.thread

/**
 * After unlock, start recovery FGS and schedule a short exact-alarm backup (MIUI may kill the process).
 */
class BootCompletedReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        val action = intent?.action ?: return
        when (action) {
            Intent.ACTION_LOCKED_BOOT_COMPLETED -> {
                Log.i(TAG, "locked boot — defer until unlock")
                return
            }
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_USER_UNLOCKED,
            -> Unit
            else -> return
        }

        Log.i(TAG, "boot/unlock recovery for $action")
        MipDpcApp.markPending(context)
        val pendingResult = goAsync()
        thread {
            try {
                startRecoveryService(context)
                scheduleBackupLaunch(context)
                launchRecoveryActivity(context)
            } catch (error: Exception) {
                Log.e(TAG, "boot recovery orchestration failed", error)
            } finally {
                pendingResult.finish()
            }
        }
    }

    private fun startRecoveryService(context: Context) {
        val service = Intent(context, PolicyRecoveryService::class.java)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(service)
            } else {
                context.startService(service)
            }
        } catch (error: Exception) {
            Log.e(TAG, "FGS start failed", error)
        }
    }

    private fun scheduleBackupLaunch(context: Context) {
        try {
            val launch = Intent(context, PolicyRecoveryActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            val pi = PendingIntent.getActivity(
                context,
                42,
                launch,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            val alarm = context.getSystemService(AlarmManager::class.java)
            val trigger = SystemClock.elapsedRealtime() + 20_000L
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarm.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, trigger, pi)
            } else {
                @Suppress("DEPRECATION")
                alarm.setExact(AlarmManager.ELAPSED_REALTIME_WAKEUP, trigger, pi)
            }
            Log.i(TAG, "scheduled backup recovery alarm")
        } catch (error: Exception) {
            Log.e(TAG, "backup alarm failed", error)
        }
    }

    private fun launchRecoveryActivity(context: Context) {
        val launch = Intent(context, PolicyRecoveryActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try {
            val options = ActivityOptions.makeBasic()
            if (Build.VERSION.SDK_INT >= 34) {
                options.setPendingIntentBackgroundActivityStartMode(
                    ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED,
                )
            }
            val pending = PendingIntent.getActivity(
                context,
                0,
                launch,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                options.toBundle(),
            )
            pending.send()
        } catch (error: Exception) {
            Log.e(TAG, "PendingIntent recovery launch failed", error)
        }
    }

    companion object {
        private const val TAG = "MipBootRecovery"
    }
}
