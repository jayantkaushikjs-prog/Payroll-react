export const CURRENCY_CONFIG = {
  locale: 'en-IN',
  currency: 'INR',
  symbol: '₹',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
} as const;

export const formatCurrency = (value: number | string | null | undefined): string => {
  const numericValue = Number(value ?? 0);

  return new Intl.NumberFormat(CURRENCY_CONFIG.locale, {
    style: 'currency',
    currency: CURRENCY_CONFIG.currency,
    maximumFractionDigits: CURRENCY_CONFIG.maximumFractionDigits,
    minimumFractionDigits: CURRENCY_CONFIG.minimumFractionDigits,
  }).format(Number.isFinite(numericValue) ? numericValue : 0);
};
