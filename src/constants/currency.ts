export const CURRENCY_CONFIG = {
  locale: 'en-IN',
  currency: 'INR',
  symbol: '₹',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
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

export const formatCurrencyCrores = (value: number | string | null | undefined): string => {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue)) return '₹0';

  const sign = numericValue < 0 ? '-' : '';
  const formattedValue = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(Math.abs(numericValue));

  return `${sign}₹${formattedValue}`;
};
