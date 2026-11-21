# Phase 4b Overdue Auto-Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Staff can `POST /devices/policy/evaluate-overdue` so the tenant’s ACTIVE Android bindings with past-due unpaid schedule items get `START_LOCK_TASK` enqueued (desired `LOCK`), without device-local overdue clocks or unsigned webhooks.

**Architecture:** Pure helper `isScheduleOverdue` + `OverdueLockOrchestrator.evaluateTenant` mirrors Phase 4a. Persistence adds `device_policy_evaluation_runs` for HTTP Idempotency-Key replay. Lock enqueue reuses `DeviceCommandsService.enqueue`. iOS and REMINDER/RESTRICT ladder are out of scope.

**Tech Stack:** NestJS, Prisma, Jest, existing `device_commands` / `device_policy_states`.

**Spec:** [docs/superpowers/specs/2026-11-21-phase4b-overdue-auto-lock-design.md](../specs/2026-11-21-phase4b-overdue-auto-lock-design.md)

---

## File map

| File | Responsibility |
|------|----------------|
| `backend/src/devices/overdue-lock-policy.ts` | `bangkokTodayYmd`, `isScheduleOverdue`, `overdueLockMarker` |
| `backend/src/devices/overdue-lock.orchestrator.ts` | Tenant scan + enqueue / skip |
| `backend/src/devices/dto/evaluate-overdue.dto.ts` | `{ reason }` |
| `backend/src/devices/device-lifecycle.controller.ts` | `POST policy/evaluate-overdue` (before `:id` routes) |
| `backend/prisma/schema.prisma` + migration | `DevicePolicyEvaluationRun` |
| `backend/src/devices/devices.module.ts` | Register orchestrator |
| Docs / backlog | CURRENT-PHASE, TASK-BACKLOG `R2-P4-002`, D-063, API note |

---

### Task 1: Overdue policy helpers (TDD)

**Files:**
- Create: `backend/src/devices/overdue-lock-policy.ts`
- Create: `backend/src/devices/overdue-lock-policy.spec.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { ScheduleItemStatus } from '@prisma/client';
import {
  bangkokTodayYmd,
  isScheduleOverdue,
  overdueLockMarker,
} from './overdue-lock-policy';

describe('overdue-lock-policy', () => {
  it('marks unpaid item with dueDate before Bangkok today as overdue', () => {
    const now = new Date('2026-11-21T10:00:00+07:00');
    expect(
      isScheduleOverdue(
        [{ dueDate: new Date('2026-11-20'), status: ScheduleItemStatus.PENDING }],
        now,
      ),
    ).toBe(true);
  });

  it('does not mark unpaid item due today (Bangkok) as overdue', () => {
    const now = new Date('2026-11-21T23:30:00+07:00');
    expect(
      isScheduleOverdue(
        [{ dueDate: new Date('2026-11-21'), status: ScheduleItemStatus.PENDING }],
        now,
      ),
    ).toBe(false);
  });

  it('ignores PAID items even if dueDate is past', () => {
    const now = new Date('2026-11-21T10:00:00+07:00');
    expect(
      isScheduleOverdue(
        [{ dueDate: new Date('2026-11-01'), status: ScheduleItemStatus.PAID }],
        now,
      ),
    ).toBe(false);
  });

  it('builds day marker from Bangkok calendar date', () => {
    expect(overdueLockMarker(new Date('2026-11-21T01:00:00+07:00'))).toBe(
      'overdue-lock:2026-11-21',
    );
    expect(bangkokTodayYmd(new Date('2026-11-20T23:30:00+07:00'))).toBe(
      '2026-11-20',
    );
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL (module missing)**

```bash
cd backend && npx jest src/devices/overdue-lock-policy.spec.ts --no-coverage
```

- [ ] **Step 3: Implement helpers**

```typescript
import { ScheduleItemStatus } from '@prisma/client';

const BANGKOK = 'Asia/Bangkok';

