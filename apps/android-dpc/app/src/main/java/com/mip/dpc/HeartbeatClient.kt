package com.mip.dpc

import android.util.Log
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

object HeartbeatClient {
    private const val TAG = "MipHeartbeat"

    fun post(
        session: AgentTokenStore.AgentSession,
        policyVersion: Int,
        connectivity: String = "UNKNOWN",
        batteryPercent: Int? = null,
        location: SoftLocationSample? = null,
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
            if (location != null) {
                val loc = JSONObject()
                    .put("lat", location.lat)
                    .put("lng", location.lng)
                    .put("source", location.source)
                    .put("capturedAt", location.capturedAtIso)
                if (location.accuracyMeters != null) {
                    loc.put("accuracyMeters", location.accuracyMeters.toInt())
                }
                payload.put("location", loc)
            }
            OutputStreamWriter(connection.outputStream).use { it.write(payload.toString()) }
            val code = connection.responseCode
            val ok = code in 200..299
            if (!ok) {
                Log.w(TAG, "heartbeat HTTP $code url=$url")
            }
            ok
        } catch (e: Exception) {
            Log.w(TAG, "heartbeat failed url=$url: ${e.javaClass.simpleName}: ${e.message}", e)
            false
        } finally {
            connection.disconnect()
        }
    }
}
