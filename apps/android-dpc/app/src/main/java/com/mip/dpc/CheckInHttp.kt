package com.mip.dpc

import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

data class CheckInHttpResult(
    val message: String,
    val agentToken: String?,
    val deviceId: String?,
    val apiBase: String?,
)

object CheckInHttp {
    fun post(call: CheckInCall): CheckInHttpResult {
        val connection = URL(call.url).openConnection() as HttpURLConnection
        return try {
            connection.connectTimeout = 15_000
            connection.readTimeout = 15_000
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("X-Enrollment-Token", call.enrollmentToken)
            connection.doOutput = true
            OutputStreamWriter(connection.outputStream).use { it.write(call.body) }
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val response = stream?.bufferedReader()?.readText().orEmpty()
            val parsed = parseSuccess(code, response, call.url)
            CheckInHttpResult(
                message = "$code $response",
                agentToken = parsed?.agentToken,
                deviceId = parsed?.deviceId,
                apiBase = parsed?.apiBase,
            )
        } catch (error: Exception) {
            CheckInHttpResult(
                message = error.message ?: "check-in failed",
                agentToken = null,
                deviceId = null,
                apiBase = null,
            )
        } finally {
            connection.disconnect()
        }
    }

    private data class Parsed(val agentToken: String?, val deviceId: String?, val apiBase: String?)

    private fun parseSuccess(code: Int, response: String, checkInUrl: String): Parsed? {
        if (code !in 200..299) {
            return null
        }
        return try {
            val data = JSONObject(response).optJSONObject("data")
            val agentToken = data?.optString("agentToken")?.takeIf { it.isNotBlank() }
            val deviceId = data?.optString("deviceId")?.takeIf { it.isNotBlank() }
            val apiBase = AgentApiBase.fromCheckInUrl(checkInUrl)
            Parsed(agentToken, deviceId, apiBase)
        } catch (_: Exception) {
            null
        }
    }
}
