import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { formatCurrency } from '../constants/currency';
import { useAuth, Role } from '../context/AuthContext';
import {
  Box, Button, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Grid, Select, MenuItem, FormControl, InputLabel,
  Snackbar, Alert, CircularProgress, Chip,
} from '@mui/material';
import { PlayArrow as GenIcon, Lock as LockIcon, LockOpen as UnlockIcon, Download as DownloadIcon } from '@mui/icons-material';

const ss = {
  '& .MuiOutlinedInput-root': { color: 'var(--color-text-primary)', borderRadius: 'var(--radius-control)',
    '& fieldset': { borderColor: 'var(--color-border)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
    '&.Mui-focused fieldset': { borderColor: 'var(--color-primary)' },
  },
  '& .MuiInputLabel-root': { color: 'var(--color-text-secondary)' },
  '& .MuiInputLabel-root.Mui-focused': { color: 'var(--color-primary-hover)' },
};

const months = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(2000, i).toLocaleString('en', { month: 'long' }),
}));

const Payroll: React.FC = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const now = new Date();
  const [mo, setMo] = useState(now.getMonth() + 1);
  const [yr, setYr] = useState(now.getFullYear());
  const [note, setNote] = useState<{ open: boolean; msg: string; sev: 'success'|'error' } | null>(null);
  const canEdit = user && (user.role === Role.SUPER_ADMIN || user.role === Role.FINANCE);
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const { data: payrolls = [], isLoading } = useQuery(['payroll', mo, yr], async () => {
    const r = await api.get(`/payroll?month=${mo}&year=${yr}`);
    return r.data;
  });

  const genMut = useMutation(async () => (await api.post('/payroll', { month: mo, year: yr })).data, {
    onSuccess: () => { qc.invalidateQueries(['payroll']); qc.invalidateQueries(['dashboardData']); setNote({ open: true, msg: 'Payroll generated (DRAFT)!', sev: 'success' }); },
    onError: (e: any) => setNote({ open: true, msg: e.response?.data?.message || 'Generation failed', sev: 'error' }),
  });

  const stMut = useMutation(async (s: 'draft'|'completed') => (await api.put(`/payroll/status?month=${mo}&year=${yr}`, { status: s })).data, {
    onSuccess: (_, s) => { qc.invalidateQueries(['payroll']); qc.invalidateQueries(['dashboardData']); qc.invalidateQueries(['advances']); setNote({ open: true, msg: s === 'completed' ? 'Payroll locked & disbursed!' : 'Payroll unlocked to draft.', sev: 'success' }); },
    onError: (e: any) => setNote({ open: true, msg: e.response?.data?.message || 'Status update failed', sev: 'error' }),
  });

  const allDone = payrolls.length > 0 && payrolls.every((p: any) => p.status === 'completed');
  const hasDraft = payrolls.some((p: any) => p.status === 'draft');
  const sum = (key: string) => payrolls.reduce((s: number, p: any) => s + Number(p[key]), 0);

  const downloadCsv = async (url: string, filename: string) => {
    try {
      const res = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
      setNote({ open: true, msg: `${filename} downloaded successfully!`, sev: 'success' });
    } catch (err: any) {
      setNote({ open: true, msg: err.response?.data?.message || 'Download failed', sev: 'error' });
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)' }}>Payroll Calculation</Typography>
          <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mt: 0.5 }}>Generate, review, and finalize monthly payroll.</Typography>
        </Box>
        {canEdit && (
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            {allDone && <Button variant="outlined" startIcon={<UnlockIcon />} onClick={() => stMut.mutate('draft')} sx={{ borderColor: 'rgba(251,191,36,0.3)', color: 'var(--color-warning)', textTransform: 'none', borderRadius: 'var(--radius-control)' }}>Unlock</Button>}
            {hasDraft && <Button variant="outlined" startIcon={<LockIcon />} onClick={() => stMut.mutate('completed')} sx={{ borderColor: 'rgba(16,185,129,0.3)', color: 'var(--color-success)', textTransform: 'none', borderRadius: 'var(--radius-control)' }}>Lock & Disburse</Button>}
            <Button variant="contained" startIcon={<GenIcon />} onClick={() => genMut.mutate()} disabled={genMut.isLoading} sx={{ background: 'var(--color-primary)', boxShadow: '0 8px 18px rgba(99, 102, 241, 0.22)', borderRadius: 'var(--radius-control)', textTransform: 'none' }}>
              {genMut.isLoading ? 'Generating...' : 'Generate Payroll'}
            </Button>
          </Box>
        )}
      </Box>

      <Paper sx={{ background: 'var(--color-surface)',  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth sx={ss}><InputLabel sx={{ color: 'var(--color-text-secondary)' }}>Month</InputLabel>
              <Select value={mo} label="Month" onChange={e => setMo(e.target.value as number)}>
                {months.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth sx={ss}><InputLabel sx={{ color: 'var(--color-text-secondary)' }}>Year</InputLabel>
              <Select value={yr} label="Year" onChange={e => setYr(e.target.value as number)}>
                {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              disabled={payrolls.length === 0}
              onClick={() => downloadCsv(`/reports/payroll/csv?month=${mo}&year=${yr}`, `payroll_register_${mo}_${yr}.csv`)}
              sx={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
                textTransform: 'none',
                borderRadius: 'var(--radius-control)',
                '&:hover': {
                  borderColor: 'var(--color-border-strong)',
                  bgcolor: 'var(--color-surface-subtle)',
                  color: 'var(--color-text-primary)',
                },
              }}
            >
              Export Register
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              disabled={payrolls.length === 0}
              onClick={() => downloadCsv(`/reports/bank-transfer/csv?month=${mo}&year=${yr}`, `bank_transfer_${mo}_${yr}.csv`)}
              sx={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
                textTransform: 'none',
                borderRadius: 'var(--radius-control)',
                '&:hover': {
                  borderColor: 'var(--color-border-strong)',
                  bgcolor: 'var(--color-surface-subtle)',
                  color: 'var(--color-text-primary)',
                },
              }}
            >
              Export Bank Sheet
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {payrolls.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[{ l: 'Total Gross', v: sum('gross_salary'), c: 'var(--color-info)' }, { l: 'PF Deductions', v: sum('pf_deduction'), c: 'var(--color-accent)' }, { l: 'Tax Deductions', v: sum('tax_deduction'), c: 'var(--color-warning)' }, { l: 'Net Payable', v: sum('net_salary'), c: 'var(--color-success)' }].map(d => (
            <Grid item xs={6} md={3} key={d.l}>
              <Paper sx={{ p: 2.5, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>{d.l}</Typography>
                <Typography variant="h5" sx={{ color: d.c, fontWeight: 700, mt: 0.5, fontFamily: 'Outfit' }}>{formatCurrency(d.v)}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      <Paper sx={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', overflow: 'hidden', p: 3 }}>
        <TableContainer>
          <Table sx={{ minWidth: 900 }}>
            <TableHead sx={{ bgcolor: 'var(--color-surface-subtle)' }}>
              <TableRow>
                {['Emp Code','Name','Dept','Gross','Absence Ded.','PF','Tax','Advance Rec.','Net Salary','Status'].map(h => (
                  <TableCell key={h} align={['Gross','Absence Ded.','PF','Tax','Advance Rec.','Net Salary'].includes(h) ? 'right' : h === 'Status' ? 'center' : 'left'} sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={10} align="center" sx={{ py: 5 }}><CircularProgress size={30} sx={{ color: 'var(--color-primary)' }} /></TableCell></TableRow>
              : payrolls.length === 0 ? <TableRow><TableCell colSpan={10} align="center" sx={{ py: 5, color: 'var(--color-text-muted)' }}>No payroll data. {canEdit && 'Click "Generate Payroll" to start.'}</TableCell></TableRow>
              : payrolls.map((pr: any) => (
                <TableRow key={pr.id} sx={{ '&:hover': { bgcolor: 'var(--color-row-hover)' } }}>
                  <TableCell sx={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{pr.employee?.employee_code}</TableCell>
                  <TableCell sx={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{pr.employee?.name}</TableCell>
                  <TableCell sx={{ color: 'var(--color-text-primary)' }}>{pr.employee?.department}</TableCell>
                  <TableCell align="right" sx={{ color: 'var(--color-text-primary)' }}>{formatCurrency(pr.gross_salary)}</TableCell>
                  <TableCell align="right" sx={{ color: pr.non_payable_deduction > 0 ? 'var(--color-error)' : 'var(--color-text-muted)' }}>{pr.non_payable_deduction > 0 ? `-${formatCurrency(pr.non_payable_deduction)}` : '—'}</TableCell>
                  <TableCell align="right" sx={{ color: 'var(--color-accent)' }}>{formatCurrency(pr.pf_deduction)}</TableCell>
                  <TableCell align="right" sx={{ color: 'var(--color-warning)' }}>{formatCurrency(pr.tax_deduction)}</TableCell>
                  <TableCell align="right" sx={{ color: pr.advance_recovery > 0 ? '#fb923c' : 'var(--color-text-muted)' }}>{pr.advance_recovery > 0 ? formatCurrency(pr.advance_recovery) : '—'}</TableCell>
                  <TableCell align="right" sx={{ color: 'var(--color-success)', fontWeight: 700 }}>{formatCurrency(pr.net_salary)}</TableCell>
                  <TableCell align="center"><Chip label={pr.status === 'completed' ? 'Disbursed' : 'Draft'} size="small" sx={{ fontWeight: 700, fontSize: '0.72rem', bgcolor: pr.status === 'completed' ? 'rgba(16,185,129,0.15)' : 'rgba(251,191,36,0.15)', color: pr.status === 'completed' ? 'var(--color-success)' : 'var(--color-warning)' }} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Snackbar open={note?.open} autoHideDuration={6000} onClose={() => setNote(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setNote(null)} severity={note?.sev} sx={{ width: '100%' }}>{note?.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default Payroll;
