'use client';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import type { Currency } from '@auction/shared';
import { useFmt } from '@/lib/format';

/** Lime price that flashes when the value changes. */
export function Price({ value, currency, size = 'md', className }: { value: string | null | undefined; currency: Currency; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const fmt = useFmt();
  const [flash, setFlash] = useState(false);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value && prev.current !== undefined) { setFlash(true); const t = setTimeout(() => setFlash(false), 900); return () => clearTimeout(t); }
    prev.current = value;
  }, [value]);
  useEffect(() => { prev.current = value; }, [value]);
  return (
    <span className={clsx('num inline-block rounded-md px-1 text-lime', size === 'lg' && 'text-price', size === 'md' && 'text-price-md', size === 'sm' && 'text-price-sm', flash && 'animate-flash', className)}>
      {fmt.money(value, currency)}
    </span>
  );
}
