package com.mip.dpc

import android.content.Context

class PolicyCacheStore(context: Context) {
    private val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun save(desired: String, platform: String, policyVersion: Int) {
        prefs.edit()
            .putString(KEY_DESIRED, desired)
            .putString(KEY_PLATFORM, platform)
            .putInt(KEY_VERSION, policyVersion)
            .apply()
    }

    fun load(): CachedPolicy {
        return CachedPolicy(
            desiredPresentation = prefs.getString(KEY_DESIRED, "NONE") ?: "NONE",
            platformState = prefs.getString(KEY_PLATFORM, "NONE") ?: "NONE",
            policyVersion = prefs.getInt(KEY_VERSION, 0),
        )
    }

    data class CachedPolicy(
        val desiredPresentation: String,
        val platformState: String,
        val policyVersion: Int,
    )

    companion object {
        private const val PREFS = "mip_policy_cache"
        private const val KEY_DESIRED = "desiredPresentation"
        private const val KEY_PLATFORM = "platformState"
        private const val KEY_VERSION = "policyVersion"
    }
}
