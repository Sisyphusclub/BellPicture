'use client';

import { Plus } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useId } from 'react';

import { Button } from '@/components/ui/button';
import { EASE_OUT } from '@/lib/ease';
import { cn } from '@/lib/utils';

const CABINET_PATHS = [
  'M88 58 174 12l91 54-87 47Z',
  'm88 58 90 55v153l-90-53Z',
  'm178 113 87-47v151l-87 49Z',
  'm95 217-10 6v17l13 8',
  'm246 227 12-7v16l-12 7Z',
  'm88 72 90 54 87-47',
  'm88 136 90 54 87-48',
] as const;

const DRAWER_PATHS = [
  'm106 139 72 43 69-38-70-42Z',
  'm106 139 71 43v72l-71-42Z',
  'm177 182 70-38v70l-70 40Z',
] as const;

const DETAIL_PATHS = [
  'm126 175 21 12 14-8',
  'm118 159 22 13 14-8',
  'm119 91 23 14 15-8-23-14Z',
  'm126 118 21 13 14-8',
] as const;

export interface EmptyStateArchiveProps {
  className?: string;
  onAction: () => void;
}

export function EmptyStateArchive({ className, onAction }: EmptyStateArchiveProps) {
  const headingId = useId();
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <section
      className={cn('asset-archive-empty', className)}
      aria-labelledby={headingId}
      data-beui-empty-state="archive"
    >
      <motion.div
        aria-hidden="true"
        className="asset-archive-empty__art"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover="hover"
        transition={{ duration: reduceMotion ? 0 : 0.5, ease: EASE_OUT }}
      >
        <svg viewBox="0 0 320 300" role="presentation">
          <g
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
          >
            {CABINET_PATHS.map((path, index) => (
              <motion.path
                key={path}
                d={path}
                initial={reduceMotion ? false : { opacity: 0, pathLength: 0 }}
                animate={{ opacity: 1, pathLength: 1 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.62,
                  delay: reduceMotion ? 0 : index * 0.045,
                  ease: EASE_OUT,
                }}
              />
            ))}
          </g>

          <motion.g
            fill="var(--background)"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
            initial={reduceMotion ? false : { opacity: 0, x: 22, y: -14 }}
            animate={{ opacity: 1, x: -18, y: 13 }}
            variants={{ hover: reduceMotion ? { x: -18, y: 13 } : { x: -28, y: 19 } }}
            transition={{ duration: reduceMotion ? 0 : 0.56, ease: EASE_OUT }}
            style={{ transformBox: 'fill-box', transformOrigin: '50% 50%' }}
          >
            {DRAWER_PATHS.map((path) => (
              <path key={path} d={path} />
            ))}
            <path d="m118 145 59 35 57-31-59-35Z" opacity="0.45" />
          </motion.g>

          <motion.g
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: reduceMotion ? 0 : 0.36,
              delay: reduceMotion ? 0 : 0.28,
              ease: EASE_OUT,
            }}
          >
            {DETAIL_PATHS.map((path) => (
              <path key={path} d={path} />
            ))}
          </motion.g>
        </svg>
      </motion.div>

      <motion.div
        className="asset-archive-empty__content"
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: reduceMotion ? 0 : 0.42,
          delay: reduceMotion ? 0 : 0.18,
          ease: EASE_OUT,
        }}
      >
        <h2 id={headingId}>还没有资产</h2>
        <p>完成第一次创作后，生成结果会保存在这里。</p>
        <Button type="button" size="compact" onClick={onAction}>
          <Plus aria-hidden="true" />
          开始创作
        </Button>
      </motion.div>
    </section>
  );
}
