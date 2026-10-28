/** "Nguyen" -> "Ng***n"; keeps first 2 and last char. Used for public bidder names. */
export function maskName(name: string): string {
  const s = (name ?? '').trim();
  if (s.length <= 2) return s[0] ? `${s[0]}***` : '***';
  return `${s.slice(0, 2)}***${s.slice(-1)}`;
}

export function pickText(t: { vi: string; en?: string } | null | undefined, locale: 'vi' | 'en'): string {
  if (!t) return '';
  return (locale === 'en' && t.en) ? t.en : t.vi;
}
