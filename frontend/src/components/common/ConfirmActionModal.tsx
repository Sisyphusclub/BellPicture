import { AlertTriangle } from 'lucide-react';
import { useId } from 'react';

import { MorphicCardModal } from '@/components/premium/morphic-card-modal';
import { Button } from '@/components/ui/button';

interface ConfirmActionModalProps {
  id: string;
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  isPending?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmActionModal({
  id,
  open,
  title,
  description,
  confirmLabel,
  isPending = false,
  onClose,
  onConfirm,
}: ConfirmActionModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const close = (): void => {
    if (!isPending) onClose();
  };

  return (
    <MorphicCardModal
      id={`confirm-${id}`}
      open={open}
      onClose={close}
      className="confirm-action-modal"
    >
      <section
        className="confirm-action-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className="confirm-action-dialog__icon" aria-hidden="true">
          <AlertTriangle />
        </div>
        <div className="confirm-action-dialog__copy">
          <h2 id={titleId}>{title}</h2>
          <p id={descriptionId}>{description}</p>
        </div>
        <div className="confirm-action-dialog__actions">
          <Button type="button" variant="secondary" disabled={isPending} onClick={close}>
            取消
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={isPending}
            onClick={() => void onConfirm()}
          >
            {isPending ? '处理中' : confirmLabel}
          </Button>
        </div>
      </section>
    </MorphicCardModal>
  );
}
