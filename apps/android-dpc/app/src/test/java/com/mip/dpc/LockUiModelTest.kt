package com.mip.dpc

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LockUiModelTest {
    @Test
    fun reasonOnly_hidesAmountAndContract_showsDefaultStatus() {
        val model =
            LockUiModel.from(
                reason = "lab lock",
                statusLabel = null,
                statusLabelEn = null,
                amountDue = null,
                dueDate = null,
                contractRef = null,
            )
        assertTrue(model.showStatus)
        assertEquals("รอชำระเงิน", model.statusTh)
        assertEquals("Awaiting payment", model.statusEn)
        assertFalse(model.showAmount)
        assertFalse(model.showContract)
        assertEquals("lab lock", model.reasonDetail)
    }

    @Test
    fun blankReason_hidesReasonDetail() {
        val model =
            LockUiModel.from(
                reason = "  ",
                statusLabel = null,
                statusLabelEn = null,
                amountDue = null,
                dueDate = null,
                contractRef = null,
            )
        assertEquals(null, model.reasonDetail)
    }

    @Test
    fun amountAndDue_showAmountRow() {
        val model =
            LockUiModel.from(
                reason = null,
                statusLabel = "ค้างชำระ",
                statusLabelEn = "Overdue",
                amountDue = "1250.00",
                dueDate = "15 Nov 2026",
                contractRef = null,
            )
        assertTrue(model.showAmount)
        assertEquals("฿1,250.00", model.amountDisplay)
        assertEquals("15 Nov 2026", model.dueDisplay)
        assertFalse(model.showContract)
        assertEquals("ค้างชำระ", model.statusTh)
        assertEquals("Overdue", model.statusEn)
    }

    @Test
    fun amountWithoutDue_stillShowsAmount() {
        val model =
            LockUiModel.from(
                reason = null,
                statusLabel = null,
                statusLabelEn = null,
                amountDue = "100.50",
                dueDate = null,
                contractRef = null,
            )
        assertTrue(model.showAmount)
        assertEquals("฿100.50", model.amountDisplay)
        assertEquals(null, model.dueDisplay)
    }

    @Test
    fun blankAmount_hidesAmountEvenIfDuePresent() {
        val model =
            LockUiModel.from(
                reason = null,
                statusLabel = null,
                statusLabelEn = null,
                amountDue = "  ",
                dueDate = "15 Nov 2026",
                contractRef = null,
            )
        assertFalse(model.showAmount)
    }

    @Test
    fun contractRef_showsContractRow() {
        val model =
            LockUiModel.from(
                reason = null,
                statusLabel = null,
                statusLabelEn = null,
                amountDue = null,
                dueDate = null,
                contractRef = "MIP-2026-0042",
            )
        assertTrue(model.showContract)
        assertEquals("MIP-2026-0042", model.contractRef)
    }

    @Test
    fun invalidAmount_notShown() {
        val model =
            LockUiModel.from(
                reason = null,
                statusLabel = null,
                statusLabelEn = null,
                amountDue = "not-a-number",
                dueDate = null,
                contractRef = null,
            )
        assertFalse(model.showAmount)
    }
}
