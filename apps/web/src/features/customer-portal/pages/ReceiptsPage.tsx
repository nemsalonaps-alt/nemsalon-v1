import { useState, useEffect, useCallback } from 'react';
import { formatDate, formatPrice } from '@nemsalon/shared';
import { Card, Button, Badge, Stack } from '@nemsalon/ui';
import { ErrorState } from '@nemsalon/ui';
import { getCopy, getStoredLocale, resolveLocale } from '../../../i18n';
import { listMyReceipts, downloadReceiptPdf, type Receipt } from '../api';
import { SkeletonReceipt } from '../components/Skeletons';
import '../portal.css';

const t = getCopy();

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: 'Kort',
  mobilepay: 'MobilePay',
  cash: 'Kontant',
  giftcard: 'Gavekort',
};

function getPaymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'succeeded':
      return 'success';
    case 'pending':
      return 'warning';
    case 'failed':
      return 'error';
    default:
      return 'default';
  }
}

export function ReceiptsPage() {
  const resolvedLocale = resolveLocale(getStoredLocale());
  const locale = resolvedLocale === 'da' ? 'da-DK' : 'en-US';

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const result = await listMyReceipts();

      if (cancelled) return;

      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }

      setReceipts(result.data);
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDownloadPdf = useCallback(async (receiptId: string) => {
    setDownloadingId(receiptId);

    const result = await downloadReceiptPdf(receiptId);

    if (!result.ok) {
      setError(result.error);
      setDownloadingId(null);
      return;
    }

    if (result.data.pdfUrl) {
      window.open(result.data.pdfUrl, '_blank');
    }

    setDownloadingId(null);
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    listMyReceipts().then((result) => {
      if (!result.ok) {
        setError(result.error);
      } else {
        setReceipts(result.data);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="cp-page-container">
        <section className="cp-section">
          <div className="cp-section-header">
            <h2 className="cp-section-title">
              {t.customerPortal.receipts?.title ?? 'Kvitteringer'}
            </h2>
            <p className="cp-section-subtitle">
              {t.customerPortal.receipts?.subtitle ?? 'Se og download dine kvitteringer'}
            </p>
          </div>
          <Stack gap="md">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonReceipt key={i} />
            ))}
          </Stack>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cp-page-container">
        <ErrorState
          title={t.customerPortal.receipts?.errorTitle ?? 'Kunne ikke indlæse kvitteringer'}
          message={error}
          action={<Button onClick={handleRetry}>{t.customerPortal.retry}</Button>}
        />
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <div className="cp-page-container">
        <Card className="cp-empty-state">
          <div className="cp-empty-icon">🧾</div>
          <h2 className="cp-empty-title">
            {t.customerPortal.receipts?.emptyTitle ?? 'Ingen kvitteringer endnu'}
          </h2>
          <p className="cp-muted">
            {t.customerPortal.receipts?.emptyDesc ?? 'Dine kvitteringer vises her efter betaling.'}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="cp-page-container">
      <section className="cp-section">
        <div className="cp-section-header">
          <h2 className="cp-section-title">{t.customerPortal.receipts?.title ?? 'Kvitteringer'}</h2>
          <p className="cp-section-subtitle">
            {t.customerPortal.receipts?.subtitle ?? 'Se og download dine kvitteringer'}
          </p>
        </div>

        <Stack gap="md">
          {receipts.map((receipt) => (
            <Card
              key={receipt.id}
              className="cp-receipt-card"
              onClick={() => setSelectedReceipt(receipt)}
            >
              <Stack direction="row" justify="between" align="start">
                <div className="cp-receipt-info">
                  <div className="cp-receipt-salon">{receipt.salonName}</div>
                  <div className="cp-receipt-service">{receipt.serviceName}</div>
                  <div className="cp-receipt-meta">
                    {receipt.paidAt && formatDate(receipt.paidAt, { locale })}
                    {' · '}
                    {getPaymentMethodLabel(receipt.paymentMethod)}
                  </div>
                </div>
                <div className="cp-receipt-amount">
                  <div className="cp-receipt-price">
                    {formatPrice(receipt.amount, receipt.currency, locale)}
                  </div>
                  <Badge variant={getStatusVariant(receipt.paymentStatus)} size="sm">
                    {receipt.paymentStatus === 'succeeded' ? 'Betalt' : receipt.paymentStatus}
                  </Badge>
                </div>
              </Stack>

              <div className="cp-receipt-footer">
                <span className="cp-receipt-number">{receipt.receiptNumber}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  isLoading={downloadingId === receipt.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDownloadPdf(receipt.id);
                  }}
                >
                  {t.customerPortal.receipts?.downloadPdf ?? 'Download PDF'}
                </Button>
              </div>
            </Card>
          ))}
        </Stack>
      </section>

      {selectedReceipt && (
        <div className="cp-modal-overlay" onClick={() => setSelectedReceipt(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <Card className="cp-modal cp-modal-lg">
              <div className="cp-receipt-detail">
                <div className="cp-receipt-header">
                  <h3>{selectedReceipt.salonName}</h3>
                  <p className="cp-muted">{selectedReceipt.serviceName}</p>
                </div>

                <div className="cp-receipt-rows">
                  <div className="cp-receipt-row">
                    <span>{t.customerPortal.receipts?.dateLabel ?? 'Dato'}</span>
                    <span>
                      {selectedReceipt.paidAt && formatDate(selectedReceipt.paidAt, { locale })}
                    </span>
                  </div>
                  <div className="cp-receipt-row">
                    <span>{t.customerPortal.receipts?.methodLabel ?? 'Betalingsmetode'}</span>
                    <span>{getPaymentMethodLabel(selectedReceipt.paymentMethod)}</span>
                  </div>
                  <div className="cp-receipt-row">
                    <span>{t.customerPortal.receipts?.numberLabel ?? 'Kvitteringsnummer'}</span>
                    <span>{selectedReceipt.receiptNumber}</span>
                  </div>
                  <div className="cp-receipt-row cp-receipt-divider">
                    <span>{t.customerPortal.receipts?.amountLabel ?? 'Beløb'}</span>
                    <span>
                      {formatPrice(selectedReceipt.amount, selectedReceipt.currency, locale)}
                    </span>
                  </div>
                  <div className="cp-receipt-row">
                    <span>
                      {t.customerPortal.receipts?.vatLabel ?? 'Moms'} ({selectedReceipt.vatRate}%)
                    </span>
                    <span>
                      {formatPrice(selectedReceipt.vatAmount, selectedReceipt.currency, locale)}
                    </span>
                  </div>
                  <div className="cp-receipt-row cp-receipt-total">
                    <span>{t.customerPortal.receipts?.totalLabel ?? 'Total'}</span>
                    <span>
                      {formatPrice(
                        selectedReceipt.amount + selectedReceipt.vatAmount,
                        selectedReceipt.currency,
                        locale,
                      )}
                    </span>
                  </div>
                </div>

                <div className="cp-receipt-actions">
                  <Button
                    variant="primary"
                    fullWidth
                    isLoading={downloadingId === selectedReceipt.id}
                    onClick={() => void handleDownloadPdf(selectedReceipt.id)}
                  >
                    {t.customerPortal.receipts?.downloadPdf ?? 'Download PDF'}
                  </Button>
                  <Button variant="secondary" onClick={() => setSelectedReceipt(null)} fullWidth>
                    {t.customerPortal.close ?? 'Luk'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
