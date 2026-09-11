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
  const highResInputRef = useRef<HTMLInputElement>(null);
  const { status, isLoading, isMutating, error, save, remove } = useImageApiKey();
  const [apiKey, setApiKey] = useState('');
  const [highResApiKey, setHighResApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showHighResApiKey, setShowHighResApiKey] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setApiKey('');
    setHighResApiKey('');
    setShowApiKey(false);
    setShowHighResApiKey(false);
    setSuccess(null);
  }, [open]);

  const close = (): void => {
    if (!isMutating) onClose();
  };
  const submit = async (event: FormEvent, group: 'standard' | 'high-res'): Promise<void> => {
    event.preventDefault();
    const normalized = (group === 'high-res' ? highResApiKey : apiKey).trim();
    if (!normalized || isMutating) return;
    setSuccess(null);
    try {
      await (group === 'high-res' ? save(normalized, group) : save(normalized));
      if (group === 'high-res') {
        setHighResApiKey('');
        setShowHighResApiKey(false);
      } else {
        setApiKey('');
        setShowApiKey(false);
      }
      setSuccess(group === 'high-res' ? '2K/4K Key 已验证并保存。' : '已验证并保存。');
    } catch {
      (group === 'high-res' ? highResInputRef : inputRef).current?.focus();
    }
  };
  const removeSavedKey = async (group: 'standard' | 'high-res'): Promise<void> => {
    if ((group === 'high-res' ? !status?.highResConfigured : !status?.configured) || isMutating)
      return;
    setSuccess(null);
    try {
      await (group === 'high-res' ? remove(group) : remove());
      if (group === 'high-res') setHighResApiKey('');
      else setApiKey('');
      setSuccess(group === 'high-res' ? '2K/4K Key 已移除。' : '已移除，将使用平台额度。');
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

        {error ? <Alert variant="destructive">{error.message}</Alert> : null}
        {success ? (
          <p className="image-api-key-dialog__success" role="status">
            {success}
          </p>
        ) : null}

        <form className="image-api-key-form" onSubmit={(event) => void submit(event, 'standard')}>
          <span className="image-api-key-form__header">
            <label htmlFor="image-api-key-input">sub2api Key（1K 分组）</label>
            <small>{status?.configured ? `尾号 ${status.keySuffix ?? '未知'}` : '未配置'}</small>
          </span>
          <span className="image-api-key-field">
            <Input
              ref={inputRef}
              id="image-api-key-input"
              aria-label="sub2api Key"
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

          <div className="image-api-key-dialog__actions">
            {status?.configured ? (
              <Button
                type="button"
                variant="danger"
                disabled={isMutating}
                onClick={() => void removeSavedKey('standard')}
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
        <form className="image-api-key-form" onSubmit={(event) => void submit(event, 'high-res')}>
          <span className="image-api-key-form__header">
            <label htmlFor="high-res-image-api-key-input">2K/4K 分组 Key</label>
            <small>
              {status?.highResConfigured ? `尾号 ${status.highResKeySuffix ?? '未知'}` : '未配置'}
            </small>
          </span>
          <span className="image-api-key-field">
            <Input
              ref={highResInputRef}
              id="high-res-image-api-key-input"
              type={showHighResApiKey ? 'text' : 'password'}
              value={highResApiKey}
              maxLength={4096}
              disabled={isLoading || isMutating}
              placeholder={status?.highResConfigured ? '输入新 Key 以替换' : 'sk-...'}
              onChange={(event) => setHighResApiKey(event.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={showHighResApiKey ? '隐藏 2K/4K API Key' : '显示 2K/4K API Key'}
              disabled={isLoading || isMutating || highResApiKey.length === 0}
              onClick={() => setShowHighResApiKey((current) => !current)}
            >
              {showHighResApiKey ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </Button>
          </span>
          <div className="image-api-key-dialog__actions">
            {status?.highResConfigured ? (
              <Button
                type="button"
                variant="danger"
                disabled={isMutating}
                onClick={() => void removeSavedKey('high-res')}
              >
                移除 Key
              </Button>
            ) : null}
            <Button
              type="submit"
              disabled={isLoading || isMutating || highResApiKey.trim().length === 0}
            >
              {isMutating ? '正在验证' : status?.highResConfigured ? '验证并替换' : '验证并保存'}
            </Button>
          </div>
        </form>
      </section>
    </MorphicCardModal>
  );
}
