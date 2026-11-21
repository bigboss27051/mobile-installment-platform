package com.mip.dpc

import android.Manifest
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import android.os.Build
import androidx.core.content.ContextCompat
import java.time.Instant

/**
 * Soft location for arrears-only heartbeats (D-061). Never prompts to enable GPS.
 */
object SoftLocationReader {
    fun ensureDoGrants(context: Context) {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager
            ?: return
        if (!dpm.isDeviceOwnerApp(context.packageName)) {
            return
        }
        val admin = ComponentName(context, MipDeviceAdminReceiver::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                dpm.setPermissionGrantState(
                    admin,
                    context.packageName,
                    Manifest.permission.ACCESS_COARSE_LOCATION,
                    DevicePolicyManager.PERMISSION_GRANT_STATE_GRANTED,
                )
                dpm.setPermissionGrantState(
                    admin,
                    context.packageName,
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    DevicePolicyManager.PERMISSION_GRANT_STATE_GRANTED,
                )
            } catch (_: Exception) {
                // OEM may refuse; heartbeat continues without location.
            }
        }
    }

    fun readIfAllowed(context: Context, desiredPresentation: String): SoftLocationSample? {
        if (desiredPresentation != "RESTRICT" && desiredPresentation != "LOCK") {
            return null
        }
        ensureDoGrants(context)
        val coarse = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_COARSE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED
        val fine = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED
        if (!coarse && !fine) {
            return null
        }
        val lm = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
            ?: return null
        val network = lastKnown(lm, LocationManager.NETWORK_PROVIDER)
        val gps = if (fine && lm.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
            lastKnown(lm, LocationManager.GPS_PROVIDER)
        } else {
            null
        }
        val pick = freshest(network, gps) ?: return null
        val source = when (pick.provider) {
            LocationManager.GPS_PROVIDER -> "GPS"
            LocationManager.NETWORK_PROVIDER -> "NETWORK"
            else -> "FUSED"
        }
        return SoftLocationSample(
            lat = pick.latitude,
            lng = pick.longitude,
            accuracyMeters = if (pick.hasAccuracy()) pick.accuracy else null,
            source = source,
            capturedAtIso = Instant.ofEpochMilli(pick.time).toString(),
        )
    }

    private fun lastKnown(lm: LocationManager, provider: String): Location? {
        return try {
            if (!lm.isProviderEnabled(provider) && provider != LocationManager.NETWORK_PROVIDER) {
                // Network may still return last-known when disabled on some OEMs; only skip GPS when off.
            }
            lm.getLastKnownLocation(provider)
        } catch (_: SecurityException) {
            null
        } catch (_: Exception) {
            null
        }
    }

    private fun freshest(a: Location?, b: Location?): Location? {
        if (a == null) return b
        if (b == null) return a
        return if (a.time >= b.time) a else b
    }
}
