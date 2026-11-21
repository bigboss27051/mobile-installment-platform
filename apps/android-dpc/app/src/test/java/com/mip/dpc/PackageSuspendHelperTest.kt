package com.mip.dpc

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PackageSuspendHelperTest {
    @Test
    fun includesLabTargetAndSkipsSystemAndAllowlist() {
        val result = PackageSuspendHelper.filterSuspendCandidates(
            listOf(
                "com.android.systemui" to true,
                "com.mip.dpc" to false,
                "com.mip.labtarget" to false,
                "com.android.dialer" to false,
                "com.example.shop" to false,
            ),
        )
        assertArrayEquals(arrayOf("com.mip.labtarget", "com.example.shop"), result)
    }

    @Test
    fun emptyWhenOnlySystemAndAllowlisted() {
        val result = PackageSuspendHelper.filterSuspendCandidates(
            listOf(
                "com.mip.dpc" to false,
                "com.android.settings" to false,
            ),
        )
        assertTrue(result.isEmpty())
    }
}
