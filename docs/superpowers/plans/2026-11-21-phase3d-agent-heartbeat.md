# Phase 3d — Agent heartbeat + live dashboard policy

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the command-loop gap before payment-to-unlock: agent posts heartbeat, staff dashboard reads real policy + last heartbeat, DPC posts heartbeat over the same HTTPS-derived `apiBase`.

**Architecture:** `Device.lastHeartbeatAt` updated by `POST /devices/agent/heartbeat` (agent token). Staff `GET /devices/:id` returns `policyState` + `lastHeartbeatAt`; `GET /devices/:id/heartbeat` returns freshness. No location. No payment unlock. No iOS.

**Tech Stack:** NestJS, Prisma, Android DPC Kotlin, Merchant Web React (read-only status).

---

## Tasks

- [x] Schema: `devices.last_heartbeat_at`
- [x] Unit: `heartbeatForAgent` updates timestamp; rejects bad token
- [x] Unit: `getDashboard` returns policy + heartbeat (not hardcoded NONE)
- [x] Unit: `getHeartbeat` 410 when never seen
- [x] Wire controller routes + DTO
- [x] DPC `HeartbeatClient` + call from command poller
- [x] Agent `apiBase` HTTPS preference helper (lab cleartext allowed)
- [x] Merchant Web: show device dashboard fields after device id known
- [x] CURRENT-PHASE / backlog `R2-P3-004`
