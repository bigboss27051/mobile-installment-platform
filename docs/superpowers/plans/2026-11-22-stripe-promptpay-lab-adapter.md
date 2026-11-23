# Stripe PromptPay Lab Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a switchable Stripe test-mode PromptPay adapter behind `PaymentGatewayPort` so staff and customers can create real Stripe PromptPay QR intents and settle via signed webhooks into the existing allocate/unlock path.

**Architecture:** `PAYMENT_PROVIDER=sandbox|stripe` selects one adapter. Stripe creates/confirms PaymentIntents (`promptpay`), stores `pi_…` + QR URLs in `qrPayloadJson`, and verifies `Stripe-Signature` on `POST /api/v1/webhooks/payments/stripe`. Allocate/ledger/PaymentUnlockOrchestrator stay unchanged.

**Tech Stack:** NestJS, Prisma, Joi env validation, official `stripe` Node SDK, existing Merchant Web (React) + Customer Flutter apps.

**Spec:** `docs/superpowers/specs/2026-11-22-stripe-promptpay-sandbox-adapter-design.md`

---

## File map

| File | Responsibility |
|------|----------------|
| `backend/src/common/payments/payment-gateway.port.ts` | Allow `provider: 'sandbox' \| 'stripe'` |
| `backend/src/common/payments/stripe-payment.adapter.ts` | Stripe PromptPay create/confirm + webhook verify/parse |
| `backend/src/common/payments/stripe-payment.adapter.spec.ts` | Unit tests with mocked Stripe client |
| `backend/src/common/payments/payments-gateway.module.ts` | Wire provider factory |
| `backend/src/config/env.validation.ts` | `PAYMENT_PROVIDER` + conditional Stripe keys |
| `backend/.env.example` / root `.env.example` | Document Stripe vars (no secrets) |
| `backend/src/payments/payments.service.ts` | Provider-agnostic webhook name/messages; min amount when stripe; initial `provider` from config |
| `backend/src/payments/payments.service.spec.ts` | Update webhook method name + stripe fixtures as needed |
| `backend/src/payments/webhooks.controller.ts` | Add `/stripe` route; keep `/sandbox` |
| `backend/src/payments/webhooks.controller.spec.ts` | Cover stripe raw-body rejection |
| `backend/package.json` | Add `stripe` dependency |
| `apps/merchant-web/src/App.tsx` | Render `imageUrlPng` when present |
| `apps/customer-mobile/lib/main.dart` | Show Stripe QR image / link |
| `apps/customer-mobile/lib/lock/lock_screens.dart` | Prefer network image / hosted URL over string QR |
| `apps/customer-mobile/test/…` | Widget/unit for QR payload helper if extracted |
| `docs/project-management/DECISION-LOG.md` | D-066 |
| `docs/roadmap/CURRENT-PHASE.md` | Note lab Stripe adapter (optional one-liner) |

---

### Task 1: Extend port + env validation (TDD)

**Files:**
- Modify: `backend/src/common/payments/payment-gateway.port.ts`
- Modify: `backend/src/config/env.validation.ts`
- Modify: `.env.example` (repo root)
- Test: extend/add a small env validation test if one exists; otherwise rely on boot + unit later

- [ ] **Step 1: Write failing expectation on provider union**

Update `PromptPayIntentResult` so TypeScript rejects only-sandbox usage in a new stripe adapter test file stub — first change the port:

```typescript
export interface PromptPayIntentResult {
  provider: 'sandbox' | 'stripe';
  providerRef: string;
  qrPayload: Record<string, unknown>;
}
```

- [ ] **Step 2: Update Joi**

In `backend/src/config/env.validation.ts`:

```typescript
PAYMENT_PROVIDER: Joi.string().valid('sandbox', 'stripe').default('sandbox'),
STRIPE_PUBLIC_KEY: Joi.string().when('PAYMENT_PROVIDER', {
  is: 'stripe',
  then: Joi.required(),
  otherwise: Joi.optional().allow(''),
}),
STRIPE_PRIVATE_KEY: Joi.string().when('PAYMENT_PROVIDER', {
  is: 'stripe',
  then: Joi.required(),
  otherwise: Joi.optional().allow(''),
}),
STRIPE_WEBHOOK_SECRET: Joi.string().when('PAYMENT_PROVIDER', {
  is: 'stripe',
  then: Joi.required(),
  otherwise: Joi.optional().allow(''),
}),
STRIPE_PROMPTPAY_BILLING_EMAIL: Joi.string().email().when('PAYMENT_PROVIDER', {
  is: 'stripe',
  then: Joi.required(),
  otherwise: Joi.optional().allow(''),
}),
```

