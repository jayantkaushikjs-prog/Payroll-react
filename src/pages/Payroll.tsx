import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { formatCurrency } from '../constants/currency';
import { useAuth, Role } from '../context/AuthContext';
import { downloadCsvFile } from '../utils/download';
import {
  Box, Button, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Grid, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Chip,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Tooltip, IconButton, Divider,
} from '@mui/material';
import { PlayArrow as GenIcon, Lock as LockIcon, LockOpen as UnlockIcon, Download as DownloadIcon, Payments as DisburseIcon, HelpOutline as HelpOutlineIcon, ArrowUpward, ArrowDownward, UnfoldMore, ExpandMore, ChevronRight } from '@mui/icons-material';
import { useToast } from '../context/ToastContext';

const ss = {
  '& .MuiOutlinedInput-root': { color: 'var(--color-text-primary)', borderRadius: 'var(--radius-control)',
    '& fieldset': { borderColor: 'var(--color-border)' },
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
  const { showToast } = useToast();
  const qc = useQueryClient();
  const now = new Date();
  const [mo, setMo] = useState(now.getMonth() + 1);
  const [yr, setYr] = useState(now.getFullYear());
  const [disburseOpen, setDisburseOpen] = useState(false);
  const [selectedTaxBreakdown, setSelectedTaxBreakdown] = useState<any>(null);
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' | 'none' }>({ field: '', direction: 'none' });
  const [expandedTile, setExpandedTile] = useState<'gross' | 'deductions' | 'net' | null>(null);
  
  const canEdit = user && (user.role === Role.SUPER_ADMIN || user.role === Role.FINANCE);
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const { data: payrolls = [], isLoading } = useQuery(['payroll', mo, yr], async () => {
    const r = await api.get(`/payroll?month=${mo}&year=${yr}`);
    return r.data;
  });

  const genMut = useMutation(async () => (await api.post('/payroll', { month: mo, year: yr })).data, {
    onSuccess: () => { qc.invalidateQueries(['payroll']); qc.invalidateQueries(['dashboardData']); showToast('Payroll generated (DRAFT)!', 'success'); },
    onError: (e: any) => showToast(e.response?.data?.message || 'Generation failed', 'error'),
  });

  const stMut = useMutation(async (s: 'draft'|'locked'|'disbursed') => (await api.put(`/payroll/status?month=${mo}&year=${yr}`, { status: s })).data, {
    onSuccess: (_, s) => {
      qc.invalidateQueries(['payroll']);
      qc.invalidateQueries(['dashboardData']);
      qc.invalidateQueries(['advances']);
      let msg = '';
      if (s === 'locked') msg = 'Payroll locked successfully!';
      else if (s === 'disbursed') msg = 'Payroll disbursed successfully!';
      else msg = 'Payroll unlocked to draft.';
      showToast(msg, 'success');
    },
    onError: (e: any) => showToast(e.response?.data?.message || 'Status update failed', 'error'),
  });

  const allDisbursed = payrolls.length > 0 && payrolls.every((p: any) => p.status === 'disbursed');
  const allLocked = payrolls.length > 0 && payrolls.every((p: any) => p.status === 'locked' || p.status === 'disbursed');
  const hasDraft = payrolls.some((p: any) => p.status === 'draft');
  const sum = (key: string) => payrolls.reduce((s: number, p: any) => s + Number(p[key]), 0);
  const sumByField = (field: string) => payrolls.reduce((s: number, p: any) => s + Number(getPayrollValue(p, field) || 0), 0);

  const getPayrollValue = (pr: any, field: string) => {
    switch (field) {
      case 'employee_code': return pr.employee?.employee_code || '';
      case 'name': return pr.employee?.name || '';
      case 'department': return pr.employee?.department || '';
      case 'basic': return Number(pr.tax_breakdown_json?.basic ?? pr.tax_breakdown_json?.basicSalary ?? 0);
      case 'hra': return Number(pr.tax_breakdown_json?.hra ?? 0);
      case 'others': return Number(pr.tax_breakdown_json?.othersAllowance ?? Math.max(0, Number(pr.gross_salary) - (Number(pr.tax_breakdown_json?.basic ?? pr.tax_breakdown_json?.basicSalary ?? 0)) - (Number(pr.tax_breakdown_json?.hra ?? 0))));
      case 'bonus': return Number(pr.tax_breakdown_json?.bonus ?? 0);
      case 'encash': return Number(pr.tax_breakdown_json?.leaveEncashment ?? 0);
      case 'gross': return Number(pr.tax_breakdown_json?.gross ?? pr.gross_salary ?? 0);
      case 'absent': return Number(pr.non_payable_deduction ?? 0);
      case 'late': return Number(pr.tax_breakdown_json?.lateArrivalDeduction ?? 0);
      case 'employer_pf': return Number(pr.tax_breakdown_json?.employerPf ?? 0);
      case 'employer_esi': return Number(pr.tax_breakdown_json?.employerEsi ?? 0);
      case 'pf': return Number(pr.pf_deduction ?? 0);
      case 'esi': return Number(pr.tax_breakdown_json?.employeeEsi ?? 0);
      case 'pt': return Number(pr.tax_breakdown_json?.professionalTax ?? 0);
      case 'tax': return Number(pr.tax_deduction ?? 0);
      case 'damages': return Number(pr.tax_breakdown_json?.damages ?? 0);
      case 'other_ded': return Number(pr.tax_breakdown_json?.otherDeductions ?? 0);
      case 'advance': return Number(pr.advance_recovery ?? 0);
      case 'net': return Number(pr.net_salary ?? 0);
      case 'status': return pr.status || '';
      default: return '';
    }
  };

  const totalDeductionsValue = React.useMemo(() => 
    sumByField('absent') + sumByField('late') + sumByField('pf') + sumByField('esi') + 
    sumByField('pt') + sumByField('tax') + sumByField('damages') + sumByField('other_ded') + sumByField('advance'), 
  [payrolls, sumByField]);

  const sortedPayrolls = React.useMemo(() => {
    if (!sortConfig.field || sortConfig.direction === 'none') return payrolls;
    const sorted = [...payrolls].sort((a, b) => {
      const aValue = getPayrollValue(a, sortConfig.field);
      const bValue = getPayrollValue(b, sortConfig.field);
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      const left = String(aValue).toLowerCase();
      const right = String(bValue).toLowerCase();
      return sortConfig.direction === 'asc' ? left.localeCompare(right) : right.localeCompare(left);
    });
    return sorted;
  }, [payrolls, sortConfig]);

  const handleSort = (field: string) => {
    setSortConfig((prev) => {
      if (prev.field === field) {
        if (prev.direction === 'asc') return { field, direction: 'desc' };
        if (prev.direction === 'desc') return { field: '', direction: 'none' };
      }
      return { field, direction: 'asc' };
    });
  };

  const downloadCsv = async (url: string, filename: string) => {
    try {
      await downloadCsvFile(url, filename);
      showToast(`${filename} downloaded successfully!`, 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Download failed', 'error');
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
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            {!allDisbursed ? (
              <>
                <Button
                  variant="outlined"
                  startIcon={<UnlockIcon />}
                  onClick={() => stMut.mutate('draft')}
                  disabled={!allLocked || stMut.isLoading}
                  sx={{
                    borderColor: 'rgba(251,191,36,0.3)',
                    color: 'var(--color-warning)',
                    textTransform: 'none',
                    borderRadius: 'var(--radius-control)',
                    '&.Mui-disabled': { borderColor: 'rgba(251,191,36,0.1)', color: 'rgba(251,191,36,0.4)' }
                  }}
                >
                  Unlock
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<LockIcon />}
                  onClick={() => stMut.mutate('locked')}
                  disabled={!hasDraft || stMut.isLoading}
                  sx={{
                    borderColor: 'rgba(16,185,129,0.3)',
                    color: 'var(--color-success)',
                    textTransform: 'none',
                    borderRadius: 'var(--radius-control)',
                    '&.Mui-disabled': { borderColor: 'rgba(16,185,129,0.1)', color: 'rgba(16,185,129,0.4)' }
                  }}
                >
                  Lock
                </Button>
                <Button
                  variant="contained"
                  startIcon={<DisburseIcon />}
                  onClick={() => setDisburseOpen(true)}
                  disabled={!allLocked || stMut.isLoading}
                  sx={{
                    background: 'var(--color-success)',
                    '&:hover': { background: 'var(--color-success-hover)' },
                    boxShadow: '0 8px 18px rgba(16, 185, 129, 0.22)',
                    borderRadius: 'var(--radius-control)',
                    textTransform: 'none',
                    '&.Mui-disabled': { background: 'rgba(16,185,129,0.1)', color: 'rgba(255,255,255,0.3)', boxShadow: 'none' }
                  }}
                >
                  Disburse
                </Button>
                <Button
                  variant="contained"
                  startIcon={<GenIcon />}
                  onClick={() => genMut.mutate()}
                  disabled={genMut.isLoading || allLocked}
                  sx={{
                    background: 'var(--color-primary)',
                    boxShadow: '0 8px 18px rgba(99, 102, 241, 0.22)',
                    borderRadius: 'var(--radius-control)',
                    textTransform: 'none'
                  }}
                >
                  {genMut.isLoading ? 'Generating...' : hasDraft ? 'Regenerate Payroll' : 'Generate Payroll'}
                </Button>
              </>
            ) : (
              <Chip
                label="Payroll Disbursed"
                color="success"
                variant="filled"
                sx={{
                  fontWeight: 'bold',
                  bgcolor: 'rgba(16,185,129,0.25)',
                  color: 'var(--color-success)',
                  border: '1px solid var(--color-success)'
                }}
              />
            )}
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

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2.2, borderRadius: '16px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Total Gross</Typography>
                <Typography variant="h6" sx={{ color: 'var(--color-text-primary)', fontWeight: 700, mt: 0.5 }}>{formatCurrency(sum('gross_salary'))}</Typography>
              </Box>
              <IconButton size="small" onClick={() => setExpandedTile(expandedTile === 'gross' ? null : 'gross')} sx={{ color: 'var(--color-text-secondary)', p: 0.25 }}>
                {expandedTile === 'gross' ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
              </IconButton>
            </Box>
            {expandedTile === 'gross' && (
              <Box sx={{ mt: 1.2, display: 'grid', gap: 0.7 }}>
                {[
                  { label: 'Basic', value: sumByField('basic') },
                  { label: 'HRA', value: sumByField('hra') },
                  { label: 'Others', value: sumByField('others') },
                  { label: 'Bonus', value: sumByField('bonus') },
                  { label: 'Encash', value: sumByField('encash') },
                ].map((item) => (
                  <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                    <span>{item.label}</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{formatCurrency(item.value)}</span>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2.2, borderRadius: '16px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Total Deductions</Typography>
                <Typography variant="h6" sx={{ color: 'var(--color-error)', fontWeight: 700, mt: 0.5 }}>{formatCurrency(totalDeductionsValue)}</Typography>
              </Box>
              <IconButton size="small" onClick={() => setExpandedTile(expandedTile === 'deductions' ? null : 'deductions')} sx={{ color: 'var(--color-text-secondary)', p: 0.25 }}>
                {expandedTile === 'deductions' ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
              </IconButton>
            </Box>
            {expandedTile === 'deductions' && (
              <Box sx={{ mt: 1.2, display: 'grid', gap: 0.7 }}>
                {[
                  { label: 'Absent', value: sumByField('absent') },
                  { label: 'Late Ded', value: sumByField('late') },
                  { label: 'PF', value: sumByField('pf') },
                  { label: 'ESI', value: sumByField('esi') },
                  { label: 'PT', value: sumByField('pt') },
                  { label: 'Tax/TDS', value: sumByField('tax') },
                  { label: 'Damages', value: sumByField('damages') },
                  { label: 'Other Ded', value: sumByField('other_ded') },
                  { label: 'Advance Rec.', value: sumByField('advance') },
                ].map((item) => (
                  <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                    <span>{item.label}</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-error)' }}>{formatCurrency(item.value)}</span>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2.2, borderRadius: '16px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Net Payroll</Typography>
                <Typography variant="h6" sx={{ color: 'var(--color-success)', fontWeight: 700, mt: 0.5 }}>{formatCurrency(sum('net_salary'))}</Typography>
              </Box>
              <IconButton size="small" onClick={() => setExpandedTile(expandedTile === 'net' ? null : 'net')} sx={{ color: 'var(--color-text-secondary)', p: 0.25 }}>
                {expandedTile === 'net' ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
              </IconButton>
            </Box>
            {expandedTile === 'net' && (
              <Box sx={{ mt: 1.2, display: 'grid', gap: 0.7 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  <span>Gross</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{formatCurrency(sum('gross_salary'))}</span>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  <span>Deductions</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-error)' }}>{formatCurrency(totalDeductionsValue)}</span>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2.2, borderRadius: '16px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
            <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Processed Employees</Typography>
            <Typography variant="h6" sx={{ color: 'var(--color-info)', fontWeight: 700, mt: 0.5 }}>{payrolls.length}</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', overflow: 'hidden', p: 3 }}>
        <TableContainer>
          <Table sx={{ minWidth: 900 }}>
            <TableHead sx={{ bgcolor: 'var(--color-surface-subtle)' }}>
              <TableRow>
                {[
                  { label: 'Emp Code', field: 'employee_code' },
                  { label: 'Name', field: 'name' },
                  { label: 'Dept', field: 'department' },
                  { label: 'Basic', field: 'basic' },
                  { label: 'HRA', field: 'hra' },
                  { label: 'Others', field: 'others' },
                  { label: 'Bonus', field: 'bonus' },
                  { label: 'Encash', field: 'encash' },
                  { label: 'Gross (A)', field: 'gross' },
                  { label: 'Absent', field: 'absent' },
                  { label: 'Late Ded', field: 'late' },
                  { label: 'Empr PF', field: 'employer_pf' },
                  { label: 'Empr ESI', field: 'employer_esi' },
                  { label: 'Emp PF', field: 'pf' },
                  { label: 'Emp ESI', field: 'esi' },
                  { label: 'PT', field: 'pt' },
                  { label: 'Tax/TDS', field: 'tax' },
                  { label: 'Damages', field: 'damages' },
                  { label: 'Other Ded', field: 'other_ded' },
                  { label: 'Advance Rec.', field: 'advance' },
                  { label: 'Net (A−B)', field: 'net' },
                  { label: 'Status', field: 'status' },
                ].map((header) => (
                  <TableCell key={header.label} align={['basic','hra','others','bonus','encash','gross','absent','late','employer_pf','employer_esi','pf','esi','pt','tax','damages','other_ded','advance','net'].includes(header.field) ? 'right' : header.field === 'status' ? 'center' : 'left'} sx={{ color: 'var(--color-text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: ['basic','hra','others','bonus','encash','gross','absent','late','employer_pf','employer_esi','pf','esi','pt','tax','damages','other_ded','advance','net'].includes(header.field) ? 'flex-end' : header.field === 'status' ? 'center' : 'flex-start', gap: 0.5 }}>
                      <span>{header.label}</span>
                      <IconButton size="small" onClick={() => handleSort(header.field)} sx={{ color: sortConfig.field === header.field ? 'var(--color-primary)' : 'var(--color-text-muted)', p: 0.25 }}>
                        {sortConfig.field !== header.field ? <UnfoldMore fontSize="small" /> : sortConfig.direction === 'asc' ? <ArrowUpward fontSize="small" /> : sortConfig.direction === 'desc' ? <ArrowDownward fontSize="small" /> : <UnfoldMore fontSize="small" />}
                      </IconButton>
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={20} align="center" sx={{ py: 5 }}><CircularProgress size={30} sx={{ color: 'var(--color-primary)' }} /></TableCell></TableRow>
              : payrolls.length === 0 ? <TableRow><TableCell colSpan={20} align="center" sx={{ py: 5, color: 'var(--color-text-muted)' }}>No payroll data. {canEdit && 'Click "Generate Payroll" to start.'}</TableCell></TableRow>
              : sortedPayrolls.map((pr: any) => {
                const basic = Number(pr.tax_breakdown_json?.basic ?? pr.tax_breakdown_json?.basicSalary ?? 0);
                const hra = Number(pr.tax_breakdown_json?.hra ?? (basic * 0.4).toFixed(2));
                const others = Number(pr.tax_breakdown_json?.othersAllowance ?? Math.max(0, Number(pr.gross_salary) - basic - hra));
                const bonus = Number(pr.tax_breakdown_json?.bonus ?? 0);
                const encash = Number(pr.tax_breakdown_json?.leaveEncashment ?? 0);
                const employeeEsi = Number(pr.tax_breakdown_json?.employeeEsi ?? 0);
                const pt = Number(pr.tax_breakdown_json?.professionalTax ?? 0);
                const lateDed = Number(pr.tax_breakdown_json?.lateArrivalDeduction ?? 0);
                const damages = Number(pr.tax_breakdown_json?.damages ?? 0);
                const otherDed = Number(pr.tax_breakdown_json?.otherDeductions ?? 0);
                return (
                <TableRow key={pr.id} sx={{ '&:hover': { bgcolor: 'var(--color-row-hover)' } }}>
                  <TableCell sx={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{pr.employee?.employee_code}</TableCell>
                  <TableCell sx={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{pr.employee?.name}</TableCell>
                  <TableCell sx={{ color: 'var(--color-text-primary)' }}>{pr.employee?.department}</TableCell>
                  <TableCell align="right" sx={{ color: 'var(--color-text-primary)' }}>{formatCurrency(basic)}</TableCell>
                  <TableCell align="right" sx={{ color: 'var(--color-text-primary)' }}>{formatCurrency(hra)}</TableCell>
                  <TableCell align="right" sx={{ color: 'var(--color-text-secondary)' }}>{others > 0 ? formatCurrency(others) : '—'}</TableCell>
                  <TableCell align="right" sx={{ color: 'var(--color-success)' }}>{bonus > 0 ? formatCurrency(bonus) : '—'}</TableCell>
                  <TableCell align="right" sx={{ color: 'var(--color-success)' }}>{encash > 0 ? formatCurrency(encash) : '—'}</TableCell>
                  <TableCell align="right" sx={{ color: 'var(--color-info)', fontWeight: 600 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      {formatCurrency(pr.gross_salary)}
                      <Tooltip title="Gross (A) = Basic + HRA + Others Allowance" arrow>
                        <IconButton size="small" sx={{ p: 0.2, ml: 0.5, color: 'var(--color-text-secondary)', '& svg': { fontSize: '0.85rem' } }}><HelpOutlineIcon /></IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ color: pr.non_payable_deduction > 0 ? 'var(--color-error)' : 'var(--color-text-muted)' }}>{pr.non_payable_deduction > 0 ? `-${formatCurrency(pr.non_payable_deduction)}` : '—'}</TableCell>
                  <TableCell align="right" sx={{ color: lateDed > 0 ? 'var(--color-error)' : 'var(--color-text-muted)' }}>{lateDed > 0 ? `-${formatCurrency(lateDed)}` : '—'}</TableCell>
                  <TableCell align="right" sx={{ color: 'var(--color-info)' }}>{Number(pr.tax_breakdown_json?.employerPf) > 0 ? formatCurrency(pr.tax_breakdown_json?.employerPf) : '—'}</TableCell>
                  <TableCell align="right" sx={{ color: 'var(--color-info)' }}>{Number(pr.tax_breakdown_json?.employerEsi) > 0 ? formatCurrency(pr.tax_breakdown_json?.employerEsi) : '—'}</TableCell>
                  <TableCell align="right" sx={{ color: 'var(--color-accent)' }}>{formatCurrency(pr.pf_deduction)}</TableCell>
                  <TableCell align="right" sx={{ color: 'var(--color-accent)' }}>{employeeEsi > 0 ? formatCurrency(employeeEsi) : '—'}</TableCell>
                  <TableCell align="right" sx={{ color: 'var(--color-accent)' }}>{pt > 0 ? formatCurrency(pt) : '—'}</TableCell>
                  <TableCell align="right" sx={{ color: 'var(--color-warning)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      {formatCurrency(pr.tax_deduction)}
                      <Tooltip title="Click to view Income Tax calculation breakdown" arrow>
                        <IconButton size="small" onClick={() => setSelectedTaxBreakdown(pr)} sx={{ p: 0.2, ml: 0.5, color: 'var(--color-text-secondary)', '& svg': { fontSize: '0.85rem' } }}><HelpOutlineIcon /></IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ color: damages > 0 ? 'var(--color-error)' : 'var(--color-text-muted)' }}>{damages > 0 ? `-${formatCurrency(damages)}` : '—'}</TableCell>
                  <TableCell align="right" sx={{ color: otherDed > 0 ? 'var(--color-error)' : 'var(--color-text-muted)' }}>{otherDed > 0 ? `-${formatCurrency(otherDed)}` : '—'}</TableCell>
                  <TableCell align="right" sx={{ color: pr.advance_recovery > 0 ? '#fb923c' : 'var(--color-text-muted)' }}>{pr.advance_recovery > 0 ? formatCurrency(pr.advance_recovery) : '—'}</TableCell>
                  <TableCell align="right" sx={{ color: 'var(--color-success)', fontWeight: 700 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      {formatCurrency(pr.net_salary)}
                      <Tooltip title={`Net = Total Earnings (${formatCurrency(Number(pr.gross_salary) + bonus + encash)}) − Total Deductions`} arrow>
                        <IconButton size="small" sx={{ p: 0.2, ml: 0.5, color: 'var(--color-text-secondary)', '& svg': { fontSize: '0.85rem' } }}><HelpOutlineIcon /></IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={pr.status === 'disbursed' ? 'Disbursed' : pr.status === 'locked' ? 'Locked' : 'Draft'} size="small"
                      sx={{ fontWeight: 700, fontSize: '0.72rem',
                        bgcolor: pr.status === 'disbursed' ? 'rgba(16,185,129,0.15)' : pr.status === 'locked' ? 'rgba(99,102,241,0.15)' : 'rgba(251,191,36,0.15)',
                        color: pr.status === 'disbursed' ? 'var(--color-success)' : pr.status === 'locked' ? 'var(--color-primary)' : 'var(--color-warning)'
                      }}
                    />
                  </TableCell>
                </TableRow>
              );})}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Tax Breakdown Dialog */}
      <Dialog
        open={!!selectedTaxBreakdown}
        onClose={() => setSelectedTaxBreakdown(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-card)',
            color: 'var(--color-text-primary)',
            p: 1,
          }
        }}
      >
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 'bold', borderBottom: '1px solid var(--color-border)', pb: 2 }}>
          Income Tax Breakdown - {selectedTaxBreakdown?.employee?.name}
        </DialogTitle>
        <DialogContent sx={{ mt: 3 }}>
          {selectedTaxBreakdown?.tax_breakdown_json ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>YTD Gross Paid:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 650 }}>{formatCurrency(selectedTaxBreakdown.tax_breakdown_json.grossPaidYTD || 0)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>Projected Future Gross:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 650 }}>
                  {formatCurrency(
                    Math.max(0, selectedTaxBreakdown.tax_breakdown_json.grossIncome - (selectedTaxBreakdown.tax_breakdown_json.grossPaidYTD || 0))
                  )}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: 'rgba(255,255,255,0.02)', p: 1, borderRadius: '4px' }}>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Projected Annual Gross:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(selectedTaxBreakdown.tax_breakdown_json.grossIncome)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>Standard Deduction:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 650, color: 'var(--color-error)' }}>-{formatCurrency(selectedTaxBreakdown.tax_breakdown_json.standardDeduction)}</Typography>
              </Box>
              <Divider sx={{ borderColor: 'var(--color-border)' }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', fontWeight: 650 }}>Taxable Income (A):</Typography>
                <Typography variant="body2" sx={{ fontWeight: 750, color: 'var(--color-primary-hover)' }}>{formatCurrency(selectedTaxBreakdown.tax_breakdown_json.taxableIncome)}</Typography>
              </Box>
              
              <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: 700, color: 'var(--color-text-secondary)' }}>Progressive Slab-wise Tax (B):</Typography>
              <Box sx={{ bgcolor: 'var(--color-surface-subtle)', p: 2, borderRadius: 'var(--radius-control)', border: '1px solid var(--color-border)' }}>
                {selectedTaxBreakdown.tax_breakdown_json.slabs.map((slab: any, idx: number) => (
                  <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, '&:last-child': { mb: 0 } }}>
                    <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>
                      {slab.rate}% Slab ({formatCurrency(slab.from)} - {slab.to ? formatCurrency(slab.to) : 'Above'}):
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: slab.taxAmount > 0 ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                      {formatCurrency(slab.taxAmount)}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>Base Progressive Tax:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 650 }}>{formatCurrency(selectedTaxBreakdown.tax_breakdown_json.baseTax)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>Section 87A Rebate:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 650, color: 'var(--color-success)' }}>-{formatCurrency(selectedTaxBreakdown.tax_breakdown_json.rebate)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>Surcharge (High Income):</Typography>
                <Typography variant="body2" sx={{ fontWeight: 650 }}>{formatCurrency(selectedTaxBreakdown.tax_breakdown_json.surcharge)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>Health & Education Cess (4%):</Typography>
                <Typography variant="body2" sx={{ fontWeight: 650 }}>{formatCurrency(selectedTaxBreakdown.tax_breakdown_json.cess)}</Typography>
              </Box>
              <Divider sx={{ borderColor: 'var(--color-border)' }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>Total Annual Tax Liability:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 650, color: 'var(--color-warning)' }}>{formatCurrency(selectedTaxBreakdown.tax_breakdown_json.finalTax)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>Less: YTD Tax Paid:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 650, color: 'var(--color-success)' }}>-{formatCurrency(selectedTaxBreakdown.tax_breakdown_json.taxPaidYTD || 0)}</Typography>
              </Box>
              <Divider sx={{ borderColor: 'var(--color-border)' }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" sx={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>Remaining Annual Tax:</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--color-warning)' }}>{formatCurrency(selectedTaxBreakdown.tax_breakdown_json.remainingAnnualTax ?? selectedTaxBreakdown.tax_breakdown_json.finalTax)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>Remaining Payroll Months:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 650 }}>{selectedTaxBreakdown.tax_breakdown_json.remainingMonths ?? 12}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: 'rgba(99, 102, 241, 0.04)', p: 2, borderRadius: 'var(--radius-control)', border: '1px dashed rgba(99, 102, 241, 0.2)' }}>
                <Typography variant="body1" sx={{ color: 'var(--color-primary-hover)', fontWeight: 700 }}>Monthly TDS (Remaining Tax / Months):</Typography>
                <Typography variant="body1" sx={{ color: 'var(--color-primary-hover)', fontWeight: 750 }}>{formatCurrency(selectedTaxBreakdown.tax_breakdown_json.monthlyTDS)}</Typography>
              </Box>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>No detailed tax breakdown is available for this payroll record.</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: '1px solid var(--color-border)' }}>
          <Button onClick={() => setSelectedTaxBreakdown(null)} variant="outlined" sx={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', textTransform: 'none', borderRadius: 'var(--radius-control)' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={disburseOpen}
        onClose={() => setDisburseOpen(false)}
        PaperProps={{
          sx: {
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-card)',
            color: 'var(--color-text-primary)',
          }
        }}
      >
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 'bold' }}>Disburse Payroll Confirmation</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'var(--color-text-secondary)' }}>
            Are you sure you want to disburse the payroll for {months.find(m => m.value === mo)?.label} {yr}?
            <br /><br />
            <strong>Warning:</strong> This action will finalize all calculations, lock employee records and non-payable days for this month. <strong>This action cannot be undone.</strong>
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setDisburseOpen(false)} sx={{ color: 'var(--color-text-secondary)', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setDisburseOpen(false);
              stMut.mutate('disbursed');
            }}
            variant="contained"
            sx={{
              background: 'var(--color-success)',
              '&:hover': { background: 'var(--color-success-hover)' },
              textTransform: 'none',
            }}
            autoFocus
          >
            Confirm & Disburse
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Payroll;
