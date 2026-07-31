import { useCallback, useState } from 'react';

export function useControllableString({
  value,
  defaultValue,
  onChange,
}: {
  value?: string | undefined;
  defaultValue: string;
  onChange?: ((value: string) => void) | undefined;
}) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const currentValue = value ?? internalValue;

  const setValue = useCallback(
    (next: string) => {
      if (!isControlled) {
        setInternalValue(next);
      }

      onChange?.(next);
    },
    [isControlled, onChange],
  );

  return [currentValue, setValue] as const;
}

export function useControllableArray<T>({
  value,
  defaultValue,
  onChange,
}: {
  value?: readonly T[] | undefined;
  defaultValue: readonly T[];
  onChange?: ((value: T[]) => void) | undefined;
}) {
  const [internalValue, setInternalValue] = useState<T[]>([...defaultValue]);
  const isControlled = value !== undefined;
  const currentValue = value ?? internalValue;

  const setValue = useCallback(
    (next: T[]) => {
      if (!isControlled) {
        setInternalValue([...next]);
      }

      onChange?.([...next]);
    },
    [isControlled, onChange],
  );

  return [currentValue, setValue] as const;
}
