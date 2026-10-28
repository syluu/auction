import type { Currency, Locale } from './types';

const localeTag = (l: Locale) => (l === 'vi' ? 'vi-VN' : 'en-US');

export function formatMoney(amount: string | number | null | undefined, currency: Currency, locale: Locale): string {
  if (amount === null || amount === undefined || amount === '') return '—';
  return new Intl.NumberFormat(localeTag(locale), {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'VND' ? 0 : 2,
    minimumFractionDigits: currency === 'VND' ? 0 : 2,
  }).format(Number(amount));
}

/** Compact form for tight UI: 24.500.000 ₫ -> "24,5tr" (vi) / "24.5M" (en). USD unchanged. */
export function formatMoneyCompact(amount: string | number | null | undefined, currency: Currency, locale: Locale): string {
  if (amount === null || amount === undefined || amount === '') return '—';
  const n = Number(amount);
  if (currency === 'USD') return formatMoney(n, currency, locale);
  const fmt = (v: number) => new Intl.NumberFormat(localeTag(locale), { maximumFractionDigits: 1 }).format(v);
  if (Math.abs(n) >= 1_000_000_000) return `${fmt(n / 1_000_000_000)}${locale === 'vi' ? ' tỷ' : 'B'}`;
  if (Math.abs(n) >= 1_000_000) return `${fmt(n / 1_000_000)}${locale === 'vi' ? 'tr' : 'M'}`;
  if (Math.abs(n) >= 1_000) return `${fmt(n / 1_000)}${locale === 'vi' ? 'k' : 'K'}`;
  return fmt(n);
}

/**
 * Parse a user-typed amount. Accepts thousand separators ("24.500.000", "24,500,000"),
 * and Vietnamese shorthand: "25tr" / "25 triệu" = 25,000,000; "2k" = 2,000; "1 tỷ" = 1e9.
 * Returns a plain decimal string or null when unparsable.
 */
export function parseMoneyInput(raw: string, currency: Currency): string | null {
  let s = raw.trim().toLowerCase().replace(/[₫$\s]/g, '');
  if (!s) return null;
  let mult = 1;
  const m = s.match(/^(.*?)(tỷ|ty|b|tr|triệu|trieu|m|k|nghìn|ngan|ngàn)$/);
  if (m) {
    s = m[1];
    const u = m[2];
    mult = u === 'tỷ' || u === 'ty' || u === 'b' ? 1e9 : u === 'tr' || u === 'triệu' || u === 'trieu' || u === 'm' ? 1e6 : 1e3;
  }
  if (currency === 'VND') {
    // separators are thousand separators; a trailing ",5" with a unit means decimals ("24,5tr")
    if (mult > 1) s = s.replace(',', '.');
    else s = s.replace(/[.,]/g, '');
  } else {
    s = s.replace(/,/g, '');
  }
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const value = Number(s) * mult;
  if (!Number.isFinite(value) || value <= 0) return null;
  return currency === 'VND' ? String(Math.round(value)) : value.toFixed(2);
}

/** Minimum allowed next bid. */
export function minNextBid(currentPrice: string | null, startPrice: string, stepPrice: string): string {
  if (currentPrice === null) return startPrice;
  return (Number(currentPrice) + Number(stepPrice)).toFixed(2).replace(/\.00$/, '');
}
