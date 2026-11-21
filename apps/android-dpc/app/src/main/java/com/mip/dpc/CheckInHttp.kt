package com.mip.dpc

import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

object CheckInHttp {
    fun post(call: CheckInCall): String {
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
            "$code $response"
        } catch (error: Exception) {
            error.message ?: "check-in failed"
        } finally {
            connection.disconnect()
        }
    }
}
