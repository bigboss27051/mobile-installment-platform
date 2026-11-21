package com.mip.dpc

import android.app.Activity
import android.app.admin.DevicePolicyManager
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.LinearLayout
import android.widget.TextView
import kotlin.concurrent.thread

/**
 * Lab poller for queued lock-task commands. Not a production heartbeat/FCM path.
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
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 48, 48, 48)
        }
        statusView = TextView(this).apply {
            text = "Command poller (lab). Waiting…"
            textSize = 16f
        }
        root.addView(statusView)
        setContentView(root)
        handler.post(tick)
    }

    override fun onDestroy() {
        handler.removeCallbacks(tick)
        super.onDestroy()
    }

    private fun pollOnce() {
        val session = AgentTokenStore(this).load()
        if (session == null) {
            statusView.text = "No agent token. Re-check-in first."
            return
        }
        thread {
            val commands = CommandClient.poll(session)
            runOnUiThread {
                statusView.text = "Polled ${commands.size} command(s)."
            }
            for (command in commands) {
                handle(session, command)
            }
        }
    }

    private fun handle(session: AgentTokenStore.AgentSession, command: PendingCommand) {
        val dpm = getSystemService(DEVICE_POLICY_SERVICE) as DevicePolicyManager
        when (command.type) {
            "START_LOCK_TASK" -> {
                if (!dpm.isDeviceOwnerApp(packageName)) {
                    CommandClient.ack(
                        session,
                        command.id,
                        status = "UNSUPPORTED",
                        platformState = "UNSUPPORTED",
                        resultCode = "NOT_DEVICE_OWNER",
                    )
                    return
                }
                runOnUiThread {
                    startActivity(
                        Intent(this, MangoLockActivity::class.java)
                            .putExtra(MangoLockActivity.EXTRA_REASON, command.reason),
                    )
                }
                CommandClient.ack(
                    session,
                    command.id,
                    status = "ACKED_SUCCESS",
                    platformState = "LOCK_TASK",
                    resultCode = "LOCK_TASK_ACTIVE",
                )
            }
            "STOP_LOCK_TASK" -> {
                runOnUiThread {
                    try {
                        stopLockTask()
                    } catch (_: Exception) {
                        // already stopped
                    }
                }
                CommandClient.ack(
                    session,
                    command.id,
                    status = "ACKED_SUCCESS",
                    platformState = "NONE",
                    resultCode = "LOCK_TASK_STOPPED",
                )
            }
            else -> {
                CommandClient.ack(
                    session,
                    command.id,
                    status = "UNSUPPORTED",
                    platformState = "UNSUPPORTED",
                    resultCode = "UNKNOWN_COMMAND",
                )
            }
        }
    }

    companion object {
        private const val POLL_MS = 5_000L
    }
}
