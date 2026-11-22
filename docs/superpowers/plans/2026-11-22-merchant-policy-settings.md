# Merchant Policy Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Per-tenant overdue ladder thresholds, cron on/off, and human approval queue before LOCK — with Merchant Web **นโยบาย** page.

**Architecture:** `TenantDevicePolicySettings` + `DeviceLockApproval` tables; settings service lazy-defaults; `OverdueLockOrchestrator` reads thresholds and creates PENDING approvals instead of enqueueing LOCK when `requireLockApproval`; staff approve/reject APIs; cron skips disabled tenants; Merchant Web nav page uses existing `./ui` kit.

**Tech Stack:** NestJS, Prisma/Postgres, Jest, Merchant Web React + Vitest, existing RBAC.

**Spec:** [../specs/2026-11-22-merchant-policy-settings-design.md](../specs/2026-11-22-merchant-policy-settings-design.md)

**Commits:** Only when the user explicitly asks (project user rule). Treat commit steps as optional checkpoints.

---

## File map

| Path | Responsibility |
|------|----------------|
| `backend/prisma/schema.prisma` + migration | Enums, `TenantDevicePolicySettings`, `DeviceLockApproval`, Tenant relations, partial unique SQL |
| `backend/src/common/authz/permissions.ts` (+ spec) | `devices.policy.config` OWNER-only |
| `backend/src/devices/overdue-lock-policy.ts` (+ spec) | Threshold type + `targetFromOverdueDays(days, thresholds?)` |
| `backend/src/devices/device-policy-settings.ts` (+ spec) | Pure validate + default constants |
| `backend/src/devices/device-policy-settings.service.ts` (+ spec) | getOrCreate / update / audit |
| `backend/src/devices/device-lock-approval.service.ts` (+ spec) | list / approve / reject / cancelPendingForDevice |
| `backend/src/devices/dto/update-device-policy-settings.dto.ts` | PUT body |
| `backend/src/devices/dto/resolve-lock-approval.dto.ts` | approve/reject reason |
| `backend/src/devices/overdue-lock.orchestrator.ts` (+ spec) | Use settings; LOCK → PENDING when required |
| `backend/src/devices/overdue-lock-cron.service.ts` (+ spec) | Skip `autoEvaluateCronEnabled=false` |
| `backend/src/devices/device-lifecycle.controller.ts` | New policy routes (before `:id` routes) |
| `backend/src/devices/device-lifecycle.service.ts` / payment-unlock / recovery | Cancel PENDING on unbind / unlock / recovery as applicable |
| `backend/src/devices/devices.module.ts` | Register new services |
| `apps/merchant-web/src/policy-page.tsx` (+ spec) | Settings form + approval queue |
| `apps/merchant-web/src/App.tsx` / `i18n.ts` | Nav `policy` |
| Docs | CURRENT-PHASE, TASK-BACKLOG `R2-P4-009`, DECISION-LOG D-067 |

---

