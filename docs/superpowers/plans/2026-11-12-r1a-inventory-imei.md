# R1a Inventory + Product + IMEI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver tenant-scoped Product → Variant → ImeiUnit inventory with branch-bound stock, audited movements, and reserve/release APIs on the NestJS backend.

**Architecture:** Extend the R0 Nest modular monolith with `catalog` and `inventory` modules. All mutations use Prisma transactions; `tenantId` comes only from JWT `TenantContext`. Prices use `Decimal` / Prisma `Decimal` — never JavaScript float arithmetic for money.

**Tech Stack:** NestJS 10, Prisma 6, PostgreSQL 16, Jest, existing JwtAuthGuard / CurrentUser patterns, pnpm (`corepack pnpm`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-11-12-r1a-inventory-imei-design.md`
- IMEI unique per tenant: `@@unique([tenantId, imei])`
- IMEI always has one `branchId`; transfer updates branch + writes `TRANSFER` movement
- Statuses: `AVAILABLE` | `RESERVED` | `SOLD` | `TRANSFERRED_OUT`
- Money: `DECIMAL(18,2)` + currency `THB`; API JSON price as string e.g. `"12900.00"`
- Never trust client `tenantId`; JWT only
- TypeScript strict; semicolons; no Flutter/Merchant Web in this plan
- Local Postgres host port **5433** (`DATABASE_URL`)
- Use `corepack pnpm` if `pnpm` missing from PATH
- TDD for service rules; frequent commits

## File Structure

```text
backend/prisma/schema.prisma                          # extend models
backend/src/catalog/
  catalog.module.ts
  products.service.ts
  products.service.spec.ts
  products.controller.ts
  dto/create-product.dto.ts
  dto/update-product.dto.ts
  dto/create-variant.dto.ts
backend/src/inventory/
  inventory.module.ts
  inventory.service.ts
  inventory.service.spec.ts
  inventory.controller.ts
  dto/receive-imei.dto.ts
  dto/transfer-imei.dto.ts
  dto/reserve-imei.dto.ts
backend/src/app.module.ts                             # import modules
backend/test/inventory.e2e-spec.ts
docs/roadmap/CURRENT-PHASE.md
docs/project-management/PROJECT-STATUS.md
```

---

### Task 1: Prisma schema for catalog + inventory

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: migration via Prisma CLI
- Modify: `backend/src/app.module.ts` only if needed later (not this task)

**Interfaces:**
- Consumes: existing `Tenant`, `Branch`, `User` models
- Produces: Prisma models `Product`, `ProductVariant`, `ImeiUnit`, `StockMovement` + enums

- [ ] **Step 1: Append enums and models to schema**

Add to `backend/prisma/schema.prisma` (keep existing models; extend `Tenant` / `Branch` / `User` relations):

```prisma
enum CatalogStatus {
  ACTIVE
  INACTIVE
}

enum ImeiStatus {
  AVAILABLE
  RESERVED
  SOLD
  TRANSFERRED_OUT
}

enum StockMovementType {
  RECEIVE
  TRANSFER
  RESERVE
  RELEASE
  SELL
  ADJUST
}

model Product {
  id        String        @id @default(uuid()) @db.Uuid
  tenantId  String        @map("tenant_id") @db.Uuid
  name      String
  brand     String
  status    CatalogStatus @default(ACTIVE)
  createdAt DateTime      @default(now()) @map("created_at")
  updatedAt DateTime      @updatedAt @map("updated_at")
  tenant    Tenant        @relation(fields: [tenantId], references: [id])
  variants  ProductVariant[]

  @@index([tenantId])
  @@map("products")
}

model ProductVariant {
  id        String        @id @default(uuid()) @db.Uuid
  tenantId  String        @map("tenant_id") @db.Uuid
  productId String        @map("product_id") @db.Uuid
  sku       String
  color     String
  storage   String
  price     Decimal       @db.Decimal(18, 2)
  currency  String        @default("THB") @db.Char(3)
  status    CatalogStatus @default(ACTIVE)
  createdAt DateTime      @default(now()) @map("created_at")
  updatedAt DateTime      @updatedAt @map("updated_at")
  tenant    Tenant        @relation(fields: [tenantId], references: [id])
  product   Product       @relation(fields: [productId], references: [id])
  imeiUnits ImeiUnit[]

  @@unique([tenantId, sku])
  @@index([tenantId])
  @@index([productId])
  @@map("product_variants")
}

model ImeiUnit {
  id        String     @id @default(uuid()) @db.Uuid
  tenantId  String     @map("tenant_id") @db.Uuid
  branchId  String     @map("branch_id") @db.Uuid
  variantId String     @map("variant_id") @db.Uuid
  imei      String
  status    ImeiStatus @default(AVAILABLE)
  createdAt DateTime   @default(now()) @map("created_at")
  updatedAt DateTime   @updatedAt @map("updated_at")
  tenant    Tenant     @relation(fields: [tenantId], references: [id])
  branch    Branch     @relation(fields: [branchId], references: [id])
  variant   ProductVariant @relation(fields: [variantId], references: [id])
  movements StockMovement[]

  @@unique([tenantId, imei])
  @@index([tenantId, branchId])
  @@index([tenantId, status])
  @@map("imei_units")
}

model StockMovement {
  id           String            @id @default(uuid()) @db.Uuid
  tenantId     String            @map("tenant_id") @db.Uuid
  imeiUnitId   String            @map("imei_unit_id") @db.Uuid
  type         StockMovementType
  fromBranchId String?           @map("from_branch_id") @db.Uuid
  toBranchId   String?           @map("to_branch_id") @db.Uuid
  actorUserId  String            @map("actor_user_id") @db.Uuid
  reason       String?
  createdAt    DateTime          @default(now()) @map("created_at")
  tenant       Tenant            @relation(fields: [tenantId], references: [id])
  imeiUnit     ImeiUnit          @relation(fields: [imeiUnitId], references: [id])
  actor        User              @relation(fields: [actorUserId], references: [id])

  @@index([tenantId, imeiUnitId])
  @@index([tenantId, createdAt])
  @@map("stock_movements")
}
```

On `Tenant` add: `products Product[]`, `variants ProductVariant[]`, `imeiUnits ImeiUnit[]`, `stockMovements StockMovement[]`  
On `Branch` add: `imeiUnits ImeiUnit[]`  
On `User` add: `stockMovements StockMovement[]`

- [ ] **Step 2: Migrate**

```bash
export $(grep -v '^#' .env | xargs)
corepack pnpm --filter @mip/backend exec prisma migrate dev --name r1a_inventory_imei
corepack pnpm --filter @mip/backend exec prisma generate
corepack pnpm --filter @mip/backend typecheck
```

Expected: migration applied; typecheck PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/prisma backend/package.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat: add Prisma schema for products, variants, and IMEI inventory

EOF
)"
```

---

### Task 2: Catalog service — create product + variant (TDD)

**Files:**
- Create: `backend/src/catalog/products.service.ts`
- Create: `backend/src/catalog/products.service.spec.ts`
- Create: `backend/src/catalog/catalog.module.ts`
- Create: `backend/src/catalog/dto/create-product.dto.ts`
- Create: `backend/src/catalog/dto/create-variant.dto.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Consumes: `PrismaService`, `TenantContext`
- Produces:
  - `ProductsService.createProduct(ctx, input): Promise<Product>`
  - `ProductsService.createVariant(ctx, productId, input): Promise<ProductVariant>`
  - Throws `ForbiddenException` if `!ctx.tenantId`
  - Throws `NotFoundException` if product not in tenant
  - Throws `ConflictException` on duplicate SKU

- [ ] **Step 1: Write failing unit tests**

`backend/src/catalog/products.service.spec.ts`:

```typescript
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  const prisma = {
    product: { create: jest.fn(), findFirst: jest.fn() },
    productVariant: { create: jest.fn(), findFirst: jest.fn() },
  };

  const service = new ProductsService(prisma as never);
  const ctx = {
    tenantId: 'tenant-a',
    userId: 'user-1',
    role: PlatformRole.MERCHANT_OWNER,
  };

  it('rejects create without tenant context', async () => {
    await expect(
      service.createProduct(
        { tenantId: null, userId: 'u', role: PlatformRole.SUPER_ADMIN },
        { name: 'Phone', brand: 'Acme' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates product for tenant', async () => {
    prisma.product.create.mockResolvedValue({
      id: 'p1',
      tenantId: 'tenant-a',
      name: 'Phone',
      brand: 'Acme',
    });
    await expect(
      service.createProduct(ctx, { name: 'Phone', brand: 'Acme' }),
    ).resolves.toMatchObject({ id: 'p1', tenantId: 'tenant-a' });
  });

  it('rejects variant for missing product', async () => {
    prisma.product.findFirst.mockResolvedValue(null);
    await expect(
      service.createVariant(ctx, 'missing', {
        sku: 'SKU-1',
        color: 'Black',
        storage: '128GB',
        price: '12900.00',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
corepack pnpm --filter @mip/backend test -- products.service.spec.ts
```

- [ ] **Step 3: Implement ProductsService + DTOs + module**

`create-product.dto.ts`:

```typescript
import { IsString, MinLength } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  brand!: string;
}
```

`create-variant.dto.ts`:

```typescript
import { IsString, Matches, MinLength } from 'class-validator';

export class CreateVariantDto {
  @IsString()
  @MinLength(1)
  sku!: string;

  @IsString()
  @MinLength(1)
  color!: string;

  @IsString()
  @MinLength(1)
  storage!: string;

  /** Decimal string with up to 2 fractional digits */
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  price!: string;
}
```

`products.service.ts` (minimal):

```typescript
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant/tenant-context';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private requireTenantId(ctx: TenantContext): string {
    if (!ctx.tenantId) {
      throw new ForbiddenException('Tenant context required.');
    }
    return ctx.tenantId;
  }

  createProduct(ctx: TenantContext, input: { name: string; brand: string }) {
    const tenantId = this.requireTenantId(ctx);
    return this.prisma.product.create({
      data: {
        tenantId,
        name: input.name,
        brand: input.brand,
      },
    });
  }

  async createVariant(
    ctx: TenantContext,
    productId: string,
    input: { sku: string; color: string; storage: string; price: string },
  ) {
    const tenantId = this.requireTenantId(ctx);
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });
    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    try {
      return await this.prisma.productVariant.create({
        data: {
          tenantId,
          productId,
          sku: input.sku,
          color: input.color,
          storage: input.storage,
          price: new Prisma.Decimal(input.price),
          currency: 'THB',
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('SKU already exists for this tenant.');
      }
      throw error;
    }
  }
}
```

Wire `CatalogModule` exporting `ProductsService`; import in `AppModule`.

- [ ] **Step 4: Run tests — expect PASS**

```bash
corepack pnpm --filter @mip/backend test -- products.service.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/catalog backend/src/app.module.ts
git commit -m "$(cat <<'EOF'
feat: add catalog products and variants service

EOF
)"
```

---

### Task 3: Inventory receive + duplicate IMEI (TDD)

**Files:**
- Create: `backend/src/inventory/inventory.service.ts`
- Create: `backend/src/inventory/inventory.service.spec.ts`
- Create: `backend/src/inventory/inventory.module.ts`
- Create: `backend/src/inventory/dto/receive-imei.dto.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Consumes: `PrismaService`, `TenantContext`
- Produces: `InventoryService.receive(ctx, input)` → `ImeiUnit` + `RECEIVE` movement in one transaction
- Input: `{ branchId, variantId, imei, reason? }`
- Throws: `ForbiddenException`, `NotFoundException` (branch/variant), `ConflictException` (duplicate imei)

- [ ] **Step 1: Write failing tests**

```typescript
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ImeiStatus, PlatformRole, StockMovementType } from '@prisma/client';
import { InventoryService } from './inventory.service';

describe('InventoryService.receive', () => {
  const tx = {
    branch: { findFirst: jest.fn() },
    productVariant: { findFirst: jest.fn() },
    imeiUnit: { create: jest.fn() },
    stockMovement: { create: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const service = new InventoryService(prisma as never);
  const ctx = {
    tenantId: 'tenant-a',
    userId: 'user-1',
    role: PlatformRole.MERCHANT_OWNER,
  };

  beforeEach(() => jest.clearAllMocks());

  it('rejects without tenant', async () => {
    await expect(
      service.receive(
        { tenantId: null, userId: 'u', role: PlatformRole.SUPER_ADMIN },
        { branchId: 'b', variantId: 'v', imei: '356938035643809' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('receives IMEI into branch with RECEIVE movement', async () => {
    tx.branch.findFirst.mockResolvedValue({ id: 'b1', tenantId: 'tenant-a' });
    tx.productVariant.findFirst.mockResolvedValue({
      id: 'v1',
      tenantId: 'tenant-a',
    });
    tx.imeiUnit.create.mockResolvedValue({
      id: 'u1',
      imei: '356938035643809',
      status: ImeiStatus.AVAILABLE,
      branchId: 'b1',
    });
    tx.stockMovement.create.mockResolvedValue({ id: 'm1' });

    await expect(
      service.receive(ctx, {
        branchId: 'b1',
        variantId: 'v1',
        imei: '356938035643809',
      }),
    ).resolves.toMatchObject({ id: 'u1', status: ImeiStatus.AVAILABLE });

    expect(tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: StockMovementType.RECEIVE,
          toBranchId: 'b1',
          actorUserId: 'user-1',
        }),
      }),
    );
  });

  it('maps unique violation to ConflictException', async () => {
    tx.branch.findFirst.mockResolvedValue({ id: 'b1', tenantId: 'tenant-a' });
    tx.productVariant.findFirst.mockResolvedValue({
      id: 'v1',
      tenantId: 'tenant-a',
    });
    const err = Object.assign(new Error('unique'), {
      code: 'P2002',
      clientVersion: '6',
      name: 'PrismaClientKnownRequestError',
    });
    // Prefer constructing Prisma.PrismaClientKnownRequestError if available in test env
    tx.imeiUnit.create.mockRejectedValue(err);

    // Implementer: use real Prisma.PrismaClientKnownRequestError in test
    await expect(
      service.receive(ctx, {
        branchId: 'b1',
        variantId: 'v1',
        imei: '356938035643809',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
```

Note: In the real test file, construct `new Prisma.PrismaClientKnownRequestError('Unique', { code: 'P2002', clientVersion: '6.0.0' })` instead of a plain Error.

- [ ] **Step 2: Run — expect FAIL**

```bash
corepack pnpm --filter @mip/backend test -- inventory.service.spec.ts
```

- [ ] **Step 3: Implement InventoryService.receive**

Validate branch + variant belong to `ctx.tenantId`. Create unit `AVAILABLE` + movement `RECEIVE` in `$transaction`. Catch `P2002` → `ConflictException('IMEI already exists for this tenant.')`.

- [ ] **Step 4: Tests PASS + commit**

```bash
corepack pnpm --filter @mip/backend test -- inventory.service.spec.ts
git add backend/src/inventory backend/src/app.module.ts
git commit -m "$(cat <<'EOF'
feat: add inventory receive with tenant-unique IMEI

EOF
)"
```

---

### Task 4: Transfer + reserve + release (TDD)

**Files:**
- Modify: `backend/src/inventory/inventory.service.ts`
- Modify: `backend/src/inventory/inventory.service.spec.ts`
- Create: `backend/src/inventory/dto/transfer-imei.dto.ts`
- Create: `backend/src/inventory/dto/reserve-imei.dto.ts`

**Interfaces:**
- `transfer(ctx, imeiUnitId, { toBranchId, reason? })`
- `reserve(ctx, imeiUnitId, { reason? })`
- `release(ctx, imeiUnitId, { reason? })`
- `markSold(ctx, imeiUnitId, { reason? })` — service method for R1d; unit-test only in R1a (no HTTP required)

Rules:
- transfer: unit must be `AVAILABLE`; both branches same tenant; update `branchId`; movement `TRANSFER`
- reserve: must be `AVAILABLE` → `RESERVED`; movement `RESERVE`; fail if not available
- release: must be `RESERVED` → `AVAILABLE`; movement `RELEASE`
- markSold: must be `RESERVED` → `SOLD`; movement `SELL`

- [ ] **Step 1: Add failing tests for transfer, double-reserve, release**

```typescript
it('rejects reserve when not AVAILABLE', async () => {
  // mock findFirst unit status RESERVED → ConflictException or Unprocessable
});

it('reserves AVAILABLE unit', async () => {
  // expect status RESERVED + RESERVE movement
});

it('transfers AVAILABLE unit to another branch', async () => {
  // expect branchId updated + TRANSFER movement
});
```

Use `ConflictException` or `UnprocessableEntityException` consistently — **choose `ConflictException` for illegal status transitions** in this plan.

- [ ] **Step 2: Implement methods in transaction with status guards**

- [ ] **Step 3: Run full inventory + catalog unit tests**

```bash
corepack pnpm --filter @mip/backend test
```

Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/inventory
git commit -m "$(cat <<'EOF'
feat: add IMEI transfer, reserve, and release transitions

EOF
)"
```

---

### Task 5: HTTP controllers for catalog + inventory

**Files:**
- Create: `backend/src/catalog/products.controller.ts`
- Create: `backend/src/inventory/inventory.controller.ts`
- Create: `backend/src/catalog/dto/update-product.dto.ts` (optional PATCH)
- Modify: modules to register controllers

**Interfaces:**
- All routes `@UseGuards(JwtAuthGuard)` + `@CurrentUser() user: TenantContext`
- Envelope `{ data: ... }`

Routes:

```text
POST   /api/v1/products
GET    /api/v1/products
GET    /api/v1/products/:id
POST   /api/v1/products/:id/variants
GET    /api/v1/products/:id/variants
POST   /api/v1/inventory/imeis/receive
GET    /api/v1/inventory/imeis?imei=&branchId=&status=
GET    /api/v1/inventory/imeis/:id
POST   /api/v1/inventory/imeis/:id/transfer
POST   /api/v1/inventory/imeis/:id/reserve
POST   /api/v1/inventory/imeis/:id/release
GET    /api/v1/inventory/movements?imeiUnitId=
```

List/get must filter by `user.tenantId`. Return 403/Forbidden when no tenant on user.

Serialize variant `price` with `.toFixed(2)` or `.toString()` — never raw float.

- [ ] **Step 1: Implement controllers + list/get service methods as needed**

- [ ] **Step 2: Unit smoke or compile**

```bash
corepack pnpm --filter @mip/backend typecheck
corepack pnpm --filter @mip/backend test
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/catalog backend/src/inventory
git commit -m "$(cat <<'EOF'
feat: expose catalog and inventory REST endpoints

EOF
)"
```

---

### Task 6: E2E inventory isolation + happy path

**Files:**
- Create: `backend/test/inventory.e2e-spec.ts`

**Interfaces:**
- Uses existing `AppModule` bootstrap pattern from `isolation.e2e-spec.ts`
- Register two owners; receive IMEI as A; assert B cannot GET A's unit (403/404)
- Happy path: product → variant → receive → transfer → reserve → release

- [ ] **Step 1: Write e2e**

Pattern:

```typescript
// register owner A + B via /api/v1/auth/register-owner
// A creates product + variant + receive
// B GET /api/v1/inventory/imeis/:id with B token → 403 or 404
// A transfer/reserve/release → 201/200
```

Scope cleanup to created tenant/user ids (same pattern as Task 6 R0 isolation e2e).

- [ ] **Step 2: Run e2e**

```bash
corepack pnpm --filter @mip/backend test:e2e
```

Expected: PASS (including prior suites).

- [ ] **Step 3: Commit**

```bash
git add backend/test/inventory.e2e-spec.ts
git commit -m "$(cat <<'EOF'
test: add inventory e2e isolation and stock flow coverage

EOF
)"
```

---

### Task 7: Docs status + R1a exit checklist

**Files:**
- Modify: `docs/roadmap/CURRENT-PHASE.md`
- Modify: `docs/project-management/PROJECT-STATUS.md`
- Modify: `docs/project-management/CHANGELOG.md`

- [ ] **Step 1: Mark R1a complete when tests green; list R1b as next**

- [ ] **Step 2: Commit**

```bash
git add docs/roadmap/CURRENT-PHASE.md docs/project-management/PROJECT-STATUS.md docs/project-management/CHANGELOG.md
git commit -m "$(cat <<'EOF'
docs: mark R1a inventory slice complete and point to R1b

EOF
)"
```

---

## R1a Exit Criteria

- [ ] Prisma models migrated
- [ ] Product + variant create with DECIMAL price
- [ ] Receive IMEI; duplicate tenant IMEI → conflict
- [ ] Transfer updates branch + movement
- [ ] Reserve/release; double-reserve fails
- [ ] Cross-tenant e2e denial
- [ ] No Merchant Web claimed done

## Spec Coverage

| Spec item | Task |
|-----------|------|
| Schema Product/Variant/Imei/Movement | 1 |
| Catalog create | 2 |
| Receive + unique IMEI | 3 |
| Transfer/reserve/release/sell service | 4 |
| REST API | 5 |
| Isolation e2e | 6 |
| Status docs | 7 |
