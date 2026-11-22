package com.mip.dpc

import android.content.Intent
import android.net.Uri

/**
 * Lab emergency dial under LOCK. Prefer ACTION_DIAL so the user confirms.
 * Does not claim CALL_PHONE privilege.
 */
object EmergencyDial {
    private val DIALER_PACKAGES =
        arrayOf(
            "com.android.dialer",
            "com.google.android.dialer",
            "com.samsung.android.dialer",
            "com.android.server.telecom",
            "com.android.phone",
        )

    fun uriString(): String = "tel:112"

    fun intentAction(): String = Intent.ACTION_DIAL

    fun intent(): Intent =
        Intent(intentAction(), Uri.parse(uriString())).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

    /** Packages that must stay allowlisted so emergency dial works under Lock Task. */
    fun lockTaskPackages(dpcPackage: String): Array<String> =
        arrayOf(dpcPackage) + DIALER_PACKAGES
}
