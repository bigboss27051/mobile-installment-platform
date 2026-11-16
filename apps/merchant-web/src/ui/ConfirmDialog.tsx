import { useEffect } from 'react';
import { Button } from './Button';

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCancel();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="mip-dialog-backdrop" onClick={onCancel}>
      <div
        className="mip-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="mip-dialog-title"
        aria-describedby="mip-dialog-body"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="mip-dialog-title" className="mip-dialog__title">
          {title}
        </h2>
        <p id="mip-dialog-body" className="mip-dialog__body">
          {body}
        </p>
        <div className="mip-form-actions">
          <Button type="button" variant="secondary" autoFocus onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
