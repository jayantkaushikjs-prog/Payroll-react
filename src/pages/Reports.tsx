import React, { useState } from 'react';
import { useAuth, Permission } from '../context/AuthContext';
import api from '../services/api';
import {
  Box, Button, Typography, Paper, Grid, Select, MenuItem,
  FormControl, InputLabel, Snackbar, Alert,
} from '@mui/material';
import {
  AccountBalance as BankIcon,
  Assessment as SummaryIcon,
  Download as DlIcon,
  EventBusy as NonPayableIcon,
  People as PeopleIcon,
  ReceiptLong as PayrollIcon,
  Savings as AdvancesIcon,
  Security as PfIcon,
  Timeline as JoiningIcon,
  Wallet as SalaryIcon,
  Percent as TaxIcon,
} from '@mui/icons-material';

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

const Reports: React.FC = () => {
  const { hasPermission } = useAuth();
  const now = new Date();
  const [mo, setMo] = useState(now.getMonth() + 1);
  const [yr, setYr] = useState(now.getFullYear());
  const [note, setNote] = useState<{ open: boolean; msg: string; sev: 'success'|'error' } | null>(null);
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const today = now.toISOString().split('T')[0];
  const canViewHrReports = hasPermission(Permission.VIEW_HR_REPORTS);
  const canViewFinanceReports =
    hasPermission(Permission.VIEW_PAYROLL_REPORTS) ||
    hasPermission(Permission.VIEW_FINANCIAL_DASHBOARDS);

  const downloadCsv = async (url: string, filename: string) => {
    try {
      const res = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
      setNote({ open: true, msg: `${filename} downloaded!`, sev: 'success' });
    } catch (err: any) {
      setNote({ open: true, msg: err.response?.data?.message || 'Download failed', sev: 'error' });
    }
  };

  const hrReports = [
    { title: 'Employee Master Data', desc: 'Employee profile roster without finance-sensitive bank or salary data.', icon: <PeopleIcon />, gradient: 'linear-gradient(135deg,var(--color-primary),var(--color-primary-pressed))', url: '/reports/employee-master/csv', file: `employee-master_${today}.csv` },
    { title: 'Non-Payable Days', desc: 'Monthly non-payable day records by employee.', icon: <NonPayableIcon />, gradient: 'linear-gradient(135deg,var(--color-error),var(--color-error))', url: '/reports/non-payable-days/csv', file: `non-payable-days_${today}.csv` },
    { title: 'Joining/Exit Records', desc: 'Joining dates and active/inactive status records.', icon: <JoiningIcon />, gradient: 'linear-gradient(135deg,var(--color-success),var(--color-success))', url: '/reports/joining-exit/csv', file: `joining-exit-records_${today}.csv` },
  ];

  const financeReports = [
    { title: 'Payroll Register', desc: 'Full payroll breakdown for the selected period.', icon: <PayrollIcon />, gradient: 'linear-gradient(135deg,var(--color-primary),var(--color-primary-pressed))', url: `/reports/payroll/csv?month=${mo}&year=${yr}`, file: `payroll_${today}.csv` },
    { title: 'Bank Transfer Sheet', desc: 'Net salaries mapped to bank accounts for bulk transfer.', icon: <BankIcon />, gradient: 'linear-gradient(135deg,var(--color-success),var(--color-success))', url: `/reports/bank-transfer/csv?month=${mo}&year=${yr}`, file: `bank-transfer_${today}.csv` },
    { title: 'Salary Components', desc: 'Active salary components and gross salary values.', icon: <SalaryIcon />, gradient: 'linear-gradient(135deg,#0ea5e9,#0369a1)', url: '/reports/salary-components/csv', file: `salary-components_${today}.csv` },
    { title: 'Payroll Summary', desc: 'Payroll cost, PF, and tax summary trends.', icon: <SummaryIcon />, gradient: 'linear-gradient(135deg,#14b8a6,#0f766e)', url: '/reports/payroll-summary/csv', file: `payroll-summary_${today}.csv` },
    { title: 'PF Report', desc: 'PF deductions per employee for statutory filing.', icon: <PfIcon />, gradient: 'linear-gradient(135deg,var(--color-accent),var(--color-accent))', url: `/reports/pf/csv?month=${mo}&year=${yr}`, file: `pf-report_${today}.csv` },
    { title: 'Tax Report', desc: 'Income tax deductions for TDS filing.', icon: <TaxIcon />, gradient: 'linear-gradient(135deg,var(--color-warning),var(--color-warning))', url: `/reports/tax/csv?month=${mo}&year=${yr}`, file: `tax-report_${today}.csv` },
    { title: 'Advances Report', desc: 'All advances with recovery status.', icon: <AdvancesIcon />, gradient: 'linear-gradient(135deg,#f97316,#c2410c)', url: '/reports/advances/csv', file: `advances-report_${today}.csv` },
  ];

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)' }}>Reports & CSV Export</Typography>
        <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mt: 0.5 }}>Download reports available to your role.</Typography>
      </Box>

      {canViewFinanceReports && (
      <Paper sx={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', p: 3, mb: 4 }}>
        <Typography variant="subtitle2" sx={{ color: 'var(--color-primary-hover)', fontWeight: 600, mb: 2, letterSpacing: '0.5px' }}>REPORT PERIOD</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth sx={ss}><InputLabel sx={{ color: 'var(--color-text-secondary)' }}>Month</InputLabel>
              <Select value={mo} label="Month" onChange={e => setMo(e.target.value as number)}>
                {months.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth sx={ss}><InputLabel sx={{ color: 'var(--color-text-secondary)' }}>Year</InputLabel>
              <Select value={yr} label="Year" onChange={e => setYr(e.target.value as number)}>
                {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>
      )}

      {canViewHrReports && (
        <ReportSection title="HR Reports" reports={hrReports} onDownload={downloadCsv} />
      )}

      {canViewFinanceReports && (
        <ReportSection title="Finance Reports" reports={financeReports} onDownload={downloadCsv} />
      )}

      <Snackbar open={note?.open} autoHideDuration={4000} onClose={() => setNote(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setNote(null)} severity={note?.sev} sx={{ width: '100%' }}>{note?.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

interface ReportCard {
  title: string;
  desc: string;
  icon: React.ReactNode;
  gradient: string;
  url: string;
  file: string;
}

const ReportSection: React.FC<{
  title: string;
  reports: ReportCard[];
  onDownload: (url: string, filename: string) => void;
}> = ({ title, reports, onDownload }) => (
  <Box sx={{ mb: 4 }}>
    <Typography variant="subtitle2" sx={{ color: 'var(--color-primary-hover)', fontWeight: 600, mb: 2, letterSpacing: '0.5px' }}>
      {title}
    </Typography>
    <Grid container spacing={3}>
      {reports.map(r => (
          <Grid item xs={12} sm={6} md={4} key={r.title}>
            <Paper sx={{ p: 3, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 30px rgba(0,0,0,0.3)' } }}>
              <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '3px', background: r.gradient }} />
              <Box sx={{ color: 'var(--color-text-primary)', mb: 1.5, '& svg': { fontSize: '2rem' } }}>{r.icon}</Box>
              <Typography variant="h6" sx={{ color: 'var(--color-text-primary)', fontWeight: 600, fontFamily: 'Outfit', mb: 0.5 }}>{r.title}</Typography>
              <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mb: 3, flexGrow: 1 }}>{r.desc}</Typography>
              <Button variant="outlined" startIcon={<DlIcon />} onClick={() => onDownload(r.url, r.file)} sx={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', textTransform: 'none', borderRadius: 'var(--radius-control)', '&:hover': { borderColor: 'rgba(255,255,255,0.25)', bgcolor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' } }}>
                Download CSV
              </Button>
            </Paper>
          </Grid>
        ))}
      </Grid>
  </Box>
);

export default Reports;
