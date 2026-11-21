package com.mip.dpc

import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

object HeartbeatClient {
    fun post(
        session: AgentTokenStore.AgentSession,
        policyVersion: Int,
        connectivity: String = "UNKNOWN",
        batteryPercent: Int? = null,
    ): Boolean {
        val url = session.apiBase.trimEnd('/') + "/devices/agent/heartbeat"
        val connection = URL(url).openConnection() as HttpURLConnection
        return try {
            connection.connectTimeout = 15_000
            connection.readTimeout = 15_000
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("X-Device-Agent-Token", session.token)
            connection.doOutput = true
            val payload = JSONObject()
                .put("connectivity", connectivity)
                .put("policyVersion", policyVersion)
            if (batteryPercent != null) {
                payload.put("batteryPercent", batteryPercent)
            }
            OutputStreamWriter(connection.outputStream).use { it.write(payload.toString()) }
            connection.responseCode in 200..299
        } catch (_: Exception) {
            false
        } finally {
            connection.disconnect()
        }
    }
}
