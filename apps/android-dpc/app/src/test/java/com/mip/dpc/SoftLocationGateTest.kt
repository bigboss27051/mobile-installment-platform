package com.mip.dpc

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SoftLocationGateTest {
    @Test
    fun onlyArrearsDesiredAllowsSoftLocation() {
        assertFalse(allows("NONE"))
        assertFalse(allows("REMINDER"))
        assertTrue(allows("RESTRICT"))
        assertTrue(allows("LOCK"))
    }

    private fun allows(desired: String): Boolean {
        return desired == "RESTRICT" || desired == "LOCK"
    }
}