export function bangkokTodayYmd(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BANGKOK,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function overdueLockMarker(now: Date = new Date()): string {
  return `overdue-lock:${bangkokTodayYmd(now)}`;
}

export type ScheduleDueRow = {
  dueDate: Date;
  status: ScheduleItemStatus;
};

/** Unpaid (not PAID) with dueDate calendar day strictly before Bangkok today. */
export function isScheduleOverdue(
  items: ScheduleDueRow[],
  now: Date = new Date(),
): boolean {
  const today = bangkokTodayYmd(now);
  return items.some((item) => {
    if (item.status === ScheduleItemStatus.PAID) return false;
    const dueYmd = bangkokTodayYmd(
      new Date(
        Date.UTC(
          item.dueDate.getUTCFullYear(),
          item.dueDate.getUTCMonth(),
          item.dueDate.getUTCDate(),
        ),
      ),
    );
    // dueDate is @db.Date — compare as YYYY-MM-DD strings in Bangkok calendar
    const dueStr = item.dueDate.toISOString().slice(0, 10);
    return dueStr < today;
  });
}
```

Note: Prefer comparing `item.dueDate` as `YYYY-MM-DD` via `toISOString().slice(0, 10)` (Prisma `@db.Date` UTC midnight) against `bangkokTodayYmd(now)`. Remove unused `dueYmd` if you keep that approach—final code must use one clear comparison only:

```typescript
export function isScheduleOverdue(
  items: ScheduleDueRow[],
  now: Date = new Date(),
): boolean {
  const today = bangkokTodayYmd(now);
  return items.some((item) => {
    if (item.status === ScheduleItemStatus.PAID) return false;
    const dueStr = item.dueDate.toISOString().slice(0, 10);
    return dueStr < today;
  });
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd backend && npx jest src/devices/overdue-lock-policy.spec.ts --no-coverage
```

- [ ] **Step 5: Commit** (only if user asked to commit)

```bash
git add backend/src/devices/overdue-lock-policy.ts backend/src/devices/overdue-lock-policy.spec.ts
git commit -m "$(cat <<'EOF'
feat(devices): add Bangkok overdue schedule helpers for Phase 4b

EOF
)"
```

---

### Task 2: Prisma evaluation-run table

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20261121170000_phase4b_overdue_evaluate/migration.sql`

- [ ] **Step 1: Add model** (on `Tenant` add relation `devicePolicyEvaluationRuns DevicePolicyEvaluationRun[]`)

```prisma
model DevicePolicyEvaluationRun {
  id             String   @id @default(uuid()) @db.Uuid
  tenantId       String   @map("tenant_id") @db.Uuid
  idempotencyKey String   @map("idempotency_key")
  actorUserId    String   @map("actor_user_id") @db.Uuid
  reason         String
  summaryJson    Json     @map("summary_json")
  createdAt      DateTime @default(now()) @map("created_at")
  tenant         Tenant   @relation(fields: [tenantId], references: [id])
  actor          User     @relation(fields: [actorUserId], references: [id])

  @@unique([tenantId, idempotencyKey])
  @@index([tenantId, createdAt])
  @@map("device_policy_evaluation_runs")
}
```

Add on `User`: `devicePolicyEvaluationRuns DevicePolicyEvaluationRun[]`

- [ ] **Step 2: Migration SQL**

```sql
CREATE TABLE "device_policy_evaluation_runs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id"),
  "idempotency_key" TEXT NOT NULL,
  "actor_user_id" UUID NOT NULL REFERENCES "users"("id"),
  "reason" TEXT NOT NULL,
  "summary_json" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "device_policy_evaluation_runs_tenant_id_idempotency_key_key"
    UNIQUE ("tenant_id", "idempotency_key")
);
CREATE INDEX "device_policy_evaluation_runs_tenant_id_created_at_idx"
  ON "device_policy_evaluation_runs" ("tenant_id", "created_at");
```

- [ ] **Step 3: Apply locally**

```bash
cd backend && npx prisma migrate deploy && npx prisma generate
```

Expected: migrate applied, client regenerated.

- [ ] **Step 4: Commit** (if user asked)

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/20261121170000_phase4b_overdue_evaluate/
git commit -m "$(cat <<'EOF'
feat(db): add device_policy_evaluation_runs for overdue evaluate idempotency

EOF
)"
```

---

### Task 3: OverdueLockOrchestrator (TDD)

**Files:**
- Create: `backend/src/devices/overdue-lock.orchestrator.ts`
- Create: `backend/src/devices/overdue-lock.orchestrator.spec.ts`
- Modify: `backend/src/devices/devices.module.ts` (register provider)

- [ ] **Step 1: Write failing orchestrator tests**

```typescript
import {
  DesiredPresentation,
  DeviceBindingStatus,
  DeviceCommandStatus,
  DeviceCommandType,
  ScheduleItemStatus,
} from '@prisma/client';
import { OverdueLockOrchestrator } from './overdue-lock.orchestrator';

