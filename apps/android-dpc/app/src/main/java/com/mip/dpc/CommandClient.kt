package com.mip.dpc

import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

data class PendingCommand(
    val id: String,
    val type: String,
    val reason: String,
)

object CommandClient {
    fun poll(session: AgentTokenStore.AgentSession): List<PendingCommand> {
        val url = session.apiBase.trimEnd('/') + "/devices/agent/commands"
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
                return emptyList()
            }
            val data = JSONObject(body).optJSONObject("data") ?: return emptyList()
            val commands = data.optJSONArray("commands") ?: JSONArray()
            buildList {
                for (i in 0 until commands.length()) {
                    val item = commands.getJSONObject(i)
                    add(
                        PendingCommand(
                            id = item.getString("id"),
                            type = item.getString("type"),
                            reason = item.optString("reason"),
                        ),
                    )
                }
            }
        } catch (_: Exception) {
            emptyList()
        } finally {
            connection.disconnect()
        }
    }

    fun ack(
        session: AgentTokenStore.AgentSession,
        commandId: String,
        status: String,
        platformState: String,
        resultCode: String,
    ): Boolean {
        val url = session.apiBase.trimEnd('/') + "/devices/agent/commands/$commandId/ack"
        val connection = URL(url).openConnection() as HttpURLConnection
        return try {
            connection.connectTimeout = 15_000
            connection.readTimeout = 15_000
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("X-Device-Agent-Token", session.token)
            connection.doOutput = true
            val payload = JSONObject()
                .put("status", status)
                .put("platformState", platformState)
                .put("resultCode", resultCode)
                .toString()
            OutputStreamWriter(connection.outputStream).use { it.write(payload) }
            connection.responseCode in 200..299
        } catch (_: Exception) {
            false
        } finally {
            connection.disconnect()
        }
    }
}
