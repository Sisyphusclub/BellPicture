'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { CSSProperties, ReactNode } from 'react';
import { EASE_OUT } from '@/lib/ease';
import { cn } from '@/lib/utils';
import { type GalleryImage, IMAGE_GALLERY_IMAGES } from './image-gallery-data';

export type { GalleryImage } from './image-gallery-data';

export type ImageGalleryVerticalProps = {
  eyebrow?: string;
  title?: ReactNode;
  description?: string;
  images?: GalleryImage[];
  columnCount?: number;
  className?: string;
  onImageClick?: (image: GalleryImage) => void;
};

const DEFAULT_TITLE = (
  <>
    <span className="block">A living archive</span>
    <span className="block">of considered work</span>
  </>
);

type GalleryStyle = CSSProperties & {
  '--gallery-columns': number;
};

export function ImageGalleryVertical({
  eyebrow = 'Selected spaces',
  title = DEFAULT_TITLE,
  description = 'An image-led collection arranged with a quiet, considered rhythm',
  images = IMAGE_GALLERY_IMAGES,
  columnCount = 4,
  className,
  onImageClick,
}: ImageGalleryVerticalProps) {
  const reduceMotion = useReducedMotion();
  const galleryImages = images.length > 0 ? images : IMAGE_GALLERY_IMAGES;
  const hasHeader = Boolean(eyebrow || title || description);
  const resolvedColumnCount = Math.min(
    Math.max(2, Math.round(columnCount)),
    6,
    galleryImages.length,
  );
  const galleryStyle: GalleryStyle = {
    '--gallery-columns': resolvedColumnCount,
  };

  return (
    <section
      className={cn(
        'w-full overflow-hidden bg-background px-4 py-20 text-foreground sm:px-8 sm:py-24',
        className,
      )}
    >
      <div className="mx-auto w-full max-w-7xl">
        {hasHeader ? (
          <motion.header
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: reduceMotion ? 0 : 0.55, ease: EASE_OUT }}
            className="grid gap-6 border-border border-b pb-8 md:grid-cols-[1.2fr_0.8fr] md:items-end md:gap-16"
          >
            <div>
              {eyebrow ? (
                <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.16em]">
                  {eyebrow}
                </p>
              ) : null}
              {title ? (
                <h2 className="mt-5 max-w-3xl text-balance font-medium text-4xl leading-[1.02] tracking-[-0.045em]">
                  {title}
                </h2>
              ) : null}
            </div>
            {description ? (
              <p className="max-w-lg text-pretty text-muted-foreground leading-7 md:justify-self-end">
                {description}
              </p>
            ) : null}
          </motion.header>
        ) : null}

        <GalleryColumns
          images={galleryImages}
          onImageClick={onImageClick}
          hasHeader={hasHeader}
          className="columns-2 lg:[column-count:var(--gallery-columns)]"
          style={galleryStyle}
        />
      </div>
    </section>
  );
}

function GalleryColumns({
  images,
  onImageClick,
  hasHeader,
  className,
  style,
}: {
  images: GalleryImage[];
  onImageClick: ((image: GalleryImage) => void) | undefined;
  hasHeader: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn(
        hasHeader ? 'mt-5' : 'mt-0',
        'image-gallery-vertical__columns gap-2 sm:gap-3',
        className,
      )}
      style={style}
    >
      {images.map((image) => (
        <figure
          key={image.id}
          className="relative mb-2 break-inside-avoid overflow-hidden bg-muted sm:mb-3"
          style={{ aspectRatio: image.aspectRatio ?? 0.8 }}
        >
          {onImageClick ? (
            <button
              type="button"
              className="image-gallery-vertical__image-button"
              onClick={() => onImageClick(image)}
              aria-label={`查看图片：${image.alt}`}
            >
              <img
                src={image.src}
                alt={image.alt}
                width={900}
                height={1200}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          ) : (
            <img
              src={image.src}
              alt={image.alt}
              width={900}
              height={1200}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          )}
        </figure>
      ))}
    </div>
  );
}
