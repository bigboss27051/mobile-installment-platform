package com.mip.dpc

import android.app.Activity
import android.view.View
import android.widget.TextView

data class LabShellViews(
    val root: View,
    val title: TextView,
    val body: TextView,
)

object LabShell {
    fun inflate(activity: Activity, title: String): LabShellViews {
        val root = activity.layoutInflater.inflate(R.layout.activity_lab_shell, null)
        val titleView = root.findViewById<TextView>(R.id.lab_title)
        val bodyView = root.findViewById<TextView>(R.id.lab_body)
        titleView.text = title
        activity.setContentView(root)
        return LabShellViews(root, titleView, bodyView)
    }
}
