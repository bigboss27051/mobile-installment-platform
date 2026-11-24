import { nextContractNumber } from './contract-number';

describe('nextContractNumber', () => {
  it('starts at C000001 when the shop has no contracts', () => {
    expect(nextContractNumber(null)).toBe('C000001');
    expect(nextContractNumber(undefined)).toBe('C000001');
  });

  it('increments a zero-padded contract number', () => {
    expect(nextContractNumber('C000001')).toBe('C000002');
    expect(nextContractNumber('C000099')).toBe('C000100');
  });

  it('does not treat a UUID as a contract number', () => {
    expect(nextContractNumber('11111111-1111-4111-8111-111111111111')).toBe('C000001');
  });
});
