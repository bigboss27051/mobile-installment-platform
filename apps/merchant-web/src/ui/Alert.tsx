export function Alert({
  tone = 'info',
  children,
}: {
  tone?: 'error' | 'success' | 'info';
  children: React.ReactNode;
}) {
  return <div className={`mip-alert mip-alert--${tone}`} role="status">{children}</div>;
}