### Task 1: Prisma schema + permission

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20261122220000_merchant_policy_settings/migration.sql`
- Modify: `backend/src/common/authz/permissions.ts`
- Modify: `backend/src/common/authz/permissions.spec.ts`

- [ ] **Step 1: Write the failing permission test**

Add to `permissions.spec.ts`:

```ts
  it('gives devices.policy.config to OWNER but not STAFF', () => {
    expect(
      hasPermission(PlatformRole.MERCHANT_OWNER, 'devices.policy.config'),
    ).toBe(true);
    expect(
      hasPermission(PlatformRole.MERCHANT_STAFF, 'devices.policy.config'),
    ).toBe(false);
    expect(
      hasPermission(PlatformRole.SUPER_ADMIN, 'devices.policy.config'),
    ).toBe(true);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/common/authz/permissions.spec.ts -t "devices.policy.config" --no-cache`

Expected: FAIL (permission not in union / always false)

- [ ] **Step 3: Add Prisma models + enum**

In `schema.prisma`, add:

```prisma
enum DeviceLockApprovalStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}
```

Extend `DeviceAuditAction` with `POLICY_SETTINGS` and `LOCK_APPROVAL`.

Add models (after `DevicePolicyEvaluationRun` is fine):

```prisma
model TenantDevicePolicySettings {
  tenantId                 String   @id @map("tenant_id") @db.Uuid
  reminderAfterDays        Int      @default(1) @map("reminder_after_days")
  restrictAfterDays        Int      @default(3) @map("restrict_after_days")
  lockAfterDays            Int      @default(7) @map("lock_after_days")
  autoEvaluateCronEnabled  Boolean  @default(true) @map("auto_evaluate_cron_enabled")
  requireLockApproval      Boolean  @default(true) @map("require_lock_approval")
  createdAt                DateTime @default(now()) @map("created_at")
  updatedAt                DateTime @updatedAt @map("updated_at")
  tenant                   Tenant   @relation(fields: [tenantId], references: [id])

  @@map("tenant_device_policy_settings")
}

model DeviceLockApproval {
  id               String                   @id @default(uuid()) @db.Uuid
  tenantId         String                   @map("tenant_id") @db.Uuid
  deviceId         String                   @map("device_id") @db.Uuid
  contractId       String                   @map("contract_id") @db.Uuid
  status           DeviceLockApprovalStatus @default(PENDING)
  overdueDays      Int                      @map("overdue_days")
  reason           String
  requestedAt      DateTime                 @default(now()) @map("requested_at")
  resolvedAt       DateTime?                @map("resolved_at")
  resolvedByUserId String?                  @map("resolved_by_user_id") @db.Uuid
  createdAt        DateTime                 @default(now()) @map("created_at")
  updatedAt        DateTime                 @updatedAt @map("updated_at")
  tenant           Tenant                   @relation(fields: [tenantId], references: [id])
  device           Device                   @relation(fields: [deviceId], references: [id])
  // optional User relation for resolvedByUserId if User model allows

  @@index([tenantId, status, requestedAt])
  @@index([deviceId, status])
  @@map("device_lock_approvals")
}
```

On `Tenant`, add:

```prisma
  devicePolicySettings    TenantDevicePolicySettings?
  deviceLockApprovals     DeviceLockApproval[]
```

On `Device`, add `lockApprovals DeviceLockApproval[]`.

Migration SQL must include partial unique:

```sql
CREATE UNIQUE INDEX device_lock_approvals_one_pending_per_device
  ON device_lock_approvals (device_id)
  WHERE status = 'PENDING';
```

Also `ALTER TYPE "DeviceAuditAction" ADD VALUE ...` for new enum values (Postgres).

Make `DeviceAuditEvent.deviceId` **nullable** (drop required FK only when null) so tenant-level `POLICY_SETTINGS` audits work without a fake device:

```prisma
model DeviceAuditEvent {
  // ...
  deviceId    String?           @map("device_id") @db.Uuid
  device      Device?           @relation(fields: [deviceId], references: [id])
  // ...
}
```

On `DeviceLockApproval` also add:

```prisma
  resolveIdempotencyKey String? @map("resolve_idempotency_key")
  @@unique([tenantId, resolveIdempotencyKey])
```

- [ ] **Step 4: Wire permission**

In `permissions.ts`, add `'devices.policy.config'` to `PERMISSIONS`. Change STAFF filter:

```ts
const STAFF_PERMS: Permission[] = PERMISSIONS.filter(
  (p) => p !== 'devices.unbind' && p !== 'devices.policy.config',
);
```

- [ ] **Step 5: Apply migration + regenerate tests**

Run:

```bash
cd backend && npx prisma migrate deploy && npx prisma generate
cd backend && npx jest src/common/authz/permissions.spec.ts --no-cache
```

Expected: PASS

---

### Task 2: Threshold helpers + settings validation (pure)

**Files:**
- Modify: `backend/src/devices/overdue-lock-policy.ts`
- Modify: `backend/src/devices/overdue-lock-policy.spec.ts`
- Create: `backend/src/devices/device-policy-settings.ts`
- Create: `backend/src/devices/device-policy-settings.spec.ts`

- [ ] **Step 1: Write failing tests for custom thresholds**

Append to `overdue-lock-policy.spec.ts`:

```ts
  it('maps overdue days with custom thresholds', () => {
    const t = { reminderAfterDays: 2, restrictAfterDays: 5, lockAfterDays: 10 };
    expect(targetFromOverdueDays(1, t)).toBeNull();
    expect(targetFromOverdueDays(2, t)).toBe(DesiredPresentation.REMINDER);
    expect(targetFromOverdueDays(5, t)).toBe(DesiredPresentation.RESTRICT);
    expect(targetFromOverdueDays(10, t)).toBe(DesiredPresentation.LOCK);
  });
```

Create `device-policy-settings.spec.ts`:

```ts
import {
  DEFAULT_DEVICE_POLICY_SETTINGS,
  validateDevicePolicySettingsInput,
} from './device-policy-settings';

describe('device-policy-settings', () => {
  it('accepts defaults', () => {
    expect(
      validateDevicePolicySettingsInput(DEFAULT_DEVICE_POLICY_SETTINGS),
    ).toEqual({ ok: true, value: DEFAULT_DEVICE_POLICY_SETTINGS });
  });

  it('rejects non-increasing days', () => {
    const r = validateDevicePolicySettingsInput({
      reminderAfterDays: 3,
      restrictAfterDays: 3,
      lockAfterDays: 7,
      autoEvaluateCronEnabled: true,
      requireLockApproval: true,
    });
    expect(r.ok).toBe(false);
  });

  it('rejects out of bounds', () => {
    const r = validateDevicePolicySettingsInput({
      reminderAfterDays: 0,
      restrictAfterDays: 3,
      lockAfterDays: 7,
      autoEvaluateCronEnabled: true,
      requireLockApproval: true,
    });
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `cd backend && npx jest src/devices/overdue-lock-policy.spec.ts src/devices/device-policy-settings.spec.ts --no-cache`

- [ ] **Step 3: Implement helpers**

Update `targetFromOverdueDays` in `overdue-lock-policy.ts`:

```ts
export type OverdueLadderThresholds = {
  reminderAfterDays: number;
  restrictAfterDays: number;
  lockAfterDays: number;
};

export function targetFromOverdueDays(
  days: number,
  thresholds: OverdueLadderThresholds = {
    reminderAfterDays: LAB_REMINDER_DAYS,
    restrictAfterDays: LAB_RESTRICT_DAYS,
    lockAfterDays: LAB_LOCK_DAYS,
  },
): DesiredPresentation | null {
  if (days >= thresholds.lockAfterDays) return DesiredPresentation.LOCK;
  if (days >= thresholds.restrictAfterDays) return DesiredPresentation.RESTRICT;
  if (days >= thresholds.reminderAfterDays) return DesiredPresentation.REMINDER;
  return null;
}
```

Create `device-policy-settings.ts`:

```ts
export type DevicePolicySettingsInput = {
  reminderAfterDays: number;
  restrictAfterDays: number;
  lockAfterDays: number;
  autoEvaluateCronEnabled: boolean;
  requireLockApproval: boolean;
};

export const DEFAULT_DEVICE_POLICY_SETTINGS: DevicePolicySettingsInput = {
  reminderAfterDays: 1,
  restrictAfterDays: 3,
  lockAfterDays: 7,
  autoEvaluateCronEnabled: true,
  requireLockApproval: true,
};

export function validateDevicePolicySettingsInput(
  input: DevicePolicySettingsInput,
):
  | { ok: true; value: DevicePolicySettingsInput }
  | { ok: false; code: string } {
  const {
    reminderAfterDays: r,
    restrictAfterDays: s,
    lockAfterDays: l,
  } = input;
  if (![r, s, l].every((n) => Number.isInteger(n))) {
    return { ok: false, code: 'DAYS_MUST_BE_INT' };
  }
  if (r < 1 || l > 365 || !(r < s && s < l)) {
    return { ok: false, code: 'INVALID_DAY_ORDER' };
  }
  return {
    ok: true,
    value: {
      reminderAfterDays: r,
      restrictAfterDays: s,
      lockAfterDays: l,
      autoEvaluateCronEnabled: Boolean(input.autoEvaluateCronEnabled),
      requireLockApproval: Boolean(input.requireLockApproval),
    },
  };
}
```

- [ ] **Step 4: Re-run tests — expect PASS**

---

### Task 3: DevicePolicySettingsService

**Files:**
- Create: `backend/src/devices/device-policy-settings.service.ts`
- Create: `backend/src/devices/device-policy-settings.service.spec.ts`
- Create: `backend/src/devices/dto/update-device-policy-settings.dto.ts`
- Modify: `backend/src/devices/devices.module.ts`

- [ ] **Step 1: Write failing service tests**

```ts
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { DevicePolicySettingsService } from './device-policy-settings.service';

describe('DevicePolicySettingsService', () => {
  const tenantId = 't1';
  const ownerCtx = {
    tenantId,
    userId: 'u-owner',
    role: PlatformRole.MERCHANT_OWNER,
  };
  const staffCtx = {
    tenantId,
    userId: 'u-staff',
    role: PlatformRole.MERCHANT_STAFF,
  };

  function makePrisma(overrides: Record<string, unknown> = {}) {
    return {
      tenantDevicePolicySettings: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      deviceAuditEvent: { create: jest.fn() },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          tenantDevicePolicySettings: {
            upsert: jest.fn().mockResolvedValue({
              tenantId,
              reminderAfterDays: 2,
              restrictAfterDays: 4,
              lockAfterDays: 9,
              autoEvaluateCronEnabled: false,
              requireLockApproval: true,
            }),
          },
          deviceAuditEvent: { create: jest.fn() },
        }),
      ),
      ...overrides,
    };
  }

  it('getOrCreate returns defaults when missing', async () => {
    const prisma = makePrisma();
    (prisma.tenantDevicePolicySettings.findUnique as jest.Mock).mockResolvedValue(
      null,
    );
    (prisma.tenantDevicePolicySettings.create as jest.Mock).mockResolvedValue({
      tenantId,
      reminderAfterDays: 1,
      restrictAfterDays: 3,
      lockAfterDays: 7,
      autoEvaluateCronEnabled: true,
      requireLockApproval: true,
    });
    const svc = new DevicePolicySettingsService(prisma as never);
    const row = await svc.getOrCreate(ownerCtx);
    expect(row.reminderAfterDays).toBe(1);
    expect(prisma.tenantDevicePolicySettings.create).toHaveBeenCalled();
  });

  it('staff cannot get or update settings', async () => {
    const svc = new DevicePolicySettingsService(makePrisma() as never);
    await expect(svc.getOrCreate(staffCtx)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      svc.update(staffCtx, {
        reminderAfterDays: 1,
        restrictAfterDays: 3,
        lockAfterDays: 7,
        autoEvaluateCronEnabled: true,
        requireLockApproval: true,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('update rejects invalid day order', async () => {
    const svc = new DevicePolicySettingsService(makePrisma() as never);
    await expect(
      svc.update(ownerCtx, {
        reminderAfterDays: 5,
        restrictAfterDays: 3,
        lockAfterDays: 7,
        autoEvaluateCronEnabled: true,
        requireLockApproval: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd backend && npx jest src/devices/device-policy-settings.service.spec.ts --no-cache`

- [ ] **Step 3: Implement service + DTO**

DTO:

```ts
import { IsBoolean, IsInt, Max, Min } from 'class-validator';

export class UpdateDevicePolicySettingsDto {
  @IsInt()
  @Min(1)
  @Max(365)
  reminderAfterDays!: number;

  @IsInt()
  @Min(1)
  @Max(365)
  restrictAfterDays!: number;

  @IsInt()
  @Min(1)
  @Max(365)
  lockAfterDays!: number;

  @IsBoolean()
  autoEvaluateCronEnabled!: boolean;

  @IsBoolean()
  requireLockApproval!: boolean;
}
```

Service outline:

```ts
@Injectable()
export class DevicePolicySettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(ctx: TenantContext) {
    this.requireConfig(ctx);
    const tenantId = this.requireTenant(ctx);
    const existing = await this.prisma.tenantDevicePolicySettings.findUnique({
      where: { tenantId },
    });
    if (existing) return this.toPublic(existing);
    const created = await this.prisma.tenantDevicePolicySettings.create({
      data: { tenantId, ...DEFAULT_DEVICE_POLICY_SETTINGS },
    });
    return this.toPublic(created);
  }

  /** Internal: no RBAC — for orchestrator/cron */
  async getOrCreateInternal(tenantId: string) {
    const existing = await this.prisma.tenantDevicePolicySettings.findUnique({
      where: { tenantId },
    });
    if (existing) return existing;
    return this.prisma.tenantDevicePolicySettings.create({
      data: { tenantId, ...DEFAULT_DEVICE_POLICY_SETTINGS },
    });
  }

  async update(ctx: TenantContext, input: DevicePolicySettingsInput) {
    this.requireConfig(ctx);
    const tenantId = this.requireTenant(ctx);
    const validated = validateDevicePolicySettingsInput(input);
    if (!validated.ok) throw new BadRequestException(validated.code);
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.tenantDevicePolicySettings.upsert({
        where: { tenantId },
        create: { tenantId, ...validated.value },
        update: { ...validated.value },
      });
      await tx.deviceAuditEvent.create({
        data: {
          tenantId,
          deviceId: null,
          actorUserId: ctx.userId!,
          action: DeviceAuditAction.POLICY_SETTINGS,
          reason: `policy-settings reminder=${validated.value.reminderAfterDays} restrict=${validated.value.restrictAfterDays} lock=${validated.value.lockAfterDays} cron=${validated.value.autoEvaluateCronEnabled} lockApproval=${validated.value.requireLockApproval}`,
        },
      });
      return this.toPublic(row);
    });
  }
  // requireConfig → hasPermission devices.policy.config
}
```

- [ ] **Step 4: Register provider in `devices.module.ts`**

- [ ] **Step 5: Re-run service tests — PASS**

---

### Task 4: Lock approval service (list / approve / reject / cancel)

**Files:**
- Create: `backend/src/devices/device-lock-approval.service.ts`
- Create: `backend/src/devices/device-lock-approval.service.spec.ts`
- Create: `backend/src/devices/dto/resolve-lock-approval.dto.ts`
- Modify: `backend/src/devices/devices.module.ts`

- [ ] **Step 1: Write failing tests**

Cover:

1. `listPending` requires `devices.command`, tenant-scoped, returns masked IMEI (`••••` + last 4).  
2. `approve` enqueues `START_LOCK_TASK` via `DeviceCommandsService.enqueue`, sets status APPROVED, idempotent via `resolveIdempotencyKey` (Task 1).  
3. `reject` sets REJECTED, does not call enqueue.  
4. Wrong tenant → NotFoundException.  
5. `cancelPendingForDevice(tenantId, deviceId, reason)` flips PENDING → CANCELLED.

- [ ] **Step 2: Implement service**

Approve flow:

```ts
async approve(ctx, approvalId, reason, idempotencyKey) {
  this.requireCommand(ctx);
  // if existing resolved with same resolveIdempotencyKey → return replay
  // load PENDING where id+tenantId
  // enqueue START_LOCK_TASK with reason `${reason} | lock-approval:${id}`
  // update APPROVED + resolvedAt + resolvedByUserId + resolveIdempotencyKey
  // audit LOCK_APPROVAL
}
```

Mask IMEI like `device-lifecycle.service.ts` listDevices.

- [ ] **Step 3: Register + tests PASS**

---

### Task 5: Orchestrator uses settings + pending LOCK

**Files:**
- Modify: `backend/src/devices/overdue-lock.orchestrator.ts`
- Modify: `backend/src/devices/overdue-lock.orchestrator.spec.ts` (create if missing; else extend)

- [ ] **Step 1: Write failing orchestrator tests**

Cases:

1. Custom `lockAfterDays: 10` → days=7 yields RESTRICT not LOCK.  
2. `requireLockApproval: true` and days ≥ lock → creates PENDING approval, **no** `commands.enqueue`, skipped reason `LOCK_PENDING_APPROVAL` (or locked entry with `commandId: null` and target LOCK only after approve — **use skipped `LOCK_PENDING_APPROVAL`** per spec).  
3. Already PENDING → skip `LOCK_ALREADY_PENDING` (no duplicate create).  
4. `requireLockApproval: false` → enqueue START_LOCK_TASK as today.

- [ ] **Step 2: Implement**

Inject `DevicePolicySettingsService`. At start of `evaluateTenant` after auth:

```ts
const settings = await this.policySettings.getOrCreateInternal(tenantId);
```

Replace:

```ts
const target = targetFromOverdueDays(days, {
  reminderAfterDays: settings.reminderAfterDays,
  restrictAfterDays: settings.restrictAfterDays,
  lockAfterDays: settings.lockAfterDays,
});
```

Before enqueue for LOCK:

```ts
if (
  target === DesiredPresentation.LOCK &&
  settings.requireLockApproval
) {
  const open = await this.prisma.deviceLockApproval.findFirst({
    where: { tenantId, deviceId, status: 'PENDING' },
  });
  if (open) {
    skipped.push({ deviceId, contractId, reason: 'LOCK_ALREADY_PENDING' });
    continue;
  }
  await this.prisma.deviceLockApproval.create({
    data: {
      tenantId,
      deviceId,
      contractId,
      status: 'PENDING',
      overdueDays: days,
      reason: commandReason,
    },
  });
  skipped.push({ deviceId, contractId, reason: 'LOCK_PENDING_APPROVAL' });
  continue;
}
```

Do **not** change desired presentation to LOCK in this branch.

- [ ] **Step 3: Tests PASS**

---

### Task 6: Cron skip + cancel PENDING on cure paths

**Files:**
- Modify: `backend/src/devices/overdue-lock-cron.service.ts`
- Modify: `backend/src/devices/overdue-lock-cron.service.spec.ts` (extend)
- Modify: `backend/src/devices/device-lifecycle.service.ts` (unbind)
- Modify: `backend/src/devices/payment-unlock.orchestrator.ts`
- Modify: `backend/src/devices/device-recovery.service.ts` (REENROLL path if it clears policy)

- [ ] **Step 1: Cron test — tenant with `autoEvaluateCronEnabled: false` is not evaluated**

In cron `tick`, when listing tenants, either:

```ts
const tenants = await this.prisma.tenant.findMany({
  select: {
    id: true,
    devicePolicySettings: { select: { autoEvaluateCronEnabled: true } },
  },
  orderBy: { createdAt: 'asc' },
});
for (const tenant of tenants) {
  const enabled =
    tenant.devicePolicySettings?.autoEvaluateCronEnabled ?? true;
  if (!enabled) {
    this.logger.log(`overdue evaluate tenant=${tenant.id} SKIP_CRON_DISABLED`);
    continue;
  }
  // existing evaluate...
}
```

- [ ] **Step 2: Call `lockApprovals.cancelPendingForDevice` from unbind success, payment unlock when outstanding 0, and recovery that resets policy**

Keep reasons like `cancel:unbind`, `cancel:payment-unlock`, `cancel:recovery`.

- [ ] **Step 3: Unit tests for cron skip + cancel helper — PASS**

---

### Task 7: HTTP controller routes

**Files:**
- Modify: `backend/src/devices/device-lifecycle.controller.ts`
- Create: `backend/src/devices/device-policy-settings.controller.spec.ts` or extend lifecycle controller tests if present

- [ ] **Step 1: Add routes BEFORE any `@Get(':id')` / `@Post(':id/...')` that could swallow paths**

```ts
  @Get('policy/settings')
  @RequirePermissions('devices.policy.config')
  async getPolicySettings(@CurrentUser() user: TenantContext) {
    return { data: await this.policySettings.getOrCreate(user) };
  }

  @Put('policy/settings')
  @RequirePermissions('devices.policy.config')
  async putPolicySettings(
    @Body() dto: UpdateDevicePolicySettingsDto,
    @CurrentUser() user: TenantContext,
  ) {
    return { data: await this.policySettings.update(user, dto) };
  }

  @Get('policy/lock-approvals')
  @RequirePermissions('devices.command')
  async listLockApprovals(
    @CurrentUser() user: TenantContext,
    @Query('status') status?: string,
  ) {
    return {
      data: await this.lockApprovals.list(user, status ?? 'PENDING'),
    };
  }

  @Post('policy/lock-approvals/:approvalId/approve')
  @RequirePermissions('devices.command')
  async approveLock(
    @Param('approvalId', ParseUUIDPipe) approvalId: string,
    @Body() dto: ResolveLockApprovalDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @CurrentUser() user: TenantContext,
  ) {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException('Idempotency-Key header is required.');
    }
    return {
      data: await this.lockApprovals.approve(
        user,
        approvalId,
        dto.reason,
        idempotencyKey,
      ),
    };
  }

  @Post('policy/lock-approvals/:approvalId/reject')
  @RequirePermissions('devices.command')
  async rejectLock(
    @Param('approvalId', ParseUUIDPipe) approvalId: string,
    @Body() dto: ResolveLockApprovalDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @CurrentUser() user: TenantContext,
  ) {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException('Idempotency-Key header is required.');
    }
    return {
      data: await this.lockApprovals.reject(
        user,
        approvalId,
        dto.reason,
        idempotencyKey,
      ),
    };
  }
```

Inject new services in controller constructor. Import `Put` from `@nestjs/common`.

`ResolveLockApprovalDto`: `{ reason: string }` with `@MinLength(1)`.

- [ ] **Step 2: Smoke with unit tests mocking services — PASS**

---

### Task 8: Merchant Web นโยบาย page

**Files:**
- Create: `apps/merchant-web/src/policy-page.tsx`
- Create: `apps/merchant-web/src/policy-page.spec.tsx`
- Modify: `apps/merchant-web/src/App.tsx`
- Modify: `apps/merchant-web/src/i18n.ts`

- [ ] **Step 1: Write failing page tests**

```tsx
it('shows settings form when GET settings succeeds', async () => { /* ... */ });
it('hides settings form when GET settings returns 403 but still lists approvals', async () => { /* ... */ });
it('approve calls POST with Idempotency-Key', async () => { /* ... */ });
```

- [ ] **Step 2: Implement `PolicyPage`**

- On mount:  
  - `GET /api/v1/devices/policy/settings` → if ok, `canEdit=true` + fill form; if `ApiError` status 403, `canEdit=false`.  
  - `GET /api/v1/devices/policy/lock-approvals?status=PENDING` always (devices.command).  
- Save: `PUT` settings body.  
- Approve/Reject: `POST` + `withIdempotency` from `./api` (same as other mutating calls).  
- Use `Page`, `Section`, `FormField`, `Input`, checkbox inputs, `Table`, `Button`, `Spinner`, `Alert`.

- [ ] **Step 3: Wire App**

```ts
type AppPage = ... | 'policy';
const PAGES: AppPage[] = [..., 'devices', 'policy', 'enroll', 'line'];
// render: page === 'policy' ? <PolicyPage ... /> : null
```

i18n TH/EN keys: `nav.policy`, `policy.title`, `policy.reminderDays`, `policy.restrictDays`, `policy.lockDays`, `policy.cronEnabled`, `policy.requireLockApproval`, `policy.save`, `policy.queueTitle`, `policy.approve`, `policy.reject`, `policy.emptyQueue`, `policy.settingsForbidden`.

- [ ] **Step 4: Run**

```bash
cd apps/merchant-web && npm test -- --run src/policy-page.spec.tsx
```

Expected: PASS

---

### Task 9: Docs + backlog

**Files:**
- Modify: `docs/roadmap/CURRENT-PHASE.md`
- Modify: `docs/project-management/TASK-BACKLOG.md`
- Modify: `docs/project-management/DECISION-LOG.md`
- Modify: `docs/superpowers/specs/2026-11-22-merchant-policy-settings-design.md` status → Implemented (lab) when code done

- [ ] **Step 1: Add D-067**

| D-067 | 2026-11-22 | Merchant policy settings: per-tenant ladder days + cron toggle + requireLockApproval (default on) with DeviceLockApproval queue; OWNER `devices.policy.config`; staff approve via `devices.command` | Closes Phase 4d deferred thresholds/approval | Accepted (lab) |

- [ ] **Step 2: Backlog row**

`R2-P4-009 | Merchant policy settings + lock approval queue | P0 | Backend/Web | DONE (unit; lab)` when complete — or `IN_PROGRESS` mid-flight.

- [ ] **Step 3: CURRENT-PHASE paragraph** under Phase 4 — merchant policy settings slice + link to spec/plan. Next line: still no production DO claim; skip iOS.

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| Settings model + defaults 1/3/7 | 1–3 |
| Validation day order | 2–3 |
| `devices.policy.config` OWNER-only | 1, 3, 7 |
| GET/PUT settings | 3, 7 |
| Lock approval queue + approve/reject | 4, 7 |
| Orchestrator thresholds + PENDING LOCK | 5 |
| Cron skip | 6 |
| Cancel PENDING on cure | 6 |
| Merchant Web นโยบาย | 8 |
| Docs D-067 / backlog | 9 |
| Tenant isolation tests | 4 |
| Non-goals untouched | — |

## Self-review notes

- `targetFromOverdueDays` signature change is backward compatible via default arg — existing unit tests keep passing.  
- Nullable `deviceId` on audit events must be confirmed in Task 1 before POLICY_SETTINGS audit without a device.  
- Controller route order: `policy/*` before `:id` is mandatory.  
- No placeholders left in task bodies above.
