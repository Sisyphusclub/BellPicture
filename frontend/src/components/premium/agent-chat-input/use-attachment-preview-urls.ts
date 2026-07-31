'use client';

import { useEffect, useState } from 'react';
import { isImageAttachment } from './attachment-utils';
import type { AgentChatAttachment } from './types';

export function useAttachmentPreviewUrls(attachments: readonly AgentChatAttachment[]) {
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const objectUrls: string[] = [];
    const nextPreviewUrls: Record<string, string> = {};

    for (const attachment of attachments) {
      if (!isImageAttachment(attachment)) {
        continue;
      }

      if (attachment.url) {
        nextPreviewUrls[attachment.id] = attachment.url;
        continue;
      }

      if (attachment.file) {
        const objectUrl = URL.createObjectURL(attachment.file);
        nextPreviewUrls[attachment.id] = objectUrl;
        objectUrls.push(objectUrl);
      }
    }

    setPreviewUrls(nextPreviewUrls);

    return () => {
      for (const objectUrl of objectUrls) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [attachments]);

  return previewUrls;
}
