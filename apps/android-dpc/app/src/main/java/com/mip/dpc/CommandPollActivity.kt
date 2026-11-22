package com.mip.dpc

import android.app.Activity
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.TextView
import kotlin.concurrent.thread

/**
 * Lab poller for queued lock-task commands. UI tick; work runs via [CommandExecutor].
 */
class CommandPollActivity : Activity() {
    private val handler = Handler(Looper.getMainLooper())
    private lateinit var statusView: TextView
    private val tick = object : Runnable {
        override fun run() {
            pollOnce()
            handler.postDelayed(this, POLL_MS)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val shell = LabShell.inflate(this, "Command poller")
        statusView = shell.body
        statusView.text = "Waiting…"
        handler.post(tick)
    }

    override fun onDestroy() {
        handler.removeCallbacks(tick)
        super.onDestroy()
    }

    private fun pollOnce() {
        thread {
            val result = CommandExecutor.runOnce(this)
            runOnUiThread {
                statusView.text = if (result.noSession) {
                    "No agent token. Re-check-in first."
                } else {
                    "HB=${if (result.heartbeatOk) "ok" else "fail"}; " +
                        "loc=${result.locationSource ?: "none"}; " +
                        "polled ${result.commandCount} command(s)."
                }
            }
        }
    }

    companion object {
        private const val POLL_MS = 5_000L
    }
}
