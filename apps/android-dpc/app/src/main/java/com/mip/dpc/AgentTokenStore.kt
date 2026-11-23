package com.mip.dpc

import android.content.Context

class AgentTokenStore(context: Context) {
    private val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun save(agentToken: String, apiBase: String, deviceId: String) {
        prefs.edit()
            .putString(KEY_TOKEN, agentToken)
            .putString(KEY_API_BASE, apiBase)
            .putString(KEY_DEVICE_ID, deviceId)
            .apply()
    }

    fun load(): AgentSession? {
        val token = prefs.getString(KEY_TOKEN, null)?.trim().orEmpty()
        val apiBase = prefs.getString(KEY_API_BASE, null)?.trim().orEmpty()
        val deviceId = prefs.getString(KEY_DEVICE_ID, null)?.trim().orEmpty()
        if (token.isEmpty() || apiBase.isEmpty()) {
            return null
        }
        return AgentSession(token = token, apiBase = apiBase, deviceId = deviceId)
    }

    data class AgentSession(
        val token: String,
        val apiBase: String,
        val deviceId: String,
    )

    companion object {
        private const val PREFS = "mip_device_agent"
        private const val KEY_TOKEN = "agentToken"
        private const val KEY_API_BASE = "apiBase"
        private const val KEY_DEVICE_ID = "deviceId"
    }
}
