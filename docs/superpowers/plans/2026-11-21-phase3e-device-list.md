# Phase 3e — Staff device list

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or executing-plans.

**Goal:** `GET /api/v1/devices` returns tenant-scoped devices with masked IMEI, policy, heartbeat — no cross-tenant leakage.

**Out of scope:** iOS MDM, payment-to-unlock, wipe.

---

- [x] Unit: list returns only tenant devices; masks IMEI
- [x] Controller route + optional platform/status filter
- [x] Merchant Web devices page (minimal)
- [x] CURRENT-PHASE / backlog
