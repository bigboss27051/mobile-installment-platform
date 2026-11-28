package com.mip.dpc

import android.app.Application
import android.content.Intent
import android.util.Log

/**
 * If boot recovery was requested but the activity/service was blocked, run once on next process start.
 */
class MipDpcApp : Application() {
    override fun onCreate() {
        super.onCreate()
        FactoryResetGuard.apply(this)
        val prefs = getSharedPreferences(PREFS, MODE_PRIVATE)
        if (!prefs.getBoolean(KEY_PENDING, false)) {
            return
        }
        prefs.edit().putBoolean(KEY_PENDING, false).apply()
        Log.i(TAG, "pending reboot recovery — starting service")
        try {
            startForegroundService(Intent(this, PolicyRecoveryService::class.java))
        } catch (error: Exception) {
            Log.e(TAG, "pending recovery start failed", error)
            startActivity(
                Intent(this, PolicyRecoveryActivity::class.java)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            )
        }
    }

    companion object {
        private const val TAG = "MipDpcApp"
        const val PREFS = "mip_boot_recovery"
        const val KEY_PENDING = "pendingRecovery"

        fun markPending(appContext: android.content.Context) {
            appContext.applicationContext
                .getSharedPreferences(PREFS, MODE_PRIVATE)
                .edit()
                .putBoolean(KEY_PENDING, true)
                .apply()
        }
    }
}
