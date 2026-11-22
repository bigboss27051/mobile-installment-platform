package com.mip.dpc

import java.math.BigDecimal
import java.math.RoundingMode
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale

data class LockUiModel(
    val reasonDetail: String?,
    val showStatus: Boolean,
    val statusTh: String,
    val statusEn: String,
    val showAmount: Boolean,
    val amountDisplay: String?,
    val dueDisplay: String?,
    val showContract: Boolean,
    val contractRef: String?,
) {
    companion object {
        fun from(
            reason: String?,
            statusLabel: String?,
            statusLabelEn: String?,
            amountDue: String?,
            dueDate: String?,
            contractRef: String?,
        ): LockUiModel {
            val reasonDetail = reason?.trim()?.takeIf { it.isNotEmpty() }
            val statusTh = statusLabel?.trim()?.takeIf { it.isNotEmpty() } ?: "รอชำระเงิน"
            val statusEn = statusLabelEn?.trim()?.takeIf { it.isNotEmpty() } ?: "Awaiting payment"
            val amountDisplay = formatAmount(amountDue)
            val due = dueDate?.trim()?.takeIf { it.isNotEmpty() }
            val contract = contractRef?.trim()?.takeIf { it.isNotEmpty() }
            return LockUiModel(
                reasonDetail = reasonDetail,
                showStatus = true,
                statusTh = statusTh,
                statusEn = statusEn,
                showAmount = amountDisplay != null,
                amountDisplay = amountDisplay,
                dueDisplay = if (amountDisplay != null) due else null,
                showContract = contract != null,
                contractRef = contract,
            )
        }

        private fun formatAmount(raw: String?): String? {
            val trimmed = raw?.trim()?.takeIf { it.isNotEmpty() } ?: return null
            return try {
                val value = BigDecimal(trimmed).setScale(2, RoundingMode.HALF_UP)
                val symbols = DecimalFormatSymbols(Locale.US)
                val df = DecimalFormat("#,##0.00", symbols)
                "฿${df.format(value)}"
            } catch (_: Exception) {
                null
            }
        }
    }
}
