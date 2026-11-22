import { FormEvent, useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import { ApiError, apiRequest, apiUpload } from './api';
import { useI18n } from './i18n-context';
import { Button, FormField, Input, Section, Select, Spinner } from './ui';
import { MIP_TOKENS } from './ui/theme';

const DOC_TYPES = ['ID_FRONT', 'ID_BACK', 'SELFIE', 'OTHER'] as const;

type KycSummary = {
  id: string;
  customerId: string;
  status: string;
};

type KycDetail = KycSummary & {
  documents: { id: string; type: string }[];
};

export function KycPanel({
  customerId,
  customerName,
  onError,
  apiError,
  onUpdated,
}: {
  customerId: string;
  customerName: string;
  onError: (message: string | null) => void;
  apiError: (message: string) => string;
  onUpdated: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [kycCase, setKycCase] = useState<KycDetail | null>(null);
  const [docType, setDocType] = useState<(typeof DOC_TYPES)[number]>('ID_FRONT');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try {
      const cases = await apiRequest<KycSummary[]>('/api/v1/kyc-cases');
      const latest = cases.find((item) => item.customerId === customerId) ?? null;
      if (!latest) {
        setKycCase(null);
        onError(null);
        return;
      }
      setKycCase(await apiRequest<KycDetail>(`/api/v1/kyc-cases/${latest.id}`));
      onError(null);
    } catch (err) {
      onError(err instanceof ApiError ? apiError(err.message) : t('kyc.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [customerId]);

  const status = kycCase?.status ?? 'NONE';
  const canEdit = status === 'DRAFT' || status === 'NEEDS_RESUBMIT';
  const canSend = (canEdit && (kycCase?.documents.length ?? 0) > 0) || status === 'SUBMITTED';
  const canApprove = status === 'IN_REVIEW';
  const canStart = status === 'NONE' || status === 'REJECTED';

  async function startCase() {
    try {
      await apiRequest(`/api/v1/customers/${customerId}/kyc-cases`, { method: 'POST' });
      onError(null);
    } catch (err) {
      onError(err instanceof ApiError ? apiError(err.message) : t('common.actionFailed'));
    } finally {
      await reload();
      await onUpdated();
    }
  }

  async function upload(event: FormEvent) {
    event.preventDefault();
    if (!kycCase || !file) {
      onError(t('kyc.needFile'));
      return;
    }
    try {
      const body = new FormData();
      body.set('type', docType);
      body.set('file', file);
      await apiUpload(`/api/v1/kyc-cases/${kycCase.id}/documents`, body);
      setFile(null);
      onError(null);
    } catch (err) {
      onError(err instanceof ApiError ? apiError(err.message) : t('common.actionFailed'));
    } finally {
      await reload();
      await onUpdated();
    }
  }

  async function sendForReview() {
    if (!kycCase) {
      return;
    }
    if (canEdit && kycCase.documents.length === 0) {
      onError(t('kyc.needDocument'));
      return;
    }
    try {
      if (canEdit) {
        await apiRequest(`/api/v1/kyc-cases/${kycCase.id}/submit`, { method: 'POST' });
      }
      await apiRequest(`/api/v1/kyc-cases/${kycCase.id}/ocr`, { method: 'POST' });
      onError(null);
    } catch (err) {
      onError(err instanceof ApiError ? apiError(err.message) : t('common.actionFailed'));
    } finally {
      await reload();
      await onUpdated();
    }
  }

  async function approve() {
    if (!kycCase) {
      return;
    }
    try {
      await apiRequest(`/api/v1/kyc-cases/${kycCase.id}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision: 'APPROVE', reason: t('kyc.approveReason') }),
      });
      onError(null);
    } catch (err) {
      onError(err instanceof ApiError ? apiError(err.message) : t('common.actionFailed'));
    } finally {
      await reload();
      await onUpdated();
    }
  }

  return (
    <Section title={t('kyc.title', { name: customerName })}>
      <p>{t('kyc.hint')}</p>
      <p>{t(`kyc.status.${status}`)}</p>
      {loading ? <Spinner /> : null}
      {!loading && canStart ? (
        <Button type="button" variant="primary" onClick={() => void startCase()}>
          {t('kyc.start')}
        </Button>
      ) : null}
      {!loading && canEdit ? (
        <Stack
          component="form"
          spacing={2}
          sx={{ maxWidth: MIP_TOKENS.formMax }}
          onSubmit={(event) => void upload(event)}
        >
          <FormField label={t('kyc.docType')} htmlFor="kyc-doc-type">
            <Select
              id="kyc-doc-type"
              value={docType}
              onChange={(event) =>
                setDocType(event.target.value as (typeof DOC_TYPES)[number])
              }
            >
              {DOC_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`kyc.doc.${type}`)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t('kyc.file')} htmlFor="kyc-file" required>
            <Input
              id="kyc-file"
              type="file"
              accept="image/*,.pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </FormField>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
            <Button type="submit" variant="secondary">
              {t('kyc.upload')}
            </Button>
          </Stack>
        </Stack>
      ) : null}
      <p>{t('kyc.documents')}</p>
      {(kycCase?.documents.length ?? 0) === 0 ? (
        <p>{t('kyc.noDocuments')}</p>
      ) : (
        <ul>
          {kycCase?.documents.map((document) => (
            <li key={document.id}>{t(`kyc.doc.${document.type}`)}</li>
          ))}
        </ul>
      )}
      {!loading && canSend ? (
        <Button type="button" variant="secondary" onClick={() => void sendForReview()}>
          {t('kyc.submit')}
        </Button>
      ) : null}
      {!loading && canApprove ? (
        <Button type="button" variant="primary" onClick={() => void approve()}>
          {t('kyc.approve')}
        </Button>
      ) : null}
    </Section>
  );
}