Keep `PAYMENT_WEBHOOK_SECRET` required (sandbox path / shared lab).

- [ ] **Step 3: Document in `.env.example`**

Append (placeholders only):

```bash
# PAYMENT_PROVIDER=sandbox
# When PAYMENT_PROVIDER=stripe (lab test mode PromptPay):
# STRIPE_PUBLIC_KEY=pk_test_...
# STRIPE_PRIVATE_KEY=sk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...
# STRIPE_PROMPTPAY_BILLING_EMAIL=lab@example.com
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/common/payments/payment-gateway.port.ts backend/src/config/env.validation.ts .env.example
git commit -m "$(cat <<'EOF'
chore: allow PAYMENT_PROVIDER=stripe env and port provider union

EOF
)"
```

---

### Task 2: Stripe adapter (TDD)

**Files:**
- Create: `backend/src/common/payments/stripe-payment.adapter.ts`
- Create: `backend/src/common/payments/stripe-payment.adapter.spec.ts`
- Modify: `backend/package.json` (add `stripe`)

- [ ] **Step 1: Add dependency**

```bash
cd backend && npm install stripe
```

- [ ] **Step 2: Write failing unit tests**

Create `stripe-payment.adapter.spec.ts` with an injected mock client:

```typescript
describe('StripePaymentAdapter', () => {
  const webhookSecret = 'whsec_test_secret';
  const billingEmail = 'lab@example.com';
  let create: jest.Mock;
  let confirm: jest.Mock;
  let constructEvent: jest.Mock;
  let adapter: StripePaymentAdapter;

  beforeEach(() => {
    create = jest.fn();
    confirm = jest.fn();
    constructEvent = jest.fn();
    const stripe = {
      paymentIntents: { create, confirm },
      webhooks: { constructEvent },
    };
    adapter = new StripePaymentAdapter({
      stripe: stripe as never,
      webhookSecret,
      billingEmail,
    });
  });

  it('creates and confirms PromptPay PI and returns QR payload', async () => {
    create.mockResolvedValue({ id: 'pi_123' });
    confirm.mockResolvedValue({
      id: 'pi_123',
      next_action: {
        promptpay_display_qr_code: {
          image_url_png: 'https://example.com/qr.png',
          image_url_svg: 'https://example.com/qr.svg',
          hosted_instructions_url: 'https://example.com/pay',
        },
      },
    });

    const result = await adapter.createPromptPayIntent({
      tenantId: 't1',
      intentId: 'intent-1',
      amount: '100.00',
      currency: 'THB',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 10000,
        currency: 'thb',
        payment_method_types: ['promptpay'],
        metadata: expect.objectContaining({ mipIntentId: 'intent-1' }),
      }),
      expect.objectContaining({ idempotencyKey: expect.stringContaining('intent-1') }),
    );
    expect(result).toEqual({
      provider: 'stripe',
      providerRef: 'pi_123',
      qrPayload: {
        type: 'promptpay',
        provider: 'stripe',
        amount: '100.00',
        currency: 'THB',
        imageUrlPng: 'https://example.com/qr.png',
        imageUrlSvg: 'https://example.com/qr.svg',
        hostedInstructionsUrl: 'https://example.com/pay',
      },
    });
  });

  it('rejects amounts below 20.00 THB before calling Stripe', async () => {
    await expect(
      adapter.createPromptPayIntent({
        tenantId: 't1',
        intentId: 'intent-2',
        amount: '19.99',
        currency: 'THB',
      }),
    ).rejects.toThrow(/20/);
    expect(create).not.toHaveBeenCalled();
  });

  it('verifyWebhookSignature returns true when constructEvent succeeds', () => {
    constructEvent.mockReturnValue({ id: 'evt_1' });
    expect(
      adapter.verifyWebhookSignature(
        { 'stripe-signature': 'sig' },
        Buffer.from('{}'),
      ),
    ).toBe(true);
  });

  it('verifyWebhookSignature returns false when constructEvent throws', () => {
    constructEvent.mockImplementation(() => {
      throw new Error('bad sig');
    });
    expect(
      adapter.verifyWebhookSignature(
        { 'stripe-signature': 'sig' },
        Buffer.from('{}'),
      ),
    ).toBe(false);
  });

  it('parseWebhookEvent maps payment_intent.succeeded', () => {
    const raw = Buffer.from('{}');
    constructEvent.mockReturnValue({
      id: 'evt_ok',
      type: 'payment_intent.succeeded',
      data: {
        object: { id: 'pi_123', amount: 10000, amount_received: 10000, currency: 'thb' },
      },
    });
    expect(adapter.parseWebhookEvent(raw)).toEqual({
      providerEventId: 'evt_ok',
      providerRef: 'pi_123',
      amount: '100.00',
      status: 'SUCCEEDED',
    });
  });

  it('parseWebhookEvent maps payment_intent.payment_failed to FAILED', () => {
    constructEvent.mockReturnValue({
      id: 'evt_fail',
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_9', amount: 5000, currency: 'thb' } },
    });
    expect(adapter.parseWebhookEvent(Buffer.from('{}'))).toEqual({
      providerEventId: 'evt_fail',
      providerRef: 'pi_9',
      amount: '50.00',
      status: 'FAILED',
    });
  });
});
```

