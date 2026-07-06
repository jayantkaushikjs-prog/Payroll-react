export const formatDateDDMMYYYY = (dateVal?: string | Date | null) => {
  if (!dateVal) return '-';
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return '-';
  const d = String(date.getUTCDate()).padStart(2, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const y = date.getUTCFullYear();
  return `${d}-${m}-${y}`;
};
