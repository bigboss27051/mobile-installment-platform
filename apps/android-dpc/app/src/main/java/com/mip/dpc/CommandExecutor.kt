package com.mip.dpc

import android.app.Activity
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent

data class PollResult(
    val heartbeatOk: Boolean,
    val commandCount: Int,
    val locationSource: String?,
    val noSession: Boolean = false,
)

object CommandExecutor {
    fun runOnce(context: Context): PollResult {
        val app = context.applicationContext
        val session = AgentTokenStore(app).load()
        if (session == null) {
            return PollResult(
                heartbeatOk = false,
                commandCount = 0,
                locationSource = null,
                noSession = true,
            )
        }
        val cache = PolicyCacheStore(app)
        val remote = PolicyClient.fetch(session)
        if (remote != null) {
            cache.save(
                remote.desiredPresentation,
                remote.platformState,
                remote.policyVersion,
            )
        }
        val policy = cache.load()
        val location = SoftLocationReader.readIfAllowed(app, policy.desiredPresentation)
        val hbOk = HeartbeatClient.post(
            session,
            policyVersion = policy.policyVersion,
            location = location,
        )
        val commands = CommandClient.poll(session)
        for (command in commands) {
            handle(app, session, command)
        }
        return PollResult(
            heartbeatOk = hbOk,
            commandCount = commands.size,
            locationSource = location?.source,
        )
    }

    private fun handle(
        context: Context,
        session: AgentTokenStore.AgentSession,
        command: PendingCommand,
    ) {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, MipDeviceAdminReceiver::class.java)
        when (command.type) {
            "START_LOCK_TASK" -> {
                if (!dpm.isDeviceOwnerApp(context.packageName)) {
                    CommandClient.ack(
                        session,
                        command.id,
                        status = "UNSUPPORTED",
                        platformState = "UNSUPPORTED",
                        resultCode = "NOT_DEVICE_OWNER",
                    )
                    return
                }
                context.startActivity(
                    Intent(context, MangoLockActivity::class.java)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        .putExtra(MangoLockActivity.EXTRA_REASON, command.reason),
                )
                LockHomeHelper.enableLockHome(context, dpm, admin)
                CommandClient.ack(
                    session,
                    command.id,
                    status = "ACKED_SUCCESS",
                    platformState = "LOCK_TASK",
                    resultCode = "LOCK_TASK_ACTIVE",
                )
                PolicyCacheStore(context).save("LOCK", "LOCK_TASK", bumpVersion(context))
            }
            "STOP_LOCK_TASK" -> {
                LockHomeHelper.clearLockHome(context, dpm, admin)
                if (context is Activity) {
                    try {
                        context.stopLockTask()
                    } catch (_: Exception) {
                        // already stopped
                    }
                } else {
                    context.startActivity(
                        Intent(context, MangoLockActivity::class.java)
                            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            .putExtra(MangoLockActivity.EXTRA_CLEAR_LOCK, true),
                    )
                }
                CommandClient.ack(
                    session,
                    command.id,
                    status = "ACKED_SUCCESS",
                    platformState = "NONE",
                    resultCode = "LOCK_TASK_STOPPED",
                )
                PolicyCacheStore(context).save("NONE", "NONE", bumpVersion(context))
            }
            "START_PACKAGE_SUSPEND" -> {
                val result = PackageSuspendHelper.suspendNonEssential(context, dpm, admin)
                CommandClient.ack(
                    session,
                    command.id,
                    status = if (result.ok) "ACKED_SUCCESS" else "UNSUPPORTED",
                    platformState = result.platformState,
                    resultCode = "${result.resultCode}:${result.affectedCount}",
                )
                if (result.ok) {
                    PolicyCacheStore(context).save("RESTRICT", result.platformState, bumpVersion(context))
                }
            }
            "STOP_PACKAGE_SUSPEND" -> {
                val result = PackageSuspendHelper.unsuspendAll(context, dpm, admin)
                CommandClient.ack(
                    session,
                    command.id,
                    status = if (result.ok) "ACKED_SUCCESS" else "UNSUPPORTED",
                    platformState = result.platformState,
                    resultCode = "${result.resultCode}:${result.affectedCount}",
                )
                if (result.ok) {
                    PolicyCacheStore(context).save("NONE", result.platformState, bumpVersion(context))
                }
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

    private fun bumpVersion(context: Context): Int {
        val store = PolicyCacheStore(context)
        return store.load().policyVersion + 1
    }
}