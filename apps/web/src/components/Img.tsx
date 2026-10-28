'use client';
import clsx from 'clsx';
import { useState } from 'react';
import { imageUrl } from '@/lib/api';

export function Img({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const url = imageUrl(src);
  if (!url || failed) return <div className={clsx('img-fallback', className)} role="img" aria-label={alt} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={clsx('object-cover', className)} onError={() => setFailed(true)} loading="lazy" />;
}
