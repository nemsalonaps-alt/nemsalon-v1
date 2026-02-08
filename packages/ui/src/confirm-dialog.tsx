import { useEffect, useState } from 'react';

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  showReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  reasonRequired?: boolean;
  onConfirm: () => void;
  onConfirmWithReason?: (reason: string) => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  showReason = false,
  reasonLabel = 'Reason',
  reasonPlaceholder = '',
  reasonRequired = false,
  onConfirm,
  onConfirmWithReason,
  onCancel
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  if (!open) return null;

  const canConfirm = !showReason || !reasonRequired || reason.trim().length > 0;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <h3>{title}</h3>
        <p className="muted">{body}</p>
        {showReason && (
          <label className="field" style={{ marginTop: 12 }}>
            <span className="label">{reasonLabel}</span>
            <textarea
              className="textarea"
              rows={3}
              value={reason}
              onChange={(event) => setReason((event.target as HTMLTextAreaElement).value)}
              placeholder={reasonPlaceholder}
            />
          </label>
        )}
        <div className="modal-actions">
          <button className="btn ghost" type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className="btn primary"
            type="button"
            onClick={() => {
              if (showReason && onConfirmWithReason) {
                onConfirmWithReason(reason.trim());
              } else {
                onConfirm();
              }
            }}
            disabled={!canConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
