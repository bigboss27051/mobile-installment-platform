package com.mip.dpc

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.widget.LinearLayout
import android.widget.TextView
import kotlin.concurrent.thread

/**
 * Fetches authorized policy (server, else local cache) and re-applies it once after boot.
 */
class PolicyRecoveryActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val status = TextView(this).apply {
            text = "Reboot recovery…"
            textSize = 16f
            setPadding(48, 48, 48, 48)
        }
        setContentView(
            LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                addView(status)
            },
        )

        thread {
            val session = AgentTokenStore(this).load()
            val cache = PolicyCacheStore(this)
            val remote = session?.let { PolicyClient.fetch(it) }
            val desired = remote?.desiredPresentation ?: cache.load().desiredPresentation
            if (remote != null) {
                cache.save(remote.desiredPresentation, remote.platformState, remote.policyVersion)
            }
            val result = PolicyRecovery.reapply(this, desired)
            runOnUiThread {
                status.text = "Recovery: desired=$desired result=$result"
            }
            // Resume poller only when not entering Lock Task — otherwise it covers Mango Lock.
            if (desired != "LOCK") {
                startActivity(
                    Intent(this, CommandPollActivity::class.java)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                )
            }
            finish()
        }
    }
}
