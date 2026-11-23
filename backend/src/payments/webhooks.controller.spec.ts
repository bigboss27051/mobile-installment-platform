import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { WebhooksController } from './webhooks.controller';

describe('WebhooksController', () => {
  const payments = {
    handleSandboxWebhook: jest.fn(),
    handleProviderWebhook: jest.fn(),
  };
  const controller = new WebhooksController(
    payments as unknown as PaymentsService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('rejects sandbox webhooks when the raw body buffer is missing', async () => {
    const req = { body: { providerEventId: 'evt-1' } } as Request;

    await expect(
      controller.handleSandboxWebhook(req, { 'x-mip-signature': 'good' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(payments.handleSandboxWebhook).not.toHaveBeenCalled();
  });

  it('rejects stripe webhooks when the raw body buffer is missing', async () => {
    const req = { body: { id: 'evt_1' } } as Request;

    await expect(
      controller.handleStripeWebhook(req, { 'stripe-signature': 'sig' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(payments.handleProviderWebhook).not.toHaveBeenCalled();
  });

  it('forwards stripe webhooks with raw body to provider handler', async () => {
    const rawBody = Buffer.from('{"id":"evt_1"}');
    const req = { rawBody } as Request & { rawBody: Buffer };
    payments.handleProviderWebhook.mockResolvedValue({ ignored: true, type: 'x' });

    await controller.handleStripeWebhook(req, { 'stripe-signature': 'sig' });

    expect(payments.handleProviderWebhook).toHaveBeenCalledWith(rawBody, {
      'stripe-signature': 'sig',
    });
  });
});
