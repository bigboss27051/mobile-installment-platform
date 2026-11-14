# Device Provisioning & Enrollment — Design (documentation)

**Date:** 2026-11-14  
**Status:** Documentation approved for planning; **not** an implementation go-ahead  
**Slice:** R2 / DM0–DM5  
**Code changes:** none

## Context

R1 installment core is on `develop`. Phase 0 specified Android Device Owner + iOS MDM adapter as R2. Competitor reference videos (`docs/reference/mango_android.mp4`, `mango_ios.mp4`) show **retail provisioning UX**, not lock-for-debt internals.

This spec expands R2 into a **Device Provisioning & Enrollment Platform** while preserving NestJS modular monolith, REST, Flutter, Kotlin DPC *option*, and adapter-based iOS MDM.

## Decisions in this package

- Accepted: D-041–D-053 (AMAPI, iOS Model B + vendor MDM, mandatory enroll, QR+ZT, GMS/matrix SKUs).  
- Pending: MDM vendor SKU, lab matrix, legal copy (OPEN-DECISIONS.md).

## Design

Canonical write-ups:

- Lifecycle and wizard: `docs/device-management/DEVICE-PROVISIONING-ENROLLMENT.md`  
- Android / iOS: `ANDROID-ENROLLMENT.md`, `IOS-ENROLLMENT.md`  
- Tenancy: `TENANT-OWNERSHIP-MODELS.md`  
- API: `docs/api/DEVICE-ENROLLMENT-API.md`  
- Schema: `docs/database/DATABASE-DESIGN.md` (enrollment entities)  
- Master index: `docs/project-management/MASTER-EXECUTION-PLAN.md`

## Out of scope

Application code, Prisma migrations, Play Protect disable SOP, copying competitor skip-Apple-ID coaching, claiming DO/MDM feasibility, overdue-lock inference from videos.

## Next

DM0 feasibility report + ADRs. Do not implement DM1 until DM0 recommendations are recorded.
