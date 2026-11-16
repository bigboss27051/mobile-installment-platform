package com.mip.dpc

data class DeviceOwnerStatus(
    val packageName: String,
    val isDeviceOwner: Boolean,
) {
    val errorCode: String?
        get() = if (isDeviceOwner) null else "NOT_DEVICE_OWNER"
}
