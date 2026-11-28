package com.mip.dpc

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import java.util.concurrent.Executors

class MipFirebaseMessagingService : FirebaseMessagingService() {
    override fun onMessageReceived(message: RemoteMessage) {
        if (message.data["type"] == "POLL_NOW") {
            CommandPollScheduler.enqueueNow(applicationContext)
        }
    }

    override fun onNewToken(token: String) {
        // FCM may call this on a binder thread — never block it with HTTP.
        val app = applicationContext
        io.execute { PushTokenClient.register(app, token) }
    }

    companion object {
        private val io = Executors.newSingleThreadExecutor { r ->
            Thread(r, "mip-fcm-token").apply { isDaemon = true }
        }
    }
}
