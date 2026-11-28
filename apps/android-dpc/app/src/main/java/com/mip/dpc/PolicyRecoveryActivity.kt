package com.mip.dpc

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import kotlin.concurrent.thread

/**
 * Fetches authorized policy (server, else local cache) and re-applies it once after boot.
 */
class PolicyRecoveryActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val shell = LabShell.inflate(this, "Reboot recovery")
        shell.body.text = "Reboot recovery…"

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
                shell.body.text = "Recovery: desired=$desired result=$result"
            }
            // Resume poller only when not entering Lock Task — otherwise it covers mp_pay lock.
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
