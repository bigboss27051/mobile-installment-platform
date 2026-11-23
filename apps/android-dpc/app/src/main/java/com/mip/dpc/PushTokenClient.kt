package com.mip.dpc

import android.content.Context
import android.util.Log
import com.google.firebase.messaging.FirebaseMessaging
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

object PushTokenClient {
    private const val TAG = "MipPushToken"

    fun register(context: Context, token: String) {
        val session = AgentTokenStore(context.applicationContext).load()
        if (session == null || token.isBlank()) {
            return
        }
        val url = session.apiBase.trimEnd('/') + "/devices/agent/push-token"
        val connection = URL(url).openConnection() as HttpURLConnection
        try {
            connection.connectTimeout = 15_000
            connection.readTimeout = 15_000
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("X-Device-Agent-Token", session.token)
            connection.doOutput = true
            val payload = JSONObject().put("token", token.trim()).toString()
            OutputStreamWriter(connection.outputStream).use { it.write(payload) }
            val code = connection.responseCode
            if (code !in 200..299) {
                Log.w(TAG, "push-token HTTP $code url=$url")
            }
        } catch (e: Exception) {
            Log.w(TAG, "push-token failed: ${e.message}")
        } finally {
            connection.disconnect()
        }
    }

    fun registerIfPossible(context: Context) {
        FirebaseMessaging.getInstance().token
            .addOnSuccessListener { register(context.applicationContext, it) }
            .addOnFailureListener { e ->
                Log.w(TAG, "FCM token fetch failed: ${e.message}")
            }
    }
}