- [ ] **Step 3: Run tests — expect FAIL**

```bash
cd backend && npx jest src/common/payments/stripe-payment.adapter.spec.ts -v
```

Expected: FAIL (module/class missing)

- [ ] **Step 4: Implement adapter**

```typescript
import Stripe from 'stripe';
import { BadRequestException } from '@nestjs/common';
import {
  CreatePromptPayIntentInput,
  ParsedWebhookEvent,
  PaymentGatewayPort,
  PromptPayIntentResult,
} from './payment-gateway.port';

const PROMPTPAY_MIN_THB = '20.00';

export type StripePaymentAdapterDeps = {
  stripe: Stripe;
  webhookSecret: string;
  billingEmail: string;
};

export class StripePaymentAdapter implements PaymentGatewayPort {
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;
  private readonly billingEmail: string;
  private lastVerifiedEvent: Stripe.Event | null = null;

  constructor(deps: StripePaymentAdapterDeps) {
    this.stripe = deps.stripe;
    this.webhookSecret = deps.webhookSecret;
    this.billingEmail = deps.billingEmail;
  }

  async createPromptPayIntent(
    input: CreatePromptPayIntentInput,
  ): Promise<PromptPayIntentResult> {
    if (Number(input.amount) < Number(PROMPTPAY_MIN_THB)) {
      throw new BadRequestException(
        `Stripe PromptPay requires amount >= ${PROMPTPAY_MIN_THB} THB.`,
      );
    }
    const amountSatang = Math.round(Number(input.amount) * 100);
    if (!Number.isInteger(amountSatang) || amountSatang <= 0) {
      throw new BadRequestException('Invalid THB amount for Stripe PromptPay.');
    }

    const created = await this.stripe.paymentIntents.create(
      {
        amount: amountSatang,
        currency: 'thb',
        payment_method_types: ['promptpay'],
        metadata: {
          mipIntentId: input.intentId,
          tenantId: input.tenantId,
        },
      },
      { idempotencyKey: `mip-pi-create-${input.intentId}` },
    );

    const confirmed = await this.stripe.paymentIntents.confirm(
      created.id,
      {
        payment_method_data: {
          type: 'promptpay',
          billing_details: { email: this.billingEmail },
        },
      },
      { idempotencyKey: `mip-pi-confirm-${input.intentId}` },
    );

    const qr = confirmed.next_action?.promptpay_display_qr_code;
    if (!qr?.image_url_png) {
      throw new BadRequestException('Stripe PromptPay QR missing from next_action.');
    }

    return {
      provider: 'stripe',
      providerRef: confirmed.id,
      qrPayload: {
        type: 'promptpay',
        provider: 'stripe',
        amount: input.amount,
        currency: 'THB',
        imageUrlPng: qr.image_url_png,
        imageUrlSvg: qr.image_url_svg ?? null,
        hostedInstructionsUrl: qr.hosted_instructions_url ?? null,
      },
    };
  }

  verifyWebhookSignature(
    headers: Record<string, string>,
    rawBody: Buffer,
  ): boolean {
    const signature =
      headers['stripe-signature'] ?? headers['Stripe-Signature'] ?? '';
    if (!signature) {
      return false;
    }
    try {
      this.lastVerifiedEvent = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret,
      );
      return true;
    } catch {
      this.lastVerifiedEvent = null;
      return false;
    }
  }

  parseWebhookEvent(rawBody: Buffer): ParsedWebhookEvent {
    const event =
      this.lastVerifiedEvent ??
      (() => {
        throw new BadRequestException('Stripe event not verified.');
      })();
    // Prefer event from verify; ignore rawBody re-parse to avoid double construct without sig
    void rawBody;

    if (
      event.type !== 'payment_intent.succeeded' &&
      event.type !== 'payment_intent.payment_failed' &&
      event.type !== 'payment_intent.canceled'
    ) {
      throw new BadRequestException(`Unhandled Stripe event type: ${event.type}`);
    }

    const pi = event.data.object as Stripe.PaymentIntent;
    const satang = pi.amount_received || pi.amount;
    const amount = (satang / 100).toFixed(2);
    const status =
      event.type === 'payment_intent.succeeded' ? 'SUCCEEDED' : 'FAILED';

    return {
      providerEventId: event.id,
      providerRef: pi.id,
      amount,
      status,
    };
  }
}
```

**Note for implementer:** PaymentsService currently always calls `parseWebhookEvent` after verify. For ignored event types, prefer returning a parse that the service can no-op — **OR** catch `BadRequestException` in controller and return `{ ignored: true }` with 200. Spec says ignore unknown types with 200. Adjust adapter:

- Add `parseWebhookEvent` return type extension **or** throw a dedicated `IgnorableStripeEventError` caught in `PaymentsService.handleProviderWebhook` to return `{ ignored: true }` without allocate.

Minimal approach in service:

```typescript
try {
  event = this.gateway.parseWebhookEvent(rawBody);
} catch (e) {
  if (e instanceof IgnorableStripeEventError) {
    return { ignored: true, type: e.eventType };
  }
  throw e;
}
```

Export `IgnorableStripeEventError` from the stripe adapter file for non-succeeded/failed/canceled types after verify. For succeeded/failed/canceled, always parse.

- [ ] **Step 5: Run tests — expect PASS**

```bash
cd backend && npx jest src/common/payments/stripe-payment.adapter.spec.ts -v
```

- [ ] **Step 6: Commit**

```bash
git add backend/package.json backend/package-lock.json \
  backend/src/common/payments/stripe-payment.adapter.ts \
  backend/src/common/payments/stripe-payment.adapter.spec.ts
git commit -m "$(cat <<'EOF'
feat: add Stripe PromptPay payment gateway adapter

EOF
)"
```

---

### Task 3: Wire module factory

**Files:**
- Modify: `backend/src/common/payments/payments-gateway.module.ts`
- Create or extend: `backend/src/common/payments/payments-gateway.module.spec.ts` (optional small test)

- [ ] **Step 1: Update factory**

```typescript
import Stripe from 'stripe';
import { StripePaymentAdapter } from './stripe-payment.adapter';

// inside useFactory for PAYMENT_GATEWAY:
const provider = configService.get<string>('PAYMENT_PROVIDER', 'sandbox');
if (provider === 'sandbox') {
  return sandboxPaymentAdapter;
}
if (provider === 'stripe') {
  const stripe = new Stripe(configService.getOrThrow<string>('STRIPE_PRIVATE_KEY'), {
    apiVersion: '2025-02-24.acacia', // use the type default from installed stripe package
  });
  return new StripePaymentAdapter({
    stripe,
    webhookSecret: configService.getOrThrow<string>('STRIPE_WEBHOOK_SECRET'),
    billingEmail: configService.getOrThrow<string>('STRIPE_PROMPTPAY_BILLING_EMAIL'),
  });
}
throw new Error(`Unsupported PAYMENT_PROVIDER value: ${provider}`);
```

**Implementer note:** Set `apiVersion` to whatever the installed `stripe` package’s `LatestApiVersion` / docs recommend; do not invent a version — check `node_modules/stripe/types` or omit if constructor allows default.

- [ ] **Step 2: Smoke typecheck**

```bash
cd backend && npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/common/payments/payments-gateway.module.ts
git commit -m "$(cat <<'EOF'
feat: wire PAYMENT_PROVIDER=stripe to StripePaymentAdapter

EOF
)"
```

---

### Task 4: PaymentsService + webhook routes (TDD)

