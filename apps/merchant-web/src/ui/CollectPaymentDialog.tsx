import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { FormEvent } from 'react';
import type { CollectionMethod } from '../collect-payment';
import { Alert } from './Alert';
import { Button } from './Button';
import { FormField } from './FormField';
import { Input } from './Input';

export type CollectPaymentFormProps = {
  title: string;
  installmentLabel: string;
  amountLabel: string;
  amount: string;
  amountError: string | null;
  cashLabel: string;
  transferLabel: string;
  method: CollectionMethod | null;
  confirmLabel: string;
  cancelLabel: string;
  submitting: boolean;
  canConfirm: boolean;
  error: string | null;
  onAmountChange: (amount: string) => void;
  onMethodChange: (method: CollectionMethod) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export function CollectPaymentForm({
  title,
  installmentLabel,
  amountLabel,
  amount,
  amountError,
  cashLabel,
  transferLabel,
  method,
  confirmLabel,
  cancelLabel,
  submitting,
  canConfirm,
  error,
  onAmountChange,
  onMethodChange,
  onConfirm,
  onCancel,
}: CollectPaymentFormProps) {
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canConfirm) {
      return;
    }
    onConfirm();
  }

  return (
    <form onSubmit={submit}>
      <DialogTitle id="collect-payment-title">{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography id="collect-payment-installment">{installmentLabel}</Typography>
          <FormField label={amountLabel} htmlFor="collect-amount" required error={amountError ?? undefined}>
            <Input
              id="collect-amount"
              inputMode="decimal"
              value={amount}
              disabled={submitting}
              onChange={(event) => onAmountChange(event.target.value)}
            />
          </FormField>
          <Stack direction="row" spacing={1}>
            <Button
              type="button"
              variant={method === 'CASH' ? 'primary' : 'secondary'}
              aria-pressed={method === 'CASH'}
              disabled={submitting}
              onClick={() => onMethodChange('CASH')}
            >
              {cashLabel}
            </Button>
            <Button
              type="button"
              variant={method === 'TRANSFER' ? 'primary' : 'secondary'}
              aria-pressed={method === 'TRANSFER'}
              disabled={submitting}
              onClick={() => onMethodChange('TRANSFER')}
            >
              {transferLabel}
            </Button>
          </Stack>
          {error ? <Alert tone="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          {cancelLabel}
        </Button>
        <Button type="submit" variant="primary" loading={submitting} disabled={!canConfirm}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </form>
  );
}

export function CollectPaymentDialog(props: CollectPaymentFormProps) {
  return (
    <Dialog
      open
      onClose={props.submitting ? undefined : props.onCancel}
      aria-labelledby="collect-payment-title"
      aria-describedby="collect-payment-installment"
    >
      <CollectPaymentForm {...props} />
    </Dialog>
  );
}
