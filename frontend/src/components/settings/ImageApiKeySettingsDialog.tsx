import { Eye, EyeOff, KeyRound, LoaderCircle, Trash2, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

import { MorphicCardModal } from '@/components/premium/morphic-card-modal';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useImageApiKey } from '@/hooks/useImageApiKey';

interface ImageApiKeySettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ImageApiKeySettingsDialog({ open, onClose }: ImageApiKeySettingsDialogProps) {
  const titleId = useId();
  const statusId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const { status, isLoading, isMutating, error, save, remove } = useImageApiKey();
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setApiKey('');
    setShowApiKey(false);
    setSuccess(null);
  }, [open]);

  const close = (): void => {
    if (!isMutating) onClose();
  };
  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const normalized = apiKey.trim();
    if (!normalized || isMutating) return;
    setSuccess(null);
    try {
      await save(normalized);
      setApiKey('');
      setShowApiKey(false);
      setSuccess('已验证并保存。');
    } catch {
      inputRef.current?.focus();
    }
  };
  const removeSavedKey = async (): Promise<void> => {
    if (!status?.configured || isMutating) return;
    setSuccess(null);
    try {
      await remove();
      setApiKey('');
      setSuccess('已移除，将使用平台额度。');
    } catch {
      // The shared hook exposes a localized error below.
    }
  };

  return (
    <MorphicCardModal
      id="image-api-key-settings"
      open={open}
      onClose={close}
      sharedLayout={false}
      className="image-api-key-modal-surface"
    >
      <section
        className="image-api-key-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={statusId}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="dialog__close"
          aria-label="关闭生图 API Key 设置"
          disabled={isMutating}
          onClick={close}
        >
          <X aria-hidden="true" />
        </Button>

        <div className="image-api-key-dialog__heading">
          <KeyRound aria-hidden="true" />
          <div>
            <h2 id={titleId}>生图 API Key</h2>
            <p id={statusId}>
              {isLoading
                ? '正在同步'
                : status?.configured
                  ? `已连接 · 尾号 ${status.keySuffix ?? '未知'}`
                  : '未配置 · 使用平台额度'}
            </p>
          </div>
        </div>

        <form className="image-api-key-form" onSubmit={(event) => void submit(event)}>
          <label htmlFor="image-api-key-input">sub2api Key</label>
          <span className="image-api-key-field">
            <Input
              ref={inputRef}
              id="image-api-key-input"
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              maxLength={4096}
              disabled={isLoading || isMutating}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="new-password"
              spellCheck={false}
              placeholder={status?.configured ? '输入新 Key 以替换' : 'sk-...'}
              onChange={(event) => {
                setApiKey(event.target.value);
                setSuccess(null);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={showApiKey ? '隐藏 API Key' : '显示 API Key'}
              disabled={isLoading || isMutating || apiKey.length === 0}
              onClick={() => setShowApiKey((current) => !current)}
            >
              {showApiKey ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </Button>
          </span>

          {error ? <Alert variant="destructive">{error.message}</Alert> : null}
          {success ? (
            <p className="image-api-key-dialog__success" role="status">
              {success}
            </p>
          ) : null}

          <div className="image-api-key-dialog__actions">
            {status?.configured ? (
              <Button
                type="button"
                variant="danger"
                disabled={isMutating}
                onClick={() => void removeSavedKey()}
              >
                <Trash2 aria-hidden="true" />
                移除 Key
              </Button>
            ) : null}
            <Button type="submit" disabled={isLoading || isMutating || apiKey.trim().length === 0}>
              {isMutating ? <LoaderCircle className="spin" aria-hidden="true" /> : null}
              {isMutating ? '正在验证' : status?.configured ? '验证并替换' : '验证并保存'}
            </Button>
          </div>
        </form>
      </section>
    </MorphicCardModal>
  );
}
