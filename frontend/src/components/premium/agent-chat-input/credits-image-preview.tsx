'use client';

import { X } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SPRING_SWAP } from '@/lib/ease';
import type { AgentChatAttachment } from './types';

export function CreditsImagePreview({
  attachment,
  src,
  reduce,
  onClose,
}: {
  attachment?: AgentChatAttachment | undefined;
  src?: string | undefined;
  reduce?: boolean | null | undefined;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!attachment || !src) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [attachment, onClose, src]);

  if (!attachment || !src || typeof document === 'undefined') return null;

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${attachment.name}`}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduce ? {} : { opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative flex max-h-[90vh] max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#111]"
        initial={reduce ? false : { opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={reduce ? {} : { opacity: 0, scale: 0.97 }}
        transition={reduce ? { duration: 0 } : SPRING_SWAP}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close image preview"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 grid size-9 place-items-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-md transition-colors hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X className="size-4" />
        </button>
        {/* biome-ignore lint/performance/noImgElement: blob and consumer URLs are not compatible with next/image. */}
        <img src={src} alt={attachment.name} className="max-h-[82vh] max-w-full object-contain" />
        <p className="border-white/10 border-t px-4 py-3 text-sm text-white/75">
          {attachment.name}
        </p>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
