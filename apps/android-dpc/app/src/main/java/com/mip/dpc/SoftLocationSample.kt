package com.mip.dpc

data class SoftLocationSample(
    val lat: Double,
    val lng: Double,
    val accuracyMeters: Float?,
    val source: String,
    val capturedAtIso: String,
)
