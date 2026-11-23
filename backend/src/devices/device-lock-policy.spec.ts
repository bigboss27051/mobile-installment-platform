import { DesiredPresentation } from '@prisma/client';
import {
  desiredFromOutstanding,
  unlockCommandsForDesired,
} from './device-lock-policy';

describe('device-lock-policy', () => {
  it('maps zero outstanding to NONE', () => {
    expect(desiredFromOutstanding('0.00')).toBe(DesiredPresentation.NONE);
    expect(desiredFromOutstanding(0)).toBe(DesiredPresentation.NONE);
  });

  it('keeps LOCK target when outstanding remains (Phase 4a no auto-step-down)', () => {
    expect(desiredFromOutstanding('1.00')).toBe(DesiredPresentation.LOCK);
  });

  it('maps current desired to stop commands', () => {
    expect(unlockCommandsForDesired(DesiredPresentation.LOCK)).toEqual([
      'STOP_LOCK_TASK',
    ]);
    expect(unlockCommandsForDesired(DesiredPresentation.RESTRICT)).toEqual([
      'STOP_PACKAGE_SUSPEND',
    ]);
    expect(unlockCommandsForDesired(DesiredPresentation.NONE)).toEqual([]);
  });
});
