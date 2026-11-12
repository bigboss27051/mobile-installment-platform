import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { WebhooksController } from './webhooks.controller';

describe('WebhooksController', () => {
  const payments = {
    handleSandboxWebhook: jest.fn(),
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
});
