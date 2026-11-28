package com.mip.dpc

/**
 * Settings → Factory reset is blocked only while this app is Device Owner.
 * A recovery-mode wipe still removes Device Owner. Zero-touch re-provision
 * after that wipe is a separate path and is not implemented here.
 */
object FactoryResetPolicy {
    fun shouldBlock(isDeviceOwner: Boolean): Boolean = isDeviceOwner

    /** Settings cannot add, remove, or switch the Google account while Device Owner. */
    fun shouldLockAccounts(isDeviceOwner: Boolean): Boolean = isDeviceOwner

    /** APKs from outside Play Store are blocked. Play Store installs stay allowed. */
    fun shouldBlockSideload(isDeviceOwner: Boolean): Boolean = isDeviceOwner

    /**
     * Customer builds hide developer options. The lab build used by this team
     * keeps USB debugging so a tablet under development stays reachable.
     */
    fun shouldBlockDeveloperMode(isDeviceOwner: Boolean, allowDeveloperMode: Boolean): Boolean =
        isDeviceOwner && !allowDeveloperMode
}
