import React, { useState } from 'react';
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';

interface Employee {
  id: number;
  employee_code: string;
  name: string;
}

interface EmployeeAdvance {
  id: number;
  employee_id: number;
  employee: Employee;
  amount: number;
  date: string;
  reason: string;
  recovery_type: 'one_time' | 'installment';
  installment_amount: number | null;
  total_recovered: number;
  remaining_amount: number;
  start_month: number;
  start_year: number;
  is_fully_recovered: boolean;
}

interface SalaryStructure {
  employee?: Employee & { active_status?: boolean };
}

const Advances: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [openDialog, setOpenDialog] = useState(false);
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' } | null>(null);
  const [formErrors, setFormErrors] = useState({
    employee_id: '',
    amount: '',
    date: '',
    reason: '',
    recovery_type: '',
    installment_amount: '',
    start_month: '',
    start_year: '',
  });

  // Form State
  const [formData, setFormData] = useState({
    employee_id: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    reason: '',
    recovery_type: 'one_time' as 'one_time' | 'installment',
    installment_amount: '',
    start_month: new Date().getMonth() + 1,
    start_year: currentYear,
  });

  const isFinanceOrAdmin = user && (user.role === Role.SUPER_ADMIN || user.role === Role.FINANCE);

  // Fetch active employees through a finance-authorized payroll endpoint
  const { data: employees = [] } = useQuery(['employees'], async () => {
    const res = await api.get('/salary-structures/active');
    return res.data
      .map((s: SalaryStructure) => s.employee)
      .filter((e: Employee & { active_status?: boolean }) => e && e.active_status !== false);
  });

  // Fetch all advances
  const { data: advances = [], isLoading } = useQuery(['advances'], async () => {
    const res = await api.get('/advances');
    return res.data;
  });

  const handleMutationError = (err: any, fallbackMessage: string) => {
    const backendMessage = err.response?.data?.message;
    const errors = {
      employee_id: '',
      amount: '',
      date: '',
      reason: '',
      recovery_type: '',
      installment_amount: '',
      start_month: '',
      start_year: '',
    };

    if (Array.isArray(backendMessage)) {
      backendMessage.forEach((msg: string) => {
        const lowerMsg = msg.toLowerCase();
        if (lowerMsg.includes('employee id') || lowerMsg.includes('employee')) {
          errors.employee_id = msg;
        } else if (lowerMsg.includes('amount') && !lowerMsg.includes('installment')) {
          errors.amount = msg;
        } else if (lowerMsg.includes('date')) {
          errors.date = msg;
        } else if (lowerMsg.includes('reason')) {
          errors.reason = msg;
        } else if (lowerMsg.includes('recovery type')) {
          errors.recovery_type = msg;
        } else if (lowerMsg.includes('installment')) {
          errors.installment_amount = msg;
        } else if (lowerMsg.includes('month')) {
          errors.start_month = msg;
        } else if (lowerMsg.includes('year')) {
          errors.start_year = msg;
        }
      });
      setFormErrors(errors);
      setNotification({ open: true, message: 'Please correct the highlighted validation errors.', severity: 'error' });
    } else {
      setNotification({ open: true, message: backendMessage || fallbackMessage, severity: 'error' });
    }
  };

  // Create mutation
  const createMutation = useMutation(
    async (payload: any) => {
      const res = await api.post('/advances', payload);
      return res.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['advances']);
        setNotification({ open: true, message: 'Employee advance issued successfully!', severity: 'success' });
        setOpenDialog(false);
      },
      onError: (err: any) => {
        handleMutationError(err, 'Failed to issue advance');
      },
    }
  );

  // Delete mutation
  const deleteMutation = useMutation(
    async (id: number) => {
      await api.delete(`/advances/${id}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['advances']);
        setNotification({ open: true, message: 'Advance log deleted.', severity: 'success' });
      },
      onError: (err: any) => {
        setNotification({ open: true, message: err.response?.data?.message || 'Failed to delete advance log', severity: 'error' });
      },
    }
  );

  const handleOpenAdd = () => {
    setFormErrors({
      employee_id: '',
      amount: '',
      date: '',
      reason: '',
      recovery_type: '',
      installment_amount: '',
      start_month: '',
      start_year: '',
    });
    setFormData({
      employee_id: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      reason: '',
      recovery_type: 'one_time',
      installment_amount: '',
      start_month: new Date().getMonth() + 1,
      start_year: currentYear,
    });
    setOpenDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = {
      employee_id: '',
      amount: '',
      date: '',
      reason: '',
      recovery_type: '',
      installment_amount: '',
      start_month: '',
      start_year: '',
    };
    let isValid = true;

    if (!formData.employee_id) {
      nextErrors.employee_id = 'Please select an employee';
      isValid = false;
    }

    if (Number(formData.amount) < 1) {
      nextErrors.amount = 'Advance amount must be at least 1';
      isValid = false;
    }

    if (!formData.date) {
      nextErrors.date = 'Advance date is required';
      isValid = false;
    }

    if (formData.recovery_type === 'installment') {
      if (!formData.installment_amount) {
        nextErrors.installment_amount = 'Installment amount is required for installment recovery';
        isValid = false;
      } else if (Number(formData.installment_amount) < 1) {
        nextErrors.installment_amount = 'Installment amount must be at least 1';
        isValid = false;
      } else if (Number(formData.installment_amount) > Number(formData.amount)) {
        nextErrors.installment_amount = 'Installment amount cannot exceed the advance amount';
        isValid = false;
      }
    }

    setFormErrors(nextErrors);

    if (!isValid) {
      setNotification({ open: true, message: 'Please correct the highlighted validation errors.', severity: 'error' });
      return;
    }

    createMutation.mutate({
      employee_id: Number(formData.employee_id),
      amount: Number(formData.amount),
      date: formData.date,
      reason: formData.reason,
      recovery_type: formData.recovery_type,
      installment_amount: formData.recovery_type === 'installment' ? Number(formData.installment_amount) : null,
      start_month: Number(formData.start_month),
      start_year: Number(formData.start_year),
    });
  };

  const handleExportCsv = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await api.get('/reports/advances/csv', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `advances-report_${today}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      setNotification({ open: true, message: 'Advances report exported successfully!', severity: 'success' });
    } catch (err: any) {
      setNotification({ open: true, message: err.response?.data?.message || 'Failed to export CSV', severity: 'error' });
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this advance? WARNING: This will revert recoveries.')) {
      deleteMutation.mutate(id);
    }
  };

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentYear + i);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)' }}>
            Employee Advances
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mt: 0.5 }}>
            Issue short-term company loans and configure automatic payroll recovery schedules.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
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
          {isFinanceOrAdmin && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenAdd}
              sx={{
                background: 'var(--color-primary)',
                boxShadow: '0 8px 18px rgba(99, 102, 241, 0.22)',
                borderRadius: 'var(--radius-control)',
                textTransform: 'none',
              }}
            >
              Issue Advance
            </Button>
          )}
        </Box>
      </Box>

      {/* Advances list table */}
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
          <Table>
            <TableHead sx={{ bgcolor: 'var(--color-surface-subtle)' }}>
              <TableRow>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Emp Code</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Total Advance</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Recovery Type</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Monthly Installment</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Recovered</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Remaining</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Start Month/Year</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Status</TableCell>
                {isFinanceOrAdmin && <TableCell align="right" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 3 }}>
                    <CircularProgress size={30} sx={{ color: 'var(--color-primary)' }} />
                  </TableCell>
                </TableRow>
              ) : advances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 3, color: 'var(--color-text-muted)' }}>
                    No advances issued.
                  </TableCell>
                </TableRow>
              ) : (
                advances.map((adv: EmployeeAdvance) => (
                  <TableRow key={adv.id} sx={{ '&:hover': { bgcolor: 'var(--color-row-hover)' }, borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                    <TableCell sx={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{adv.employee?.employee_code}</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{adv.employee?.name}</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-primary)' }}>{formatCurrency(adv.amount)}</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-primary)', textTransform: 'capitalize' }}>
                      {adv.recovery_type.replace('_', ' ')}
                    </TableCell>
                    <TableCell sx={{ color: 'var(--color-text-primary)' }}>
                      {adv.recovery_type === 'installment' && adv.installment_amount
                        ? formatCurrency(adv.installment_amount)
                        : 'N/A (One Time)'}
                    </TableCell>
                    <TableCell sx={{ color: 'var(--color-success)' }}>{formatCurrency(adv.total_recovered)}</TableCell>
                    <TableCell sx={{ color: 'var(--color-error)', fontWeight: 600 }}>{formatCurrency(adv.remaining_amount)}</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-primary)' }}>
                      {months.find((m) => m.value === adv.start_month)?.label} {adv.start_year}
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          display: 'inline-block',
                          px: 1.5,
                          py: 0.4,
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          bgcolor: adv.is_fully_recovered ? 'rgba(16, 185, 129, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                          color: adv.is_fully_recovered ? 'var(--color-success)' : 'var(--color-warning)',
                        }}
                      >
                        {adv.is_fully_recovered ? 'Recovered' : 'Active'}
                      </Box>
                    </TableCell>
                    {isFinanceOrAdmin && (
                      <TableCell align="right">
                        <Tooltip title="Delete Advance Record">
                          <IconButton onClick={() => handleDelete(adv.id)} sx={{ color: 'var(--color-error)' }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Issue advance dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
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
          Issue Salary Advance
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ py: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth required error={!!formErrors.employee_id} sx={selectStyles}>
                  <InputLabel id="employee-select-label" sx={{ color: 'var(--color-text-secondary)' }}>Select Employee</InputLabel>
                  <Select
                    labelId="employee-select-label"
                    value={formData.employee_id}
                    label="Select Employee"
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value as string })}
                  >
                    {employees.map((e: any) => (
                      <MenuItem key={e.id} value={e.id}>{e.employee_code} - {e.name}</MenuItem>
                    ))}
                  </Select>
                  {formErrors.employee_id && (
                    <Typography variant="caption" color="var(--color-error)" sx={{ mt: 0.5, ml: 1.5 }}>
                      {formErrors.employee_id}
                    </Typography>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Advance Amount (₹)"
                  type="number"
                  fullWidth
                  required
                  inputProps={{ min: 1 }}
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  error={!!formErrors.amount}
                  helperText={formErrors.amount}
                  sx={inputStyles}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Advance Issue Date"
                  type="date"
                  fullWidth
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  error={!!formErrors.date}
                  helperText={formErrors.date}
                  sx={inputStyles}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Reason / Remarks"
                  fullWidth
                  multiline
                  rows={2}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  error={!!formErrors.reason}
                  helperText={formErrors.reason}
                  sx={inputStyles}
                />
              </Grid>

              {/* Recovery config subheader */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ color: 'var(--color-primary-hover)', fontWeight: 600 }}>
                  RECOVERY PLAN CONFIGURATION
                </Typography>
                <Divider sx={{ borderColor: 'var(--color-border)', mt: 1 }} />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required error={!!formErrors.recovery_type} sx={selectStyles}>
                  <InputLabel id="recovery-type-label" sx={{ color: 'var(--color-text-secondary)' }}>Recovery Type</InputLabel>
                  <Select
                    labelId="recovery-type-label"
                    value={formData.recovery_type}
                    label="Recovery Type"
                    onChange={(e) => setFormData({ ...formData, recovery_type: e.target.value as 'one_time' | 'installment' })}
                  >
                    <MenuItem value="one_time">One Time Recovery</MenuItem>
                    <MenuItem value="installment">Installment Schedule</MenuItem>
                  </Select>
                  {formErrors.recovery_type && (
                    <Typography variant="caption" color="var(--color-error)" sx={{ mt: 0.5, ml: 1.5 }}>
                      {formErrors.recovery_type}
                    </Typography>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Monthly Installment (₹)"
                  type="number"
                  fullWidth
                  disabled={formData.recovery_type === 'one_time'}
                  required={formData.recovery_type === 'installment'}
                  inputProps={{ min: 1 }}
                  value={formData.installment_amount}
                  onChange={(e) => setFormData({ ...formData, installment_amount: e.target.value })}
                  error={!!formErrors.installment_amount}
                  helperText={formErrors.installment_amount}
                  sx={inputStyles}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth error={!!formErrors.start_month} sx={selectStyles}>
                  <InputLabel id="start-month-label" sx={{ color: 'var(--color-text-secondary)' }}>Start Month</InputLabel>
                  <Select
                    labelId="start-month-label"
                    value={formData.start_month}
                    label="Start Month"
                    onChange={(e) => setFormData({ ...formData, start_month: e.target.value as number })}
                  >
                    {months.map((m) => (
                      <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                    ))}
                  </Select>
                  {formErrors.start_month && (
                    <Typography variant="caption" color="var(--color-error)" sx={{ mt: 0.5, ml: 1.5 }}>
                      {formErrors.start_month}
                    </Typography>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth error={!!formErrors.start_year} sx={selectStyles}>
                  <InputLabel id="start-year-label" sx={{ color: 'var(--color-text-secondary)' }}>Start Year</InputLabel>
                  <Select
                    labelId="start-year-label"
                    value={formData.start_year}
                    label="Start Year"
                    onChange={(e) => setFormData({ ...formData, start_year: e.target.value as number })}
                  >
                    {years.map((y) => (
                      <MenuItem key={y} value={y}>{y}</MenuItem>
                    ))}
                  </Select>
                  {formErrors.start_year && (
                    <Typography variant="caption" color="var(--color-error)" sx={{ mt: 0.5, ml: 1.5 }}>
                      {formErrors.start_year}
                    </Typography>
                  )}
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <Button onClick={() => setOpenDialog(false)} sx={{ color: 'var(--color-text-secondary)', textTransform: 'none' }}>
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
              Issue loan
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Notifications */}
      <Snackbar
        open={notification?.open}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{ zIndex: 2000 }}
      >
        <Alert onClose={() => setNotification(null)} severity={notification?.severity} sx={{ width: '100%' }}>
          {notification?.message}
        </Alert>
      </Snackbar>
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
    '&.Mui-disabled fieldset': { borderColor: 'rgba(255, 255, 255, 0.04)' },
  },
  '& .MuiInputLabel-root': { color: 'var(--color-text-secondary)' },
  '& .MuiInputLabel-root.Mui-focused': { color: 'var(--color-primary-hover)' },
  '& .MuiInputLabel-root.Mui-disabled': { color: 'var(--color-text-disabled)' },
};

const selectStyles = {
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

export default Advances;