**Files:**
- Modify: `backend/src/payments/payments.service.ts`
- Modify: `backend/src/payments/payments.service.spec.ts`
- Modify: `backend/src/payments/webhooks.controller.ts`
- Modify: `backend/src/payments/webhooks.controller.spec.ts`

- [ ] **Step 1: Rename webhook handler (keep alias)**

In `payments.service.ts`:

```typescript
async handleProviderWebhook(
  rawBody: Buffer,
  headers: Record<string, string | string[] | undefined>,
): Promise<SandboxWebhookSummary | { ignored: true; type?: string }> {
  // same body as handleSandboxWebhook, but:
  // - error: 'Invalid payment webhook signature.'
  // - catch IgnorableStripeEventError → return { ignored: true, type }
}

/** @deprecated alias for sandbox route compatibility */
async handleSandboxWebhook(...args: Parameters<PaymentsService['handleProviderWebhook']>) {
  return this.handleProviderWebhook(...args);
}
```

Update all unit tests that assert `'Invalid sandbox webhook signature.'` to the new message (or accept either during transition).

- [ ] **Step 2: Initial intent provider from config**

Where createIntent inserts `provider: 'sandbox'`, use:

```typescript
provider: this.config.get<string>('PAYMENT_PROVIDER', 'sandbox'),
```

Inject `ConfigService` if not already present.

- [ ] **Step 3: WebhooksController**

```typescript
@Post('sandbox')
async handleSandboxWebhook(...) {
  // unchanged → payments.handleProviderWebhook
}

@Post('stripe')
async handleStripeWebhook(
  @Req() req: RawBodyRequest,
  @Headers() headers: ...,
) {
  if (!Buffer.isBuffer(req.rawBody)) {
    throw new BadRequestException('Raw webhook body is required.');
  }
  return this.payments.handleProviderWebhook(req.rawBody, headers);
}
```

- [ ] **Step 4: Controller test for stripe missing raw body**

Mirror existing sandbox test for `handleStripeWebhook`.

- [ ] **Step 5: Run unit suites**

```bash
cd backend && npx jest src/payments/payments.service.spec.ts src/payments/webhooks.controller.spec.ts src/common/payments/ -v
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/payments/payments.service.ts backend/src/payments/payments.service.spec.ts \
  backend/src/payments/webhooks.controller.ts backend/src/payments/webhooks.controller.spec.ts
git commit -m "$(cat <<'EOF'
feat: provider-agnostic payment webhooks including Stripe route

EOF
)"
```

---

### Task 5: Client QR display

**Files:**
- Modify: `apps/merchant-web/src/App.tsx`
- Modify: `apps/customer-mobile/lib/main.dart`
- Modify: `apps/customer-mobile/lib/lock/lock_screens.dart`
- Create: `apps/customer-mobile/lib/promptpay_qr.dart` (helper)
- Create: `apps/customer-mobile/test/promptpay_qr_test.dart`

- [ ] **Step 1: Flutter helper + failing test**

```dart
// promptpay_qr.dart
class PromptPayQrViewModel {
  const PromptPayQrViewModel({this.imageUrlPng, this.hostedInstructionsUrl, this.fallbackText});
  final String? imageUrlPng;
  final String? hostedInstructionsUrl;
  final String? fallbackText;

  static PromptPayQrViewModel fromPayload(Object? payload) {
    if (payload is Map) {
      final png = payload['imageUrlPng']?.toString();
      final url = payload['hostedInstructionsUrl']?.toString();
      if (png != null && png.isNotEmpty) {
        return PromptPayQrViewModel(imageUrlPng: png, hostedInstructionsUrl: url);
      }
      if (url != null && url.isNotEmpty) {
        return PromptPayQrViewModel(hostedInstructionsUrl: url);
      }
    }
    final text = payload?.toString();
    return PromptPayQrViewModel(fallbackText: text);
  }
}
```

Test: map with `imageUrlPng` → imageUrl set; string → fallbackText.

- [ ] **Step 2: Use helper in `lock_screens.dart` and `main.dart`**

- Prefer `Image.network(imageUrlPng)`  
- Else `Link`/`url_launcher` or display `hostedInstructionsUrl` text  
- Else existing `QrImageView` only if fallback looks like raw EMV string (sandbox object → show Text/json, do not QR-encode JSON object string if it breaks UX)

Sandbox today shows JSON text in main.dart — keep that for non-Stripe. For lock screen, if no image URL, show Text of payload instead of QrImageView on JSON.

