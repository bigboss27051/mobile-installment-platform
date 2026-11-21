package com.mip.dpc

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Starts policy recovery after reboot. Lab-only path; not FCM.
 */
class BootCompletedReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != Intent.ACTION_BOOT_COMPLETED &&
            intent?.action != Intent.ACTION_LOCKED_BOOT_COMPLETED
        ) {
            return
        }
        context.startActivity(
            Intent(context, PolicyRecoveryActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
        )
    }
}
