import React, { useState } from 'react';
import { useAuth, Permission } from '../context/AuthContext';
import {
  Box, Button, Typography, Paper, Grid, Select, MenuItem,
  FormControl, InputLabel, Tabs, Tab, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Tooltip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { useToast } from '../context/ToastContext';
import {
  AccountBalance as BankIcon,
  Download as DlIcon,
  People as PeopleIcon,
  ReceiptLong as PayrollIcon,
  Savings as AdvancesIcon,
  Timeline as JoiningIcon,
  Wallet as SalaryIcon,
  Restore as RestoreIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { downloadCsvFile } from '../utils/download';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

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

const Reports: React.FC = () => {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const now = new Date();
  const [mo, setMo] = useState(now.getMonth() + 1);
  const [yr, setYr] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState(0);
  const [filterType, setFilterType] = useState<'cumulative' | 'filtered'>('cumulative');

  const { data: archivedEmployees = [], isLoading: isLoadingAll } = useQuery(['archivedEmployees'], async () => {
    const res = await api.get('/employees?status=archived');
    return res.data;
  });

  const restoreMutation = useMutation(
    async (id: number) => {
      const res = await api.post(`/employees/${id}/restore`);
      return res.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['employees']);
        queryClient.invalidateQueries(['archivedEmployees']);
        showToast('Employee restored successfully!', 'success');
      },
      onError: (err: any) => {
        showToast(err.response?.data?.message || 'Failed to restore employee', 'error');
      },
    }
  );
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [employeeToRestore, setEmployeeToRestore] = useState<any>(null);
  const [hardDeleteDialogOpen, setHardDeleteDialogOpen] = useState(false);
  const [hardDeleteAllDialogOpen, setHardDeleteAllDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<any>(null);

  const hardDeleteMutation = useMutation(
    async (id: number) => {
      await api.delete(`/employees/${id}/hard`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['archivedEmployees']);
        showToast('Employee permanently deleted!', 'success');
      },
      onError: (err: any) => {
        showToast(err.response?.data?.message || 'Failed to delete employee', 'error');
      },
    }
  );

  const hardDeleteAllMutation = useMutation(
    async () => {
      await api.delete('/employees/archived/hard-delete-all');
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['archivedEmployees']);
        showToast('All archived employees permanently deleted!', 'success');
      },
      onError: (err: any) => {
        showToast(err.response?.data?.message || 'Failed to delete employees', 'error');
      },
    }
  );

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const today = now.toISOString().split('T')[0];
  const canViewHrReports = hasPermission(Permission.VIEW_HR_REPORTS);
  const canViewFinanceReports =
    hasPermission(Permission.VIEW_PAYROLL_REPORTS) ||
    hasPermission(Permission.VIEW_FINANCIAL_DASHBOARDS);

  const downloadCsv = async (url: string, filename: string) => {
    try {
      await downloadCsvFile(url, filename);
      showToast(`${filename} downloaded!`, 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Download failed', 'error');
    }
  };

  const querySuffix = filterType === 'filtered' ? `?month=${mo}&year=${yr}` : '';

  const hrReports = [
    { title: 'Employee Master Data', desc: filterType === 'filtered' ? 'Employee roster active/joining/relieving in the selected month.' : 'All-time employee roster without bank or salary details.', icon: <PeopleIcon />, gradient: 'linear-gradient(135deg,var(--color-primary),var(--color-primary-pressed))', url: `/reports/employee-master/csv${querySuffix}`, file: `employee-master_${filterType === 'filtered' ? `${yr}-${mo}` : 'all-time'}.csv` },
    { title: 'Joining/Exit Records', desc: filterType === 'filtered' ? 'Joining and Exit records registered in the selected month.' : 'All joining dates and active/inactive status records.', icon: <JoiningIcon />, gradient: 'linear-gradient(135deg,var(--color-success),var(--color-success))', url: `/reports/joining-exit/csv${querySuffix}`, file: `joining-exit-records_${filterType === 'filtered' ? `${yr}-${mo}` : 'all-time'}.csv` },
    { title: 'Preview Sheet', desc: 'Monthly HR inputs for all active employees — attendance, deductions, bonuses and remarks.', icon: <PayrollIcon />, gradient: 'linear-gradient(135deg,var(--color-accent),var(--color-accent))', url: `/reports/preview-sheet/csv?month=${mo}&year=${yr}`, file: `preview-sheet_${yr}-${mo}.csv` },
  ];

  const financeReports = [
    { title: 'Payroll Register', desc: 'Full payroll breakdown for the selected period.', icon: <PayrollIcon />, gradient: 'linear-gradient(135deg,var(--color-primary),var(--color-primary-pressed))', url: `/reports/payroll/csv?month=${mo}&year=${yr}`, file: `payroll_${yr}-${mo}.csv` },
    { title: 'Bank Transfer Sheet', desc: 'Net salaries mapped to bank accounts for bulk transfer.', icon: <BankIcon />, gradient: 'linear-gradient(135deg,var(--color-success),var(--color-success))', url: `/reports/bank-transfer/csv?month=${mo}&year=${yr}`, file: `bank-transfer_${yr}-${mo}.csv` },
    { title: 'Salary Components', desc: filterType === 'filtered' ? 'Salary structure components active in the selected month.' : 'All active salary components and gross salary values.', icon: <SalaryIcon />, gradient: 'linear-gradient(135deg,#0ea5e9,#0369a1)', url: `/reports/salary-components/csv${querySuffix}`, file: `salary-components_${filterType === 'filtered' ? `${yr}-${mo}` : 'all-time'}.csv` },
    { title: 'Advances Report', desc: filterType === 'filtered' ? 'Advances initiated in the selected month with recovery status.' : 'All historical advances with recovery status.', icon: <AdvancesIcon />, gradient: 'linear-gradient(135deg,#f97316,#c2410c)', url: `/reports/advances/csv${querySuffix}`, file: `advances-report_${filterType === 'filtered' ? `${yr}-${mo}` : 'all-time'}.csv` },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)' }}>CSV Reports Export & Archives</Typography>
        <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mt: 0.5 }}>Download reports and manage archived employees.</Typography>
      </Box>
 
       <Tabs
        value={activeTab}
        onChange={(_, val) => setActiveTab(val)}
        sx={{
          mb: 4,
          borderBottom: '1px solid var(--color-border)',
          '& .MuiTab-root': {
            textTransform: 'none',
            fontFamily: 'Outfit',
            fontWeight: 500,
            fontSize: '0.95rem',
            color: 'var(--color-text-secondary)',
            '&.Mui-selected': {
              color: 'var(--color-primary-hover)',
              fontWeight: 600,
            },
          },
          '& .MuiTabs-indicator': {
            backgroundColor: 'var(--color-primary)',
          },
        }}
      >
        <Tab label="Export Reports" />
        <Tab label={`Archived Employees (${archivedEmployees.length})`} />
      </Tabs>
 
       {activeTab === 0 && (
        <>
          {(canViewFinanceReports || canViewHrReports) && (
            <Paper sx={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', p: 3, mb: 4 }}>
              <Typography variant="subtitle2" sx={{ color: 'var(--color-primary-hover)', fontWeight: 600, mb: 2, letterSpacing: '0.5px' }}>REPORT PERIOD & SCOPE</Typography>
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
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth sx={ss}><InputLabel sx={{ color: 'var(--color-text-secondary)' }}>Export Scope</InputLabel>
                    <Select value={filterType} label="Export Scope" onChange={e => setFilterType(e.target.value as 'cumulative' | 'filtered')}>
                      <MenuItem value="cumulative">Cumulative (All Time)</MenuItem>
                      <MenuItem value="filtered">Filtered (Selected Period)</MenuItem>
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
        </>
      )}

      {activeTab === 1 && (
        <Paper sx={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="subtitle2" sx={{ color: 'var(--color-primary-hover)', fontWeight: 600, letterSpacing: '0.5px' }}>ARCHIVED EMPLOYEES</Typography>
            {archivedEmployees.length > 0 && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => setHardDeleteAllDialogOpen(true)}
                sx={{ textTransform: 'none', borderRadius: 'var(--radius-control)' }}
              >
                Hard Delete All
              </Button>
            )}
          </Box>
          {isLoadingAll ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <CircularProgress size={30} />
            </Box>
          ) : archivedEmployees.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'var(--color-text-muted)', py: 3, textAlign: 'center' }}>
              No archived employees found.
            </Typography>
          ) : (
            <TableContainer component={Paper} sx={{ bgcolor: 'transparent', boxShadow: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-control)' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'var(--color-surface-subtle)' }}>
                  <TableRow>
                    <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Employee Code</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Department</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Designation</TableCell>
                    <TableCell align="right" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {archivedEmployees.map((emp: any) => (
                    <TableRow key={emp.id} sx={{ '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.02)' } }}>
                      <TableCell sx={{ color: 'var(--color-text-primary)' }}>{emp.employee_code}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{emp.name}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)' }}>{emp.department}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)' }}>{emp.designation}</TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                          <Tooltip title="Restore Employee">
                            <IconButton
                              onClick={() => {
                                setEmployeeToRestore(emp);
                                setRestoreDialogOpen(true);
                              }}
                              sx={{ color: 'var(--color-text-secondary)', '&:hover': { color: 'var(--color-success)' } }}
                            >
                              <RestoreIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Hard Delete">
                            <IconButton
                              onClick={() => {
                                setEmployeeToDelete(emp);
                                setHardDeleteDialogOpen(true);
                              }}
                              sx={{ color: 'var(--color-text-secondary)', '&:hover': { color: 'var(--color-error)' } }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* Restore Confirmation Dialog */}
      <Dialog
        open={restoreDialogOpen}
        onClose={() => setRestoreDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            bgcolor: 'var(--color-surface)',
            backgroundImage: 'none',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            border: '1px solid var(--color-border)',
            minWidth: '400px'
          }
        }}
      >
        <DialogTitle sx={{ color: 'var(--color-text-primary)', pb: 1 }}>
          Restore Employee
        </DialogTitle>
        <DialogContent sx={{ color: 'var(--color-text-secondary)' }}>
          Are you sure you want to restore <strong>{employeeToRestore?.name}</strong> to active status? They will be moved back to the main employee directory.
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1.5 }}>
          <Button
            onClick={() => setRestoreDialogOpen(false)}
            sx={{
              color: 'var(--color-text-secondary)',
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (employeeToRestore) {
                restoreMutation.mutate(employeeToRestore.id);
              }
              setRestoreDialogOpen(false);
            }}
            variant="contained"
            disabled={restoreMutation.isPending}
            sx={{
              bgcolor: 'var(--color-success)',
              color: '#fff',
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: '8px',
              px: 3,
              '&:hover': {
                bgcolor: 'rgba(34, 197, 94, 0.8)',
              }
            }}
          >
            {restoreMutation.isPending ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Restore'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hard Delete Confirmation Dialog */}
      <Dialog
        open={hardDeleteDialogOpen}
        onClose={() => setHardDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            bgcolor: 'var(--color-surface)',
            backgroundImage: 'none',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            border: '1px solid var(--color-border)',
            minWidth: '400px'
          }
        }}
      >
        <DialogTitle sx={{ color: 'var(--color-text-primary)', pb: 1 }}>
          Hard Delete Employee
        </DialogTitle>
        <DialogContent sx={{ color: 'var(--color-text-secondary)' }}>
          Are you sure you want to <strong>permanently delete</strong> {employeeToDelete?.name}? This action cannot be undone and will delete all associated payroll data.
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1.5 }}>
          <Button onClick={() => setHardDeleteDialogOpen(false)} sx={{ color: 'var(--color-text-secondary)', textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (employeeToDelete) {
                hardDeleteMutation.mutate(employeeToDelete.id);
              }
              setHardDeleteDialogOpen(false);
            }}
            variant="contained"
            color="error"
            disabled={hardDeleteMutation.isLoading}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', px: 3 }}
          >
            {hardDeleteMutation.isLoading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Delete Permanently'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hard Delete All Confirmation Dialog */}
      <Dialog
        open={hardDeleteAllDialogOpen}
        onClose={() => setHardDeleteAllDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            bgcolor: 'var(--color-surface)',
            backgroundImage: 'none',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            border: '1px solid var(--color-border)',
            minWidth: '400px'
          }
        }}
      >
        <DialogTitle sx={{ color: 'var(--color-text-primary)', pb: 1 }}>
          Hard Delete All Archived
        </DialogTitle>
        <DialogContent sx={{ color: 'var(--color-text-secondary)' }}>
          Are you sure you want to <strong>permanently delete all</strong> archived employees? This action cannot be undone and will delete all associated payroll data for these employees.
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1.5 }}>
          <Button onClick={() => setHardDeleteAllDialogOpen(false)} sx={{ color: 'var(--color-text-secondary)', textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              hardDeleteAllMutation.mutate();
              setHardDeleteAllDialogOpen(false);
            }}
            variant="contained"
            color="error"
            disabled={hardDeleteAllMutation.isLoading}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', px: 3 }}
          >
            {hardDeleteAllMutation.isLoading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Delete All Permanently'}
          </Button>
        </DialogActions>
      </Dialog>
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
