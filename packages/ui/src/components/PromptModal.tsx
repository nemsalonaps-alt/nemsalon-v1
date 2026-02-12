import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from '../button';

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  title: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  submitLabel?: string;
  cancelLabel?: string;
  required?: boolean;
}

export function PromptModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  label,
  placeholder,
  defaultValue = '',
  submitLabel = 'OK',
  cancelLabel = 'Annuller',
  required = false,
}: PromptModalProps) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (required && !value.trim()) {
      setError('Dette felt er påkrævet');
      return;
    }
    onSubmit(value);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <label htmlFor="prompt-input" style={{ display: 'block', fontWeight: 500 }}>
          {label}
        </label>
        <input
          id="prompt-input"
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError('');
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '10px 14px',
            border: error ? '1px solid var(--error)' : '1px solid var(--surface-border)',
            borderRadius: '8px',
            fontSize: '0.875rem',
            background: 'var(--surface)',
            color: 'var(--ink)',
          }}
          autoFocus
        />
        {error && <span style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{error}</span>}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <Button variant="ghost" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger';
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Bekræft',
  cancelLabel = 'Annuller',
  variant = 'primary',
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <p style={{ margin: 0, color: 'var(--ink-muted)' }}>{message}</p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
