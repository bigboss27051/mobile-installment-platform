package com.mip.dpc

/**
 * Settings → Factory reset is blocked only while this app is Device Owner.
 * A recovery-mode wipe still removes Device Owner. Zero-touch re-provision
 * after that wipe is a separate path and is not implemented here.
 */
object FactoryResetPolicy {
    fun shouldBlock(isDeviceOwner: Boolean): Boolean = isDeviceOwner
}
