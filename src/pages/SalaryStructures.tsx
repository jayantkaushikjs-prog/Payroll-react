import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { formatCurrency } from '../constants/currency';
import { useAuth, Role } from '../context/AuthContext';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Tooltip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useToast } from '../context/ToastContext';
import {
  History as HistoryIcon,
  Upgrade as RevisionIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';

interface Employee {
  id: number;
  employee_code: string;
  name: string;
  department: string;
  designation: string;
  pf_deduction?: boolean;
}

interface SalaryStructure {
  id: number;
  employee_id: number;
  employee?: Employee;
  basic_salary: number;
  hra: number;
  special_allowance: number;
  other_allowance: number;
  gross_salary: number;
  ctc: number;
  is_active: boolean;
  effective_from: string;
}

const SalaryStructures: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [openRevisionDialog, setOpenRevisionDialog] = useState(false);
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
  const [formErrors, setFormErrors] = useState({
    ctc: '',
    basic_percent: '',
    hra_percent: '',
    effective_from: '',
  });

  // Form State
  const [formData, setFormData] = useState({
    ctc: 0,
    ctc_type: 'monthly',
    basic_percent: 50,
    hra_percent: 40,
    effective_from: '',
  });

  const isFinanceOrAdmin = user && (user.role === Role.SUPER_ADMIN || user.role === Role.FINANCE);

  // Fetch active salary structures
  const { data: activeSalaryRows = [], isLoading: loadingSalaries } = useQuery(['activeSalaries'], async () => {
    const res = await api.get('/salary-structures/active');
    return res.data;
  });

  // Fetch all employees
  const { data: employees = [], isLoading: loadingEmployees } = useQuery(['employees'], async () => {
    const res = await api.get('/employees');
    return res.data;
  });

  // Fetch PF settings
  const { data: pfList = [] } = useQuery(['pfSettings'], async () => {
    const res = await api.get('/pf');
    return res.data;
  });

  const activeSalaries = useMemo(() => {
    const indexed: Record<number, SalaryStructure> = {};
    activeSalaryRows.forEach((structure: SalaryStructure) => {
      indexed[structure.employee_id] = structure;
    });
    return indexed;
  }, [activeSalaryRows]);

  // Fetch history for selected employee
  const { data: salaryHistory = [], isLoading: loadingHistory } = useQuery(
    ['salaryHistory', selectedEmp?.id],
    async () => {
      if (!selectedEmp) return [];
      const res = await api.get(`/salary-structures/history/${selectedEmp.id}`);
      return res.data;
    },
    {
      enabled: !!selectedEmp && openHistoryDialog,
    }
  );

  const handleMutationError = (err: any, fallbackMessage: string) => {
    const backendMessage = err.response?.data?.message;
    const errors = {
      ctc: '',
      basic_percent: '',
      hra_percent: '',
      effective_from: '',
    };

    if (Array.isArray(backendMessage)) {
      backendMessage.forEach((msg: string) => {
        const lowerMsg = msg.toLowerCase();
        if (lowerMsg.includes('ctc')) {
          errors.ctc = msg;
        } else if (lowerMsg.includes('basic')) {
          errors.basic_percent = msg;
        } else if (lowerMsg.includes('hra')) {
          errors.hra_percent = msg;
        } else if (lowerMsg.includes('effective')) {
          errors.effective_from = msg;
        }
      });
      setFormErrors(errors);
      showToast('Please correct the highlighted validation errors.', 'error');
    } else {
      showToast(backendMessage || fallbackMessage, 'error');
    }
  };

  // Create revision mutation
  const revisionMutation = useMutation(
    async (payload: any) => {
      const res = await api.post('/salary-structures', payload);
      return res.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['activeSalaries']);
        showToast('Salary structure revised successfully!', 'success');
        setOpenRevisionDialog(false);
      },
      onError: (err: any) => {
        handleMutationError(err, 'Failed to revise salary structure');
      },
    }
  );

  const handleOpenRevision = (emp: Employee) => {
    setSelectedEmp(emp);
    const current = activeSalaries[emp.id];
    setFormErrors({
      ctc: '',
      basic_percent: '',
      hra_percent: '',
      effective_from: '',
    });

    let basic_percent = 50;
    let hra_percent = 40;
    if (current && Number(current.gross_salary) > 0) {
      basic_percent = Math.round((Number(current.basic_salary) / Number(current.gross_salary)) * 100);
      if (Number(current.basic_salary) > 0) {
        hra_percent = Math.round((Number(current.hra) / Number(current.basic_salary)) * 100);
      }
    }

    setFormData({
      ctc: current ? Number(current.ctc) : 0,
      ctc_type: 'monthly',
      basic_percent,
      hra_percent,
      effective_from: new Date().toISOString().split('T')[0],
    });
    setOpenRevisionDialog(true);
  };

  const handleOpenHistory = (emp: Employee) => {
    setSelectedEmp(emp);
    setOpenHistoryDialog(true);
  };

  const handleRevisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;

    const nextErrors = {
      ctc: '',
      basic_percent: '',
      hra_percent: '',
      effective_from: '',
    };
    let isValid = true;

    if (Number(formData.ctc) <= 0) {
      nextErrors.ctc = 'CTC must be greater than 0';
      isValid = false;
    }
    if (Number(formData.basic_percent) <= 0 || Number(formData.basic_percent) > 100) {
      nextErrors.basic_percent = 'Basic % must be between 1 and 100';
      isValid = false;
    }
    if (Number(formData.hra_percent) <= 0 || Number(formData.hra_percent) > 100) {
      nextErrors.hra_percent = 'HRA % must be between 1 and 100';
      isValid = false;
    }
    if (!formData.effective_from) {
      nextErrors.effective_from = 'Effective starting date is required';
      isValid = false;
    }

    setFormErrors(nextErrors);

    if (!isValid) {
      showToast('Please correct the highlighted validation errors.', 'error');
      return;
    }

    const submittedCtc = formData.ctc_type === 'annual' ? Number(formData.ctc) / 12 : Number(formData.ctc);

    revisionMutation.mutate({
      employee_id: selectedEmp.id,
      ctc: Number(submittedCtc.toFixed(2)),
      basic_percent: Number(formData.basic_percent),
      hra_percent: Number(formData.hra_percent),
      effective_from: formData.effective_from,
    });
  };

  const handleExportCsv = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await api.get('/reports/salary-components/csv', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `salary-components_${today}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(link.href), 100);
      showToast('Salary components exported successfully!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to export CSV', 'error');
    }
  };

  const handleDownloadSampleCsv = () => {
    const headers = [
      'Employee Code',
      'CTC',
      'Effective From',
      'Basic Percent',
      'HRA Percent',
    ];
    const sampleRows = [
      ['EMP001', '60000', '2026-06-01', '50', '40'],
      ['EMP002', '45000', '2026-06-01', '50', '40']
    ];
    const csvContent = [headers.join(','), ...sampleRows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'sample_salary_structures.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
  };

  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      try {
        const res = await api.post('/salary-structures/import', { csvContent: text });
        const { imported, errors } = res.data;
        queryClient.invalidateQueries(['activeSalaries']);
        if (errors && errors.length > 0) {
          showToast(`Imported ${imported} structures. There were ${errors.length} warnings/errors (see console details).`, 'error');
          console.warn('Import CSV warnings/errors:', errors);
        } else {
          showToast(`Successfully imported ${imported} salary structures!`, 'success');
        }
      } catch (err: any) {
        showToast(err.response?.data?.message || 'Failed to import CSV file.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Dynamic calculations for preview
  const calculations = useMemo(() => {
    let ctc = Number(formData.ctc) || 0;
    if (formData.ctc_type === 'annual') {
      ctc = ctc / 12;
    }
    const basicRatio = (Number(formData.basic_percent) || 50) / 100;
    const hraRatio = (Number(formData.hra_percent) || 40) / 100;

    let gross_salary = ctc;
    let employer_pf = 0;

    if (selectedEmp && selectedEmp.pf_deduction !== false) {
      const activeSetting = [...pfList]
        .sort((a, b) => b.effective_date.localeCompare(a.effective_date))
        .find(s => !formData.effective_from || s.effective_date <= formData.effective_from);

      const rate = activeSetting ? Number(activeSetting.employer_contribution_rate) / 100 : 0.12;
      const gross_salary_uncapped = ctc / (1 + basicRatio * rate);
      if (basicRatio * gross_salary_uncapped * rate > 1800) {
        gross_salary = ctc - 1800;
        employer_pf = 1800;
      } else {
        gross_salary = gross_salary_uncapped;
        employer_pf = basicRatio * gross_salary * rate;
      }
    }

    const basic_salary = basicRatio * gross_salary;
    const hra = hraRatio * basic_salary;
    const special_allowance = 0;
    const other_allowance = Math.max(0, gross_salary - basic_salary - hra);

    return {
      gross_salary,
      basic_salary,
      hra,
      special_allowance,
      other_allowance,
      employer_pf,
    };
  }, [formData.ctc, formData.basic_percent, formData.hra_percent, formData.effective_from, selectedEmp, pfList]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)' }}>
            Salary Structures & Revisions
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mt: 0.5 }}>
            Manage employee CTC, salary components, and create historical revisions.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <input
            type="file"
            accept=".csv"
            id="import-csv-file-input"
            style={{ display: 'none' }}
            onChange={handleImportCsv}
          />
          {isFinanceOrAdmin && (
            <>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadSampleCsv}
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
                Sample CSV
              </Button>
              <label htmlFor="import-csv-file-input">
                <Button
                  component="span"
                  variant="outlined"
                  startIcon={<UploadIcon />}
                  sx={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    textTransform: 'none',
                    borderRadius: 'var(--radius-control)',
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: 'var(--color-border-strong)',
                      bgcolor: 'var(--color-surface-subtle)',
                      color: 'var(--color-text-primary)',
                    },
                  }}
                >
                  Import CSV
                </Button>
              </label>
            </>
          )}
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportCsv}
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
            Export CSV
          </Button>
        </Box>
      </Box>

      <Paper
        sx={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card)',
          overflow: 'hidden',
          p: 3,
        }}
      >
        <TableContainer>
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ bgcolor: 'var(--color-surface-subtle)' }}>
              <TableRow>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Emp Code</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Monthly CTC</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Basic Salary</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>HRA</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Other Allowance</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Gross Salary</TableCell>
                <TableCell align="right" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(loadingSalaries || loadingEmployees) ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                    <CircularProgress size={30} sx={{ color: 'var(--color-primary)' }} />
                  </TableCell>
                </TableRow>
              ) : employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'var(--color-text-muted)' }}>
                    No employees registered yet.
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((emp: Employee) => {
                  const current = activeSalaries[emp.id];
                  return (
                    <TableRow
                      key={emp.id}
                      sx={{
                        '&:hover': { bgcolor: 'var(--color-row-hover)' },
                        borderColor: 'rgba(255, 255, 255, 0.05)',
                        transition: 'background-color 140ms ease',
                      }}
                    >
                      <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 700 }}>{emp.employee_code}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{emp.name}</TableCell>
                      <TableCell sx={{ color: 'var(--color-primary-hover)', fontWeight: 700, fontFamily: 'Outfit' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {current ? formatCurrency(current.ctc) : '—'}
                          {current && (
                            <Tooltip title={`Breakdown: Gross Salary (${formatCurrency(current.gross_salary)}) + Employer PF (${formatCurrency(current.ctc - current.gross_salary)})`} arrow>
                              <IconButton size="small" sx={{ p: 0.2, ml: 0.5, color: 'var(--color-text-secondary)', '& svg': { fontSize: '0.85rem' } }}>
                                <HelpOutlineIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)', fontFamily: 'Outfit' }}>{current ? formatCurrency(current.basic_salary) : '—'}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)', fontFamily: 'Outfit' }}>{current ? formatCurrency(current.hra) : '—'}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)', fontFamily: 'Outfit' }}>{current ? formatCurrency(current.other_allowance) : '—'}</TableCell>
                      <TableCell sx={{ color: current ? 'var(--color-success)' : 'var(--color-text-muted)', fontWeight: 700, fontFamily: 'Outfit' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {current ? formatCurrency(current.gross_salary) : '—'}
                          {current && (
                            <Tooltip title={`Breakdown: Basic Salary (${formatCurrency(current.basic_salary)}) + HRA (${formatCurrency(current.hra)}) + Other Allowance (${formatCurrency(current.other_allowance)})`} arrow>
                              <IconButton size="small" sx={{ p: 0.2, ml: 0.5, color: 'var(--color-text-secondary)', '& svg': { fontSize: '0.85rem' } }}>
                                <HelpOutlineIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        {current ? (
                          <Button
                            size="small"
                            startIcon={<HistoryIcon />}
                            onClick={() => handleOpenHistory(emp)}
                            sx={{ 
                              color: 'var(--color-text-secondary)', 
                              mr: 1, 
                              textTransform: 'none',
                              borderRadius: '8px',
                              px: 1.5,
                              '&:hover': {
                                bgcolor: 'var(--color-surface-subtle)',
                                color: 'var(--color-text-primary)'
                              }
                            }}
                          >
                            History
                          </Button>
                        ) : null}
                        {isFinanceOrAdmin && (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<RevisionIcon />}
                            onClick={() => handleOpenRevision(emp)}
                            sx={{
                              bgcolor: current ? 'rgba(99, 102, 241, 0.08)' : 'var(--color-primary)',
                              color: current ? 'var(--color-primary-hover)' : '#ffffff',
                              border: current ? '1px solid rgba(99, 102, 241, 0.25)' : 'none',
                              borderRadius: '8px',
                              px: 2,
                              fontWeight: 700,
                              textTransform: 'none',
                              boxShadow: current ? 'none' : '0 8px 18px rgba(99, 102, 241, 0.22)',
                              transition: 'all 160ms ease',
                              '&:hover': {
                                bgcolor: current ? 'var(--color-primary)' : 'var(--color-primary-hover)',
                                color: '#ffffff',
                                boxShadow: '0 12px 24px rgba(99, 102, 241, 0.28)',
                                transform: 'translateY(-1px)',
                              },
                              '&:active': {
                                transform: 'translateY(1px)',
                              }
                            }}
                          >
                            {current ? 'Revise' : 'Create'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Salary Revision Dialog */}
      <Dialog
        open={openRevisionDialog}
        onClose={() => setOpenRevisionDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'var(--color-surface)',
            backgroundImage: 'none',
            color: 'var(--color-text-primary)',
            borderRadius: 'var(--radius-card)',
            border: '1px solid var(--color-border)',
          },
        }}
      >
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', pb: 2 }}>
          Configure Salary Structure - {selectedEmp?.name}
        </DialogTitle>
        <form onSubmit={handleRevisionSubmit}>
          <DialogContent sx={{ py: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth sx={inputStyles}>
                  <InputLabel id="ctc-type-label">CTC Period</InputLabel>
                  <Select
                    labelId="ctc-type-label"
                    id="ctc-type-select"
                    value={formData.ctc_type || 'monthly'}
                    label="CTC Period"
                    onChange={(e) => setFormData({ ...formData, ctc_type: e.target.value as string })}
                  >
                    <MenuItem value="monthly">Monthly CTC</MenuItem>
                    <MenuItem value="annual">Annual CTC</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label={formData.ctc_type === 'annual' ? "Annual CTC Amount" : "Monthly CTC Amount"}
                  type="number"
                  fullWidth
                  required
                  value={formData.ctc || ''}
                  onChange={(e) => setFormData({ ...formData, ctc: parseFloat(e.target.value) || 0 })}
                  error={!!formErrors.ctc}
                  helperText={formErrors.ctc}
                  sx={inputStyles}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Effective From"
                  type="date"
                  fullWidth
                  required
                  value={formData.effective_from}
                  onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  error={!!formErrors.effective_from}
                  helperText={formErrors.effective_from}
                  sx={inputStyles}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Basic Salary % of Gross"
                  type="number"
                  fullWidth
                  required
                  inputProps={{ min: 1, max: 100 }}
                  value={formData.basic_percent || ''}
                  onChange={(e) => setFormData({ ...formData, basic_percent: parseFloat(e.target.value) || 0 })}
                  error={!!formErrors.basic_percent}
                  helperText={formErrors.basic_percent}
                  sx={inputStyles}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="HRA % of Basic"
                  type="number"
                  fullWidth
                  required
                  inputProps={{ min: 1, max: 100 }}
                  value={formData.hra_percent || ''}
                  onChange={(e) => setFormData({ ...formData, hra_percent: parseFloat(e.target.value) || 0 })}
                  error={!!formErrors.hra_percent}
                  helperText={formErrors.hra_percent}
                  sx={inputStyles}
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 1, borderColor: 'var(--color-border)' }} />
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Dynamic Component Breakdown Preview
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Card sx={{ bgcolor: 'var(--color-surface-subtle)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-control)' }}>
                      <CardContent sx={{ py: '10px !important', px: 2 }}>
                        <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>
                          Basic Salary ({formData.basic_percent}% of Gross)
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'var(--color-text-primary)', fontWeight: 600, mt: 0.5 }}>
                          {formatCurrency(calculations.basic_salary)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Card sx={{ bgcolor: 'var(--color-surface-subtle)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-control)' }}>
                      <CardContent sx={{ py: '10px !important', px: 2 }}>
                        <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>
                          HRA ({formData.hra_percent}% of Basic)
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'var(--color-text-primary)', fontWeight: 600, mt: 0.5 }}>
                          {formatCurrency(calculations.hra)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Card sx={{ bgcolor: 'var(--color-surface-subtle)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-control)' }}>
                      <CardContent sx={{ py: '10px !important', px: 2 }}>
                        <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>
                          Other Allowances (Remaining)
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'var(--color-text-primary)', fontWeight: 600, mt: 0.5 }}>
                          {formatCurrency(calculations.other_allowance)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Card sx={{ bgcolor: 'var(--color-surface-subtle)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-control)' }}>
                      <CardContent sx={{ py: '10px !important', px: 2 }}>
                        <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>
                          Employer PF Share
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600, mt: 0.5 }}>
                          {formatCurrency(calculations.employer_pf)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12}>
                    <Card sx={{ bgcolor: 'rgba(16, 185, 129, 0.04)', border: '1px dashed rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-control)' }}>
                      <CardContent sx={{ py: '12px !important', px: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ color: 'var(--color-success)', fontWeight: 600 }}>
                          Calculated Gross Salary
                        </Typography>
                        <Typography variant="h5" sx={{ color: 'var(--color-success)', fontWeight: 700, fontFamily: 'Outfit' }}>
                          {formatCurrency(calculations.gross_salary)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <Button onClick={() => setOpenRevisionDialog(false)} sx={{ color: 'var(--color-text-secondary)', textTransform: 'none' }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                background: 'var(--color-primary)',
                borderRadius: 'var(--radius-control)',
                px: 3,
                textTransform: 'none',
              }}
            >
              Submit Structure
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* History Dialog */}
      <Dialog
        open={openHistoryDialog}
        onClose={() => setOpenHistoryDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'var(--color-surface)',
            backgroundImage: 'none',
            color: 'var(--color-text-primary)',
            borderRadius: 'var(--radius-card)',
            border: '1px solid var(--color-border)',
          },
        }}
      >
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', pb: 2 }}>
          Revision History - {selectedEmp?.name}
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          {loadingHistory ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <CircularProgress sx={{ color: 'var(--color-primary)' }} />
            </Box>
          ) : salaryHistory.length === 0 ? (
            <Typography sx={{ color: 'var(--color-text-muted)', textAlign: 'center', py: 4 }}>
              No salary history found for this employee.
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: 'var(--color-surface-subtle)' }}>
                  <TableRow>
                    <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Effective Date</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>CTC</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Basic</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>HRA</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Other</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Gross</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {salaryHistory.map((hist: SalaryStructure) => (
                    <TableRow key={hist.id} sx={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                      <TableCell sx={{ color: 'var(--color-text-primary)' }}>{hist.effective_from}</TableCell>
                      <TableCell sx={{ color: 'var(--color-primary-hover)', fontWeight: 600 }}>{formatCurrency(hist.ctc)}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)' }}>{formatCurrency(hist.basic_salary)}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)' }}>{formatCurrency(hist.hra)}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)' }}>{formatCurrency(hist.other_allowance)}</TableCell>
                      <TableCell sx={{ color: 'var(--color-success)', fontWeight: 600 }}>{formatCurrency(hist.gross_salary)}</TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: 'inline-block',
                            px: 1.5,
                            py: 0.5,
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            bgcolor: hist.is_active ? 'rgba(16, 185, 129, 0.08)' : 'rgba(148, 163, 184, 0.08)',
                            color: hist.is_active ? 'var(--color-success)' : 'var(--color-text-muted)',
                            border: hist.is_active ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--color-border)',
                          }}
                        >
                          {hist.is_active ? 'Active' : 'Archived'}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <Button onClick={() => setOpenHistoryDialog(false)} sx={{ color: 'var(--color-text-secondary)', textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const inputStyles = {
  '& .MuiOutlinedInput-root': {
    color: 'var(--color-text-primary)',
    borderRadius: 'var(--radius-control)',
    '& fieldset': { borderColor: 'var(--color-border)' },
    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
    '&.Mui-focused fieldset': { borderColor: 'var(--color-primary)' },
  },
  '& .MuiInputLabel-root': { color: 'var(--color-text-secondary)' },
  '& .MuiInputLabel-root.Mui-focused': { color: 'var(--color-primary-hover)' },
};

export default SalaryStructures;
