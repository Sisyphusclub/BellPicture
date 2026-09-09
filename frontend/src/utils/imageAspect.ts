import {
  ASPECT_RATIOS,
  DEFAULT_ASPECT_RATIO,
  type AspectChoice,
  type AspectRatio,
} from '@/types/image';

const ASPECT_VALUES: Record<AspectRatio, number> = {
  '1:1': 1,
  '3:4': 3 / 4,
  '4:3': 4 / 3,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '2:3': 2 / 3,
  '3:2': 3 / 2,
};

export function closestAspectRatio(width: number, height: number): AspectRatio {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return DEFAULT_ASPECT_RATIO;
  }

  const value = width / height;
  return ASPECT_RATIOS.reduce((closest, candidate) =>
    Math.abs(ASPECT_VALUES[candidate] - value) < Math.abs(ASPECT_VALUES[closest] - value)
      ? candidate
      : closest,
  );
}

export async function resolveAspectChoice(
  aspect: AspectChoice,
  references: readonly File[] = [],
): Promise<AspectRatio> {
  if (aspect !== 'auto') return aspect;

  for (const reference of references) {
    const dimensions = await readImageDimensions(reference);
    if (dimensions) return closestAspectRatio(dimensions.width, dimensions.height);
  }
  return DEFAULT_ASPECT_RATIO;
}

async function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  if (typeof createImageBitmap !== 'function') return null;

  try {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  } catch {
    return null;
  }
}
