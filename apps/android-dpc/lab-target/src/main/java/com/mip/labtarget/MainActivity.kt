package com.mip.labtarget

import android.app.Activity
import android.os.Bundle
import android.widget.TextView

/** Harmless third-party stand-in so Phase 3b RESTRICT can suspend a real user package. */
class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(
            TextView(this).apply {
                text = "MIP lab suspend target"
                textSize = 18f
                setPadding(48, 48, 48, 48)
            },
        )
    }
}
