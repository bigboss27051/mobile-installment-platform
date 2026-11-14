export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="mip-spinner-row" role="status" aria-live="polite">
      <span className="mip-spinner" aria-hidden />
      <span>{label}</span>
    </div>
  );
}