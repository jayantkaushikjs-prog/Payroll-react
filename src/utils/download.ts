import api from '../services/api';

export async function downloadCsvFile(url: string, filename: string): Promise<void> {
  const res = await api.get(url, { responseType: 'blob' });
  const blob = new Blob([res.data], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

