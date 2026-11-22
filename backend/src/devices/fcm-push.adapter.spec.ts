import { Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import * as firebaseApp from 'firebase-admin/app';
import * as firebaseMessaging from 'firebase-admin/messaging';
import { FcmPushAdapter, maskFcmTokenForLog } from './fcm-push.adapter';

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

const mockSend = jest.fn();

jest.mock('firebase-admin/app', () => ({
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({ name: '[DEFAULT]' })),
  initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
  cert: jest.fn((c: unknown) => c),
}));

jest.mock('firebase-admin/messaging', () => ({
  getMessaging: jest.fn(() => ({ send: mockSend })),
}));

describe('FcmPushAdapter', () => {
  const readFile = readFileSync as jest.MockedFunction<typeof readFileSync>;
  const getApps = firebaseApp.getApps as jest.Mock;
  const initializeApp = firebaseApp.initializeApp as jest.Mock;
  const getMessaging = firebaseMessaging.getMessaging as jest.Mock;

  const originalPath = process.env.FCM_SERVICE_ACCOUNT_PATH;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue('msg-id');
    getApps.mockReturnValue([]);
    getMessaging.mockReturnValue({ send: mockSend });
    if (originalPath === undefined) {
      delete process.env.FCM_SERVICE_ACCOUNT_PATH;
    } else {
      process.env.FCM_SERVICE_ACCOUNT_PATH = originalPath;
    }
  });

  afterAll(() => {
    if (originalPath === undefined) {
      delete process.env.FCM_SERVICE_ACCOUNT_PATH;
    } else {
      process.env.FCM_SERVICE_ACCOUNT_PATH = originalPath;
    }
  });

  it('masks FCM tokens for logs (prefix only)', () => {
    expect(maskFcmTokenForLog('abcdefghijklmnop')).toBe('abcdefgh…');
    expect(maskFcmTokenForLog('short')).toBe('short…');
    expect(maskFcmTokenForLog('  ')).toBe('(empty)');
  });

  it('sendPollNow is no-op when FCM_SERVICE_ACCOUNT_PATH unset', async () => {
    delete process.env.FCM_SERVICE_ACCOUNT_PATH;
    const adapter = new FcmPushAdapter();

    await expect(adapter.sendPollNow('device-fcm-token')).resolves.toBeUndefined();

    expect(readFile).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('sendPollNow is no-op for blank token even when path is set', async () => {
    process.env.FCM_SERVICE_ACCOUNT_PATH = '/tmp/fake-sa.json';
    readFile.mockReturnValue(
      JSON.stringify({ project_id: 'mip-dev', client_email: 'x@test' }),
    );
    const adapter = new FcmPushAdapter();

    await adapter.sendPollNow('   ');

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('sendPollNow calls messaging with data type POLL_NOW when initialized', async () => {
    process.env.FCM_SERVICE_ACCOUNT_PATH = '/tmp/fake-sa.json';
    readFile.mockReturnValue(
      JSON.stringify({ project_id: 'mip-dev', client_email: 'x@test' }),
    );
    const logSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    const adapter = new FcmPushAdapter();

    await adapter.sendPollNow('fcm-device-token-xyz');

    expect(initializeApp).toHaveBeenCalled();
    expect(getMessaging).toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalledWith({
      token: 'fcm-device-token-xyz',
      data: { type: 'POLL_NOW' },
    });
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('fcm-devi…'),
    );
    logSpy.mockRestore();
  });

  it('reuses existing firebase app when already initialized', async () => {
    process.env.FCM_SERVICE_ACCOUNT_PATH = '/tmp/fake-sa.json';
    readFile.mockReturnValue(
      JSON.stringify({ project_id: 'mip-dev', client_email: 'x@test' }),
    );
    getApps.mockReturnValue([{ name: '[DEFAULT]' }]);

    const adapter = new FcmPushAdapter();
    await adapter.sendPollNow('tok-one');

    expect(initializeApp).not.toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalled();
  });
});