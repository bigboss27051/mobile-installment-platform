import { allocateTenantSlug } from './tenant-slug';

describe('allocateTenantSlug', () => {
  it('builds a lowercase slug from the tenant name and unique suffix', () => {
    expect(allocateTenantSlug('Payment Tenant A', 'Ab12Cd34')).toBe(
      'payment-tenant-a-ab12cd34',
    );
  });

  it('falls back when the name has no latin characters', () => {
    expect(allocateTenantSlug('ร้านค้า', 'deadbeef')).toBe('tenant-deadbeef');
  });
});
