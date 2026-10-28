'use client';
import { useLocale } from 'next-intl';
import { formatMoney, formatMoneyCompact, pickText, type Currency, type I18nText, type Locale } from '@auction/shared';

export function useFmt() {
  const locale = useLocale() as Locale;
  return {
    locale,
    money: (v: string | number | null | undefined, c: Currency) => formatMoney(v, c, locale),
    compact: (v: string | number | null | undefined, c: Currency) => formatMoneyCompact(v, c, locale),
    text: (t: I18nText | null | undefined) => pickText(t, locale),
    time: (iso: string) => new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: locale === 'en', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(iso)),
    dateTime: (iso: string) => new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: locale === 'en', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(iso)),
  };
}
