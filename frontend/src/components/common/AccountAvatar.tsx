import { useState } from 'react';

import { cn } from '@/lib/utils';

interface AccountAvatarProps {
  className?: string;
  image: string | null | undefined;
  name: string;
}

function getAccountInitial(name: string): string {
  return Array.from(name.trim())[0]?.toLocaleUpperCase() ?? 'N';
}

export function AccountAvatar({ className, image, name }: AccountAvatarProps) {
  const imageSource = image?.trim() || null;
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const showImage = imageSource !== null && imageSource !== failedImage;

  return (
    <span className={cn('user-avatar', className)} aria-hidden="true">
      {showImage ? (
        <img
          className="user-avatar__image"
          src={imageSource}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailedImage(imageSource)}
        />
      ) : (
        <span className="user-avatar__fallback">{getAccountInitial(name)}</span>
      )}
    </span>
  );
}