describe('OverdueLockOrchestrator', () => {
  const prisma = {
    devicePolicyEvaluationRun: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    deviceContractBinding: { findMany: jest.fn() },
    paymentScheduleItem: { findMany: jest.fn() },
    deviceCommand: { findFirst: jest.fn() },
    deviceAuditEvent: { findFirst: jest.fn() },
  };
  const commands = { enqueue: jest.fn() };
  const orchestrator = new OverdueLockOrchestrator(
    prisma as never,
    commands as never,
  );
  const ctx = {
    tenantId: 'tenant-a',
    userId: 'user-1',
    role: 'MERCHANT_OWNER' as const,
  };

  beforeEach(() => jest.resetAllMocks());

  it('replays stored summary for same idempotency key', async () => {
    const summary = {
      evaluatedAt: '2026-11-21T00:00:00.000Z',
      timezone: 'Asia/Bangkok',
      scannedBindings: 0,
      locked: [],
      skipped: [],
      replay: true,
    };
    prisma.devicePolicyEvaluationRun.findFirst.mockResolvedValue({
      summaryJson: summary,
    });
    const result = await orchestrator.evaluateTenant(
      ctx,
      'lab reason',
      'idem-1',
      new Date('2026-11-21T10:00:00+07:00'),
    );
    expect(result.replay).toBe(true);
    expect(commands.enqueue).not.toHaveBeenCalled();
  });

  it('enqueues START_LOCK_TASK when binding overdue and not LOCK', async () => {
    prisma.devicePolicyEvaluationRun.findFirst.mockResolvedValue(null);
    prisma.deviceContractBinding.findMany.mockResolvedValue([
      {
        deviceId: 'dev-1',
        contractId: 'c1',
        status: DeviceBindingStatus.ACTIVE,
        device: {
          id: 'dev-1',
          platform: 'ANDROID',
          policyState: { desiredPresentation: DesiredPresentation.NONE },
        },
      },
    ]);
    prisma.paymentScheduleItem.findMany.mockResolvedValue([
      {
        dueDate: new Date('2026-11-01'),
        status: ScheduleItemStatus.PENDING,
      },
    ]);
    prisma.deviceCommand.findFirst.mockResolvedValue(null);
    prisma.deviceAuditEvent.findFirst.mockResolvedValue(null);
    commands.enqueue.mockResolvedValue({ id: 'cmd-lock' });
    prisma.devicePolicyEvaluationRun.create.mockResolvedValue({});

    const result = await orchestrator.evaluateTenant(
      ctx,
      'lab overdue',
      'idem-2',
      new Date('2026-11-21T10:00:00+07:00'),
    );

    expect(result.locked).toEqual([
      expect.objectContaining({
        deviceId: 'dev-1',
        contractId: 'c1',
        commandId: 'cmd-lock',
      }),
    ]);
    expect(commands.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-a', userId: 'user-1' }),
      'dev-1',
      expect.objectContaining({
        type: DeviceCommandType.START_LOCK_TASK,
        reason: expect.stringContaining('overdue-lock:2026-11-21'),
      }),
    );
  });

  it('skips NOT_OVERDUE and ALREADY_LOCK', async () => {
    prisma.devicePolicyEvaluationRun.findFirst.mockResolvedValue(null);
    prisma.deviceContractBinding.findMany.mockResolvedValue([
      {
        deviceId: 'dev-ok',
        contractId: 'c-ok',
        device: {
          id: 'dev-ok',
          platform: 'ANDROID',
          policyState: { desiredPresentation: DesiredPresentation.NONE },
        },
      },
      {
        deviceId: 'dev-lock',
        contractId: 'c-lock',
        device: {
          id: 'dev-lock',
          platform: 'ANDROID',
          policyState: { desiredPresentation: DesiredPresentation.LOCK },
        },
      },
    ]);
    prisma.paymentScheduleItem.findMany
      .mockResolvedValueOnce([]) // current
      .mockResolvedValueOnce([
        { dueDate: new Date('2026-11-01'), status: ScheduleItemStatus.PENDING },
      ]);
    prisma.devicePolicyEvaluationRun.create.mockResolvedValue({});

    const result = await orchestrator.evaluateTenant(
      ctx,
      'lab',
      'idem-3',
      new Date('2026-11-21T10:00:00+07:00'),
    );

    expect(result.skipped.map((s) => s.reason).sort()).toEqual([
      'ALREADY_LOCK',
      'NOT_OVERDUE',
    ]);
    expect(commands.enqueue).not.toHaveBeenCalled();
  });

  it('skips OPEN_START_LOCK_TASK', async () => {
    prisma.devicePolicyEvaluationRun.findFirst.mockResolvedValue(null);
    prisma.deviceContractBinding.findMany.mockResolvedValue([
      {
        deviceId: 'dev-1',
        contractId: 'c1',
        device: {
          id: 'dev-1',
          platform: 'ANDROID',
          policyState: { desiredPresentation: DesiredPresentation.NONE },
        },
      },
    ]);
    prisma.paymentScheduleItem.findMany.mockResolvedValue([
      { dueDate: new Date('2026-11-01'), status: ScheduleItemStatus.PENDING },
    ]);
    prisma.deviceCommand.findFirst.mockResolvedValue({
      id: 'open',
      status: DeviceCommandStatus.QUEUED,
    });
    prisma.devicePolicyEvaluationRun.create.mockResolvedValue({});

    const result = await orchestrator.evaluateTenant(
      ctx,
      'lab',
      'idem-4',
      new Date('2026-11-21T10:00:00+07:00'),
    );

    expect(result.skipped[0].reason).toBe('OPEN_START_LOCK_TASK');
    expect(commands.enqueue).not.toHaveBeenCalled();
  });

  it('rejects empty reason', async () => {
    await expect(
      orchestrator.evaluateTenant(ctx, '  ', 'idem-x'),
    ).rejects.toThrow(/REASON/);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd backend && npx jest src/devices/overdue-lock.orchestrator.spec.ts --no-coverage
```

- [ ] **Step 3: Implement orchestrator**

```typescript
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  DesiredPresentation,
  DeviceBindingStatus,
  DeviceCommandStatus,
  DeviceCommandType,
  ScheduleItemStatus,
} from '@prisma/client';
import { TenantContext } from '../common/tenant/tenant-context';
import { PrismaService } from '../prisma/prisma.service';
import { DeviceCommandsService } from './device-commands.service';
import {
  isScheduleOverdue,
  overdueLockMarker,
} from './overdue-lock-policy';

export type EvaluateOverdueSummary = {
  evaluatedAt: string;
  timezone: 'Asia/Bangkok';
  scannedBindings: number;
  locked: Array<{
    deviceId: string;
    contractId: string;
    commandId: string;
    reason: string;
  }>;
  skipped: Array<{
    deviceId: string;
    contractId: string;
    reason: string;
  }>;
  replay: boolean;
};

@Injectable()
export class OverdueLockOrchestrator {
  private readonly logger = new Logger(OverdueLockOrchestrator.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commands: DeviceCommandsService,
  ) {}

  async evaluateTenant(
    ctx: TenantContext,
    reasonRaw: string,
    idempotencyKey: string,
    now: Date = new Date(),
  ): Promise<EvaluateOverdueSummary> {
    const tenantId = ctx.tenantId;
    if (!tenantId) throw new ForbiddenException('TENANT_REQUIRED');
    const reason = reasonRaw?.trim();
    if (!reason) throw new BadRequestException('REASON_REQUIRED');
    const key = idempotencyKey?.trim();
    if (!key) throw new BadRequestException('Idempotency-Key header is required.');

    const existing = await this.prisma.devicePolicyEvaluationRun.findFirst({
      where: { tenantId, idempotencyKey: key },
    });
    if (existing) {
      return {
        ...(existing.summaryJson as EvaluateOverdueSummary),
        replay: true,
      };
    }

    const marker = overdueLockMarker(now);
    const bindings = await this.prisma.deviceContractBinding.findMany({
      where: {
        tenantId,
        status: DeviceBindingStatus.ACTIVE,
        device: { platform: 'ANDROID' },
      },
      include: { device: { include: { policyState: true } } },
    });

    const locked: EvaluateOverdueSummary['locked'] = [];
    const skipped: EvaluateOverdueSummary['skipped'] = [];

    for (const binding of bindings) {
      const deviceId = binding.deviceId;
      const contractId = binding.contractId;
      if (binding.device.platform !== 'ANDROID') {
        skipped.push({ deviceId, contractId, reason: 'NOT_ANDROID' });
        continue;
      }

      const items = await this.prisma.paymentScheduleItem.findMany({
        where: {
          tenantId,
          contractId,
          status: { not: ScheduleItemStatus.PAID },
        },
        select: { dueDate: true, status: true },
      });

      if (!isScheduleOverdue(items, now)) {
        skipped.push({ deviceId, contractId, reason: 'NOT_OVERDUE' });
        continue;
      }

      const desired =
        binding.device.policyState?.desiredPresentation ??
        DesiredPresentation.NONE;
      if (desired === DesiredPresentation.LOCK) {
        skipped.push({ deviceId, contractId, reason: 'ALREADY_LOCK' });
        continue;
      }

      const openStart = await this.prisma.deviceCommand.findFirst({
        where: {
          tenantId,
          deviceId,
          type: DeviceCommandType.START_LOCK_TASK,
          status: {
            in: [DeviceCommandStatus.QUEUED, DeviceCommandStatus.SENT],
          },
        },
      });
      if (openStart) {
        skipped.push({
          deviceId,
          contractId,
          reason: 'OPEN_START_LOCK_TASK',
        });
        continue;
      }

      const dayApplied = await this.prisma.deviceAuditEvent.findFirst({
        where: {
          tenantId,
          deviceId,
          reason: { contains: marker },
        },
      });
      if (dayApplied) {
        skipped.push({
          deviceId,
          contractId,
          reason: 'ALREADY_APPLIED_TODAY',
        });
        continue;
      }

      const commandReason = `${reason} | ${marker}`;
      const command = await this.commands.enqueue(ctx, deviceId, {
        type: DeviceCommandType.START_LOCK_TASK,
        reason: commandReason,
      });
      locked.push({
        deviceId,
        contractId,
        commandId: command.id,
        reason: commandReason,
      });
    }

    const summary: EvaluateOverdueSummary = {
      evaluatedAt: now.toISOString(),
      timezone: 'Asia/Bangkok',
      scannedBindings: bindings.length,
      locked,
      skipped,
      replay: false,
    };

    await this.prisma.devicePolicyEvaluationRun.create({
      data: {
        tenantId,
        idempotencyKey: key,
        actorUserId: ctx.userId,
        reason,
        summaryJson: summary,
      },
    });

    this.logger.log(
      `overdue evaluate tenant=${tenantId} scanned=${bindings.length} locked=${locked.length}`,
    );
    return summary;
  }
}
```

- [ ] **Step 4: Register in `devices.module.ts`**

Add `OverdueLockOrchestrator` to `providers` (and `exports` if needed later; not required for controller in same module).

- [ ] **Step 5: Run tests — expect PASS**

```bash
cd backend && npx jest src/devices/overdue-lock.orchestrator.spec.ts src/devices/overdue-lock-policy.spec.ts --no-coverage
```

- [ ] **Step 6: Commit** (if user asked)

---

### Task 4: HTTP endpoint + DTO

**Files:**
- Create: `backend/src/devices/dto/evaluate-overdue.dto.ts`
- Modify: `backend/src/devices/device-lifecycle.controller.ts`
- Create or extend: `backend/src/devices/device-lifecycle.controller.spec.ts` (optional thin test) — prefer integration-style unit on controller if existing pattern; otherwise cover via orchestrator only + manual curl lab.

- [ ] **Step 1: DTO**

```typescript
import { IsString, MinLength } from 'class-validator';

export class EvaluateOverdueDto {
  @IsString()
  @MinLength(1)
  reason!: string;
}
```

- [ ] **Step 2: Controller route — place BEFORE any `@Post(':id/...')`**

Inject `OverdueLockOrchestrator` in constructor.

```typescript
  @Post('policy/evaluate-overdue')
  @RequirePermissions('devices.command')
  async evaluateOverdue(
    @Body() dto: EvaluateOverdueDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @CurrentUser() user: TenantContext,
  ) {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException('Idempotency-Key header is required.');
    }
    const data = await this.overdueLock.evaluateTenant(
      user,
      dto.reason,
      idempotencyKey,
    );
    return { data };
  }
```

- [ ] **Step 3: Smoke with Nest build**

```bash
cd backend && npx nest build
```

Expected: compile success.

- [ ] **Step 4: Commit** (if user asked)

---

### Task 5: Docs / backlog / decision

**Files:**
- Modify: `docs/roadmap/CURRENT-PHASE.md`
- Modify: `docs/project-management/TASK-BACKLOG.md` — add `R2-P4-002`
- Modify: `docs/project-management/DECISION-LOG.md` — D-063 lab jump-to-LOCK
- Modify: `docs/api/DEVICE-ENROLLMENT-API.md` — short evaluate-overdue section
- Modify: `docs/superpowers/specs/2026-11-21-phase4b-overdue-auto-lock-design.md` — Status: Implemented (lab software)

- [x] **Step 1: Backlog row**

| R2-P4-002 | Phase 4b overdue auto-lock: staff evaluate-overdue → START_LOCK_TASK (lab jump-to-LOCK) | P0 | Backend | IN_PROGRESS → DONE when tests green |

- [x] **Step 2: D-063**

| D-063 | 2026-11-21 | Phase 4b lab: overdue unpaid past-due schedule → jump desired `LOCK` + `START_LOCK_TASK` via staff `evaluate-overdue` (tenant batch). Full REMINDER/RESTRICT ladder + merchant thresholds + cron deferred | Fast Pad proof after 4a unlock; state machine ladder remains product target | Accepted (lab) |

- [x] **Step 3: CURRENT-PHASE** — mark 4b lab software; Next = optional Pad E2E / cron later

- [ ] **Step 4: Commit** (if user asked)

---

### Task 6: Optional Pad lab E2E

**Only after software green; needs living Nest + Pad DO + ACTIVE binding.**

- [ ] Backdate one unpaid `payment_schedule_items.due_date` for Pad contract to yesterday (Bangkok).
- [ ] Ensure desired is `NONE` (not already LOCK).
- [ ] `POST /api/v1/devices/policy/evaluate-overdue` with reason + Idempotency-Key.
- [ ] Expect `locked[]` contains Pad `deviceId` and `START_LOCK_TASK` QUEUED.
- [ ] Wake poller → `ACKED_SUCCESS` / `mLockTaskModeState=LOCKED`.
- [ ] Append lab-evidence note.
- [ ] Replay same Idempotency-Key → `replay: true`, no second command.

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Bangkok overdue rule | Task 1 |
| Jump to LOCK + START_LOCK_TASK | Task 3 |
| Staff endpoint + reason + devices.command | Task 4 |
| Tenant batch ACTIVE Android | Task 3 |
| Idempotency-Key run table | Task 2–3 |
| Day marker / skip reasons | Task 3 |
| No cron / no iOS / no ladder | Explicit non-goals |
| Docs / R2-P4-002 / D-063 | Task 5 |
| Optional Pad E2E | Task 6 |

## Placeholder / consistency self-review

- No TBD steps; helper comparison uses `@db.Date` ISO date vs Bangkok YMD.  
- Orchestrator method name is consistently `evaluateTenant`.  
- Marker format consistently `overdue-lock:YYYY-MM-DD`.  
- Route path consistently `POST /devices/policy/evaluate-overdue`.
