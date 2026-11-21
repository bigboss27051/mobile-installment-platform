package com.mip.dpc

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class AgentPolicy(
    val desiredPresentation: String,
    val platformState: String,
    val policyVersion: Int,
)

object PolicyClient {
    fun fetch(session: AgentTokenStore.AgentSession): AgentPolicy? {
        val url = session.apiBase.trimEnd('/') + "/devices/agent/policy"
        val connection = URL(url).openConnection() as HttpURLConnection
        return try {
            connection.connectTimeout = 15_000
            connection.readTimeout = 15_000
            connection.requestMethod = "GET"
            connection.setRequestProperty("X-Device-Agent-Token", session.token)
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val body = stream?.bufferedReader()?.readText().orEmpty()
            if (code !in 200..299) {
                return null
            }
            val data = JSONObject(body).optJSONObject("data") ?: return null
            AgentPolicy(
                desiredPresentation = data.optString("desiredPresentation", "NONE"),
                platformState = data.optString("platformState", "NONE"),
                policyVersion = data.optInt("policyVersion", 0),
            )
        } catch (_: Exception) {
            null
        } finally {
            connection.disconnect()
        }
    }
}
