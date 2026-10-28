'use client';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

/** Shows "+30 GIÂY" for ~2 s whenever currentEndAt moves later while live. */
export function ExtensionBurst({ currentEndAt, extendByS, live }: { currentEndAt: string; extendByS: number; live: boolean }) {
  const t = useTranslations('common');
  const prev = useRef(currentEndAt);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (live && new Date(currentEndAt).getTime() > new Date(prev.current).getTime()) {
      setShow(true); const h = setTimeout(() => setShow(false), 1800); prev.current = currentEndAt; return () => clearTimeout(h);
    }
    prev.current = currentEndAt;
  }, [currentEndAt, live]);
  if (!show) return null;
  return <span className="chip animate-burst bg-ext/20 text-ext" role="status">{t('extended', { s: extendByS })}</span>;
}
