package com.mip.dpc

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.content.ContextCompat

/**
 * Lab overdue REMINDER channel. Not soft-location, not FGS recovery channel.
 */
object ReminderNotifier {
    const val CHANNEL_ID = "mip_overdue_reminder"
    const val NOTIFICATION_ID = 4101

    fun show(context: Context) {
        ensureChannel(context)
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        val title = context.getString(R.string.reminder_title)
        val body = context.getString(R.string.reminder_body)
        val teal = ContextCompat.getColor(context, R.color.mip_teal)
        val notification =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Notification.Builder(context, CHANNEL_ID)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setSmallIcon(android.R.drawable.ic_dialog_info)
                    .setColor(teal)
                    .setOngoing(true)
                    .build()
            } else {
                @Suppress("DEPRECATION")
                Notification.Builder(context)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setSmallIcon(android.R.drawable.ic_dialog_info)
                    .setColor(teal)
                    .setOngoing(true)
                    .build()
            }
        manager.notify(NOTIFICATION_ID, notification)
    }

    fun cancel(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        manager.cancel(NOTIFICATION_ID)
    }

    private fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        val channel =
            NotificationChannel(
                CHANNEL_ID,
                context.getString(R.string.reminder_channel_name),
                NotificationManager.IMPORTANCE_DEFAULT,
            ).apply {
                description = context.getString(R.string.reminder_channel_desc)
            }
        manager.createNotificationChannel(channel)
    }
}
