package com.mip.dpc

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class MipFirebaseMessagingService : FirebaseMessagingService() {
    override fun onMessageReceived(message: RemoteMessage) {
        if (message.data["type"] == "POLL_NOW") {
            CommandPollScheduler.enqueueNow(applicationContext)
        }
    }

    override fun onNewToken(token: String) {
        PushTokenClient.register(applicationContext, token)
    }
}