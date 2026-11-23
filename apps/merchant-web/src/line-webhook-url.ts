/** Public LINE webhook URL for a tenant (paste into LINE Developers console). */
export function buildLineWebhookUrl(apiOrigin: string, tenantId: string): string {
  const base = apiOrigin.replace(/\/$/, '');
  return `${base}/api/v1/webhooks/line/${tenantId}`;
}

export function resolveApiOrigin(windowOrigin: string, viteApiOrigin?: string): string {
  const fromEnv = viteApiOrigin?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return windowOrigin.replace(/\/$/, '');
}
