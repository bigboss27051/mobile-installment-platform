export function allocateTenantSlug(name: string, uniquePart: string): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'tenant';
  const suffix = uniquePart.replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase();
  return `${base}-${suffix || 'shop'}`;
}
