package com.mip.dpc

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager

/**
 * Lab RESTRICT helper. Uses [DevicePolicyManager.setPackagesSuspended] only.
 * Never kills processes to fake suspend. Keeps dialer / messaging / this DPC free.
 */
object PackageSuspendHelper {
    private val ALWAYS_ALLOW = setOf(
        "com.mip.dpc",
        "com.android.dialer",
        "com.google.android.dialer",
        "com.samsung.android.dialer",
        "com.android.server.telecom",
        "com.android.phone",
        "com.android.mms",
        "com.google.android.apps.messaging",
        "com.samsung.android.messaging",
        "com.android.settings",
        "com.android.systemui",
        "com.google.android.setupwizard",
        "com.android.vending",
    )

    data class Result(
        val ok: Boolean,
        val resultCode: String,
        val platformState: String,
        val affectedCount: Int = 0,
    )

    fun suspendNonEssential(context: Context, dpm: DevicePolicyManager, admin: ComponentName): Result {
        if (!dpm.isDeviceOwnerApp(context.packageName)) {
            return Result(false, "NOT_DEVICE_OWNER", "UNSUPPORTED")
        }
        val targets = candidatePackages(context.packageManager)
        if (targets.isEmpty()) {
            // Restrict requested, but no non-system targets on this SKU — do not claim PACKAGES_SUSPENDED.
            return Result(true, "NO_PACKAGES_TO_SUSPEND", "NONE", 0)
        }
        return try {
            dpm.setPackagesSuspended(admin, targets, true)
            Result(true, "PACKAGES_SUSPENDED", "PACKAGES_SUSPENDED", targets.size)
        } catch (error: Exception) {
            Result(false, error.javaClass.simpleName, "UNSUPPORTED")
        }
    }

    fun unsuspendAll(context: Context, dpm: DevicePolicyManager, admin: ComponentName): Result {
        if (!dpm.isDeviceOwnerApp(context.packageName)) {
            return Result(false, "NOT_DEVICE_OWNER", "UNSUPPORTED")
        }
        val targets = candidatePackages(context.packageManager)
        return try {
            if (targets.isNotEmpty()) {
                dpm.setPackagesSuspended(admin, targets, false)
            }
            Result(true, "PACKAGES_UNSUSPENDED", "NONE", targets.size)
        } catch (error: Exception) {
            Result(false, error.javaClass.simpleName, "UNSUPPORTED")
        }
    }

    fun candidatePackages(pm: PackageManager): Array<String> {
        @Suppress("DEPRECATION")
        val flags = PackageManager.GET_META_DATA or PackageManager.MATCH_ALL
        val apps = try {
            pm.getInstalledApplications(flags)
        } catch (_: Exception) {
            pm.getInstalledApplications(PackageManager.GET_META_DATA)
        }
        return filterSuspendCandidates(
            apps.map { it.packageName to ((it.flags and ApplicationInfo.FLAG_SYSTEM) != 0) },
        )
    }

    /** Pure filter used by unit tests and [candidatePackages]. */
    fun filterSuspendCandidates(apps: List<Pair<String, Boolean>>): Array<String> {
        return apps
            .asSequence()
            .filter { (_, isSystem) -> !isSystem }
            .map { (name, _) -> name }
            .filter { it !in ALWAYS_ALLOW }
            .distinct()
            .toList()
            .toTypedArray()
    }
}