- [ ] **Step 3: Merchant Web**

Where `qr` is shown:

```tsx
{qr && typeof qr === 'object' && qr !== null && 'imageUrlPng' in (qr as object) && (qr as { imageUrlPng?: string }).imageUrlPng ? (
  <img src={(qr as { imageUrlPng: string }).imageUrlPng} alt="PromptPay QR" width={240} height={240} />
) : qr ? (
  <pre className="mip-pre">{JSON.stringify(qr, null, 2)}</pre>
) : null}
```

Optionally also show `hostedInstructionsUrl` as `<a>`.

- [ ] **Step 4: Run Flutter tests**

```bash
cd apps/customer-mobile && flutter test test/promptpay_qr_test.dart
```

- [ ] **Step 5: Commit**

```bash
git add apps/merchant-web/src/App.tsx apps/customer-mobile/lib apps/customer-mobile/test
git commit -m "$(cat <<'EOF'
feat: display Stripe PromptPay QR image in merchant and customer apps

EOF
)"
```

---

### Task 6: Docs (D-066 + phase note)

**Files:**
- Modify: `docs/project-management/DECISION-LOG.md`
- Modify: `docs/roadmap/CURRENT-PHASE.md` (short lab note)
- Modify: `docs/superpowers/specs/2026-11-22-stripe-promptpay-sandbox-adapter-design.md` status → Approved

- [ ] **Step 1: Add D-066**

```markdown
| D-066 | 2026-11-22 | Lab optional `PAYMENT_PROVIDER=stripe` PromptPay adapter (test mode) behind PaymentGatewayPort; sandbox default; Omise remains PromptPay-primary (D-034) | Real Stripe QR + signed webhooks for lab without claiming Stripe as primary | Accepted (lab) |
```

- [ ] **Step 2: CURRENT-PHASE one-liner under Phase 4 / payments**

Note lab Stripe PromptPay adapter available when env set; live Omise still BLOCKED.

- [ ] **Step 3: Commit**

```bash
git add docs/project-management/DECISION-LOG.md docs/roadmap/CURRENT-PHASE.md \
  docs/superpowers/specs/2026-11-22-stripe-promptpay-sandbox-adapter-design.md
git commit -m "$(cat <<'EOF'
docs: record D-066 Stripe PromptPay lab adapter

EOF
)"
```

---

### Task 7: Manual lab verification checklist

- [ ] **Step 1: Configure local `.env` (do not commit)**

```bash
PAYMENT_PROVIDER=stripe
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_PRIVATE_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # from `stripe listen`
STRIPE_PROMPTPAY_BILLING_EMAIL=your@email.com
```

Enable PromptPay in Stripe Dashboard (test mode).

- [ ] **Step 2: Forward webhooks**

```bash
stripe listen --forward-to localhost:3000/api/v1/webhooks/payments/stripe
```

Copy `whsec_…` into `.env`, restart API.

- [ ] **Step 3: Create intent ≥ 20 THB via Merchant Web or Customer app → open hosted instructions / scan test QR → succeed**

- [ ] **Step 4: Confirm**

- Intent `SUCCEEDED`  
- Schedule `amountPaid` updated  
- Replay webhook → idempotent  
- Optional: outstanding 0 + LOCK → unlock command  

- [ ] **Step 5: Flip back**

`PAYMENT_PROVIDER=sandbox` — existing e2e/unit still pass:

```bash
cd backend && npm test -- --testPathPattern=payments
```

---

## Self-review (plan vs spec)

| Spec item | Task |
|-----------|------|
| Port provider union | Task 1 |
| Env keys + conditional require | Task 1 |
| StripePaymentAdapter create/confirm/QR | Task 2 |
| Webhook verify + parse + ignore | Task 2–4 |
| Module wiring | Task 3 |
| `/webhooks/payments/stripe` + sandbox kept | Task 4 |
| Allocate/unlock reuse | Task 4 (no new orchestrator) |
| Client QR image | Task 5 |
| D-066 / non-claim Omise primary | Task 6 |
| Manual lab CLI/Dashboard | Task 7 |
| Min 20 THB | Task 2 |
| Idempotent Stripe create keys | Task 2 |
| No secrets in git | Task 1 `.env.example` placeholders only |

No TBD placeholders left in task steps. Amount typing uses Decimal-safe string `"0.00"` end-to-end; satang conversion only at Stripe boundary.
