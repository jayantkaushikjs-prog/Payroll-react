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
  ToggleButton,
  ToggleButtonGroup,
  InputLabel,
  CircularProgress,
  IconButton,
  Tooltip,
  Divider,
  FormControlLabel,
  Switch,
  Chip,
} from '@mui/material';
import { useToast } from '../context/ToastContext';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  HistoryEdu as LogIcon,
  CurrencyExchange as ReturnIcon,
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
  is_advance_salary: boolean;
  entry_type?: 'manual' | 'payroll';
}

interface AdvanceLog {
  id: number;
  employee_id: number;
  employee: Employee;
  amount: number;
  borrowed_date: string;
  tentative_return_date: string | null;
  actual_return_date: string | null;
  notes: string | null;
  status: 'open' | 'returned' | 'partially_returned';
  amount_returned: number;
  created_at: string;
}

interface SalaryStructure {
  employee?: Employee & { active_status?: boolean };
}

const Advances: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState<EmployeeAdvance | null>(null);
  const [openReturnDialog, setOpenReturnDialog] = useState(false);
  const [selectedReturnAdvance, setSelectedReturnAdvance] = useState<EmployeeAdvance | null>(null);
  const [returnForm, setReturnForm] = useState({ amount: 0, date: new Date().toISOString().split('T')[0], notes: '' });

  // Advance Log dialog state
  const [openLogDialog, setOpenLogDialog] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AdvanceLog | null>(null);
  const [openBreakdownDialog, setOpenBreakdownDialog] = useState(false);
  const [selectedAdvanceForBreakdown, setSelectedAdvanceForBreakdown] = useState<EmployeeAdvance | null>(null);
  const [logForm, setLogForm] = useState({
    employee_id: '',
    amount: 0,
    borrowed_date: new Date().toISOString().split('T')[0],
    tentative_return_date: '',
    actual_return_date: '',
    notes: '',
    status: 'open' as 'open' | 'returned' | 'partially_returned',
    amount_returned: 0,
  });
  const [formErrors, setFormErrors] = useState({
    employee_id: '',
    amount: '',
    date: '',
    reason: '',
    recovery_type: '',
    installment_months: '',
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
    installment_months: '',
    installment_amount: '',
    start_month: new Date().getMonth() + 1,
    start_year: currentYear,
    is_advance_salary: false,
    entry_type: 'payroll' as 'manual' | 'payroll',
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

  // Fetch advance logs
  const { data: advanceLogs = [], isLoading: logsLoading } = useQuery(['advance-logs'], async () => {
    const res = await api.get('/advances/logs');
    return res.data;
  });

  const calculatedInstallmentAmount =
    formData.recovery_type === 'installment' && Number(formData.amount) > 0 && Number(formData.installment_months) > 0
      ? Number((Number(formData.amount) / Number(formData.installment_months)).toFixed(2))
      : '';

  const handleMutationError = (err: any, fallbackMessage: string) => {
    const backendMessage = err.response?.data?.message;
    const errors = {
      employee_id: '',
      amount: '',
      date: '',
      reason: '',
      recovery_type: '',
      installment_months: '',
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
          errors.installment_months = msg;
        } else if (lowerMsg.includes('month')) {
          errors.start_month = msg;
        } else if (lowerMsg.includes('year')) {
          errors.start_year = msg;
        }
      });
      setFormErrors(errors);
      showToast('Please correct the highlighted validation errors.', 'error');
    } else {
      showToast(backendMessage || fallbackMessage, 'error');
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
        queryClient.invalidateQueries(['advance-logs']);
        showToast('Employee advance issued successfully!', 'success');
        setOpenDialog(false);
      },
      onError: (err: any) => {
        handleMutationError(err, 'Failed to issue advance');
      },
    }
  );

  // Update mutation
  const updateMutation = useMutation(
    async ({ id, payload }: { id: number; payload: any }) => {
      const res = await api.put(`/advances/${id}`, payload);
      return res.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['advances']);
        queryClient.invalidateQueries(['advance-logs']);
        showToast('Employee advance updated successfully!', 'success');
        setOpenDialog(false);
      },
      onError: (err: any) => {
        handleMutationError(err, 'Failed to update advance');
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
        showToast('Advance log deleted.', 'success');
      },
      onError: (err: any) => {
        showToast(err.response?.data?.message || 'Failed to delete advance log', 'error');
      },
    }
  );

  const manualReturnMutation = useMutation(
    async ({ id, payload }: { id: number; payload: any }) => {
      const res = await api.post(`/advances/${id}/manual-return`, payload);
      return res.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['advances']);
        queryClient.invalidateQueries(['advance-logs']);
        showToast('Manual return recorded successfully!', 'success');
        setOpenReturnDialog(false);
      },
      onError: (err: any) => {
        showToast(err.response?.data?.message || 'Failed to record manual return', 'error');
      },
    }
  );

  // Advance Log mutations
  const createLogMutation = useMutation(
    async (payload: any) => { const res = await api.post('/advances/logs', payload); return res.data; },
    {
      onSuccess: () => { queryClient.invalidateQueries(['advance-logs']); showToast('Log added!', 'success'); setOpenLogDialog(false); },
      onError: (err: any) => { showToast(err.response?.data?.message || 'Failed to add log', 'error'); },
    }
  );

  const updateLogMutation = useMutation(
    async ({ id, payload }: { id: number; payload: any }) => { const res = await api.put(`/advances/logs/${id}`, payload); return res.data; },
    {
      onSuccess: () => { queryClient.invalidateQueries(['advance-logs']); showToast('Log updated!', 'success'); setOpenLogDialog(false); },
      onError: (err: any) => { showToast(err.response?.data?.message || 'Failed to update log', 'error'); },
    }
  );

  const deleteLogMutation = useMutation(
    async (id: number) => { await api.delete(`/advances/logs/${id}`); },
    {
      onSuccess: () => { queryClient.invalidateQueries(['advance-logs']); showToast('Log deleted.', 'success'); },
      onError: (err: any) => { showToast(err.response?.data?.message || 'Failed to delete log', 'error'); },
    }
  );

  const handleOpenAdd = () => {
    setSelectedAdvance(null);
    setFormErrors({
      employee_id: '',
      amount: '',
      date: '',
      reason: '',
      recovery_type: '',
      installment_months: '',
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
      installment_months: '',
      installment_amount: '',
      start_month: new Date().getMonth() + 1,
      start_year: currentYear,
      is_advance_salary: false,
      entry_type: 'payroll',
    });
    setOpenDialog(true);
  };

  const handleOpenEdit = (adv: EmployeeAdvance) => {
    setSelectedAdvance(adv);
    setFormErrors({
      employee_id: '',
      amount: '',
      date: '',
      reason: '',
      recovery_type: '',
      installment_months: '',
      installment_amount: '',
      start_month: '',
      start_year: '',
    });
    setFormData({
      employee_id: String(adv.employee_id),
      amount: Number(adv.amount),
      date: adv.date,
      reason: adv.reason || '',
      recovery_type: adv.recovery_type,
      installment_months: adv.recovery_type === 'installment' && adv.installment_amount
        ? String(Math.ceil(Number(adv.amount) / Number(adv.installment_amount)))
        : '',
      installment_amount: adv.installment_amount ? String(adv.installment_amount) : '',
      start_month: adv.start_month,
      start_year: adv.start_year,
      is_advance_salary: adv.is_advance_salary || false,
      entry_type: adv.entry_type || 'payroll',
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
      installment_months: '',
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
      if (!formData.installment_months) {
        nextErrors.installment_months = 'No. of months is required for installment recovery';
        isValid = false;
      } else if (Number(formData.installment_months) < 1) {
        nextErrors.installment_months = 'No. of months must be at least 1';
        isValid = false;
      } else if (!Number.isInteger(Number(formData.installment_months))) {
        nextErrors.installment_months = 'No. of months must be a whole number';
        isValid = false;
      } else if (Number(formData.amount) / Number(formData.installment_months) < 1) {
        nextErrors.installment_months = 'No. of months is too high for this advance amount';
        isValid = false;
      }
    }

    setFormErrors(nextErrors);

    if (!isValid) {
      showToast('Please correct the highlighted validation errors.', 'error');
      return;
    }

    const payload = {
      employee_id: Number(formData.employee_id),
      amount: Number(formData.amount),
      date: formData.date,
      reason: formData.reason,
      recovery_type: formData.recovery_type,
      installment_amount: formData.recovery_type === 'installment'
        ? Number((Number(formData.amount) / Number(formData.installment_months)).toFixed(2))
        : null,
      start_month: Number(formData.start_month),
      start_year: Number(formData.start_year),
      is_advance_salary: formData.is_advance_salary,
      entry_type: formData.entry_type,
    };

    if (selectedAdvance) {
      updateMutation.mutate({ id: selectedAdvance.id, payload });
    } else {
      createMutation.mutate(payload);
    }
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
      showToast('Advances report exported successfully!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to export CSV', 'error');
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this advance? WARNING: This will revert recoveries.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleOpenAddLog = () => {
    setSelectedLog(null);
    setLogForm({
      employee_id: '',
      amount: 0,
      borrowed_date: new Date().toISOString().split('T')[0],
      tentative_return_date: '',
      actual_return_date: '',
      notes: '',
      status: 'open',
      amount_returned: 0,
    });
    setOpenLogDialog(true);
  };

  const handleOpenEditLog = (log: AdvanceLog) => {
    setSelectedLog(log);
    setLogForm({
      employee_id: String(log.employee_id),
      amount: Number(log.amount),
      borrowed_date: log.borrowed_date,
      tentative_return_date: log.tentative_return_date || '',
      actual_return_date: log.actual_return_date || '',
      notes: log.notes || '',
      status: log.status,
      amount_returned: Number(log.amount_returned),
    });
    setOpenLogDialog(true);
  };

  const handleSubmitLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logForm.employee_id || Number(logForm.amount) < 1) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }
    const payload: any = {
      employee_id: Number(logForm.employee_id),
      amount: Number(logForm.amount),
      borrowed_date: logForm.borrowed_date,
      tentative_return_date: logForm.tentative_return_date || undefined,
      actual_return_date: logForm.actual_return_date || undefined,
      notes: logForm.notes || undefined,
      status: logForm.status,
      amount_returned: Number(logForm.amount_returned) || 0,
    };
    if (selectedLog) {
      updateLogMutation.mutate({ id: selectedLog.id, payload });
    } else {
      createLogMutation.mutate(payload);
    }
  };

  const handleDeleteLog = (id: number) => {
    if (window.confirm('Delete this advance log?')) deleteLogMutation.mutate(id);
  };

  const handleOpenReturnDialog = (adv: EmployeeAdvance) => {
    setSelectedReturnAdvance(adv);
    setReturnForm({
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setOpenReturnDialog(true);
  };

  const handleSubmitReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturnAdvance) return;
    if (Number(returnForm.amount) <= 0) {
      showToast('Return amount must be greater than 0.', 'error');
      return;
    }

    if (selectedReturnAdvance.entry_type === 'payroll') {
      const confirmSwitch = window.confirm(
        'This advance is currently set to be recovered via payroll.\n\n' +
        'By recording a manual return, the recovery mode will be permanently switched to Manual, and automatic payroll deductions will stop for this advance.\n\n' +
        'Are you sure you want to proceed and change it to Manual?'
      );
      if (!confirmSwitch) return;
      
      updateMutation.mutate({
        id: selectedReturnAdvance.id,
        payload: { entry_type: 'manual' },
      });
    }

    manualReturnMutation.mutate({
      id: selectedReturnAdvance.id,
      payload: {
        amount: Number(returnForm.amount),
        date: returnForm.date,
        notes: returnForm.notes || undefined,
      },
    });
  };

  const handleOpenBreakdown = (adv: EmployeeAdvance) => {
    setSelectedAdvanceForBreakdown(adv);
    setOpenBreakdownDialog(true);
  };

  const breakdownLogs = selectedAdvanceForBreakdown
    ? advanceLogs.filter((log: AdvanceLog) => log.employee_id === selectedAdvanceForBreakdown.employee_id)
    : [];

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

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

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
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Issue Date</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Total Advance</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Recovery Type</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Monthly Installment</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Recovered</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Remaining</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Start Month/Year</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Entry</TableCell>
                <TableCell align="right" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 3 }}>
                    <CircularProgress size={30} sx={{ color: 'var(--color-primary)' }} />
                  </TableCell>
                </TableRow>
              ) : advances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 3, color: 'var(--color-text-muted)' }}>
                    No advances issued.
                  </TableCell>
                </TableRow>
              ) : (
                advances.map((adv: EmployeeAdvance) => {
                  const statusLabel = adv.is_fully_recovered
                    ? 'Recovered'
                    : Number(adv.total_recovered) > 0
                      ? 'Partially Returned'
                      : 'Active';
                  const statusBg = adv.is_fully_recovered
                    ? 'rgba(16, 185, 129, 0.15)'
                    : Number(adv.total_recovered) > 0
                      ? 'rgba(99, 102, 241, 0.15)'
                      : 'rgba(251, 191, 36, 0.15)';
                  const statusColor = adv.is_fully_recovered
                    ? 'var(--color-success)'
                    : Number(adv.total_recovered) > 0
                      ? 'var(--color-primary)'
                      : 'var(--color-warning)';

                  return (
                    <TableRow key={adv.id} sx={{ '&:hover': { bgcolor: 'var(--color-row-hover)' }, borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                      <TableCell sx={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{adv.employee?.employee_code}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{adv.employee?.name}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)' }}>{new Date(adv.date).toLocaleDateString('en-IN')}</TableCell>
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
                            bgcolor: statusBg,
                            color: statusColor,
                          }}
                        >
                          {statusLabel}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)', textTransform: 'capitalize' }}>
                        {adv.entry_type === 'payroll' ? 'Via Payroll' : 'Manual'}
                      </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<LogIcon />}
                        onClick={() => handleOpenBreakdown(adv)}
                        sx={{
                          mr: 1,
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text-secondary)',
                          textTransform: 'none',
                          borderRadius: 'var(--radius-control)',
                          '&:hover': {
                            borderColor: 'var(--color-primary)',
                            color: 'var(--color-primary)',
                            bgcolor: 'var(--color-surface-subtle)',
                          },
                        }}
                      >
                        Breakdown
                      </Button>
                      {isFinanceOrAdmin && (
                        <>
                          <Tooltip title="Record Manual Return">
                            <IconButton onClick={() => handleOpenReturnDialog(adv)} sx={{ color: 'var(--color-accent)', '&:hover': { color: 'var(--color-primary)' }, mr: 1 }}>
                              <ReturnIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Advance Record">
                            <IconButton onClick={() => handleOpenEdit(adv)} sx={{ color: 'var(--color-text-secondary)', '&:hover': { color: 'var(--color-primary)' }, mr: 1 }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Advance Record">
                            <IconButton onClick={() => handleDelete(adv.id)} sx={{ color: 'var(--color-error)' }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
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

      {/* Manual return dialog */}
      <Dialog
        open={openReturnDialog}
        onClose={() => setOpenReturnDialog(false)}
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
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)', pb: 2 }}>
          Record Manual Return
        </DialogTitle>
        <form onSubmit={handleSubmitReturn}>
          <DialogContent sx={{ py: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  label="Return Amount (₹)"
                  type="number"
                  fullWidth
                  required
                  inputProps={{ min: 1 }}
                  value={returnForm.amount === 0 ? '' : returnForm.amount}
                  onChange={(e) => setReturnForm({ ...returnForm, amount: parseFloat(e.target.value) || 0 })}
                  sx={inputStyles}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Return Date"
                  type="date"
                  fullWidth
                  required
                  value={returnForm.date}
                  onChange={(e) => setReturnForm({ ...returnForm, date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  sx={inputStyles}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Notes"
                  fullWidth
                  multiline
                  rows={2}
                  value={returnForm.notes}
                  onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
                  sx={inputStyles}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <Button onClick={() => setOpenReturnDialog(false)} sx={{ color: 'var(--color-text-secondary)', textTransform: 'none' }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                background: 'var(--color-accent)',
                borderRadius: 'var(--radius-control)',
                px: 3,
                textTransform: 'none',
              }}
            >
              Record Return
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Issue/Edit advance dialog */}
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
          {selectedAdvance ? 'Edit Salary Advance' : 'Issue Salary Advance'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ py: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth error={!!formErrors.employee_id} variant="outlined">
                  <InputLabel shrink>Select Employee *</InputLabel>
                  <Select
                    labelId="employee-select-label"
                    value={formData.employee_id}
                    label="Select Employee"
                    disabled={!!selectedAdvance}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value as string })}
                  >
                    {selectedAdvance ? (
                      <MenuItem value={selectedAdvance.employee_id}>
                        {selectedAdvance.employee?.employee_code} - {selectedAdvance.employee?.name}
                      </MenuItem>
                    ) : (
                      employees.map((e: any) => (
                        <MenuItem key={e.id} value={e.id}>{e.employee_code} - {e.name}</MenuItem>
                      ))
                    )}
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
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Advance Amount (₹)"
                  type="number"
                  fullWidth
                  required
                  inputProps={{ min: 1 }}
                  value={formData.amount === 0 ? '' : formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  error={!!formErrors.amount}
                  helperText={formErrors.amount}
                  sx={inputStyles}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_advance_salary}
                      onChange={(e) => setFormData({ ...formData, is_advance_salary: e.target.checked })}
                      color="primary"
                    />
                  }
                  label="Advance Salary (Disables next month's net salary to recover this advance)"
                  sx={{ color: 'var(--color-text-primary)' }}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ color: 'var(--color-primary-hover)', fontWeight: 600, mb: 1 }}>
                  ENTRY TYPE
                </Typography>
                <ToggleButtonGroup
                  color="primary"
                  value={formData.entry_type}
                  exclusive
                  onChange={(_, value) => value && setFormData({ ...formData, entry_type: value })}
                  sx={{ '& .MuiToggleButton-root': { color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' } }}
                >
                  <ToggleButton value="manual">Manual</ToggleButton>
                  <ToggleButton value="payroll">Via Payroll</ToggleButton>
                </ToggleButtonGroup>
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

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth error={!!formErrors.recovery_type} variant="outlined">
                  <InputLabel shrink>Recovery Method *</InputLabel>
                  <Select
                    labelId="recovery-type-label"
                    value={formData.recovery_type}
                    label="Recovery Method"
                    onChange={(e) => {
                      const recoveryType = e.target.value as 'one_time' | 'installment';
                      setFormData({
                        ...formData,
                        recovery_type: recoveryType,
                        installment_months: recoveryType === 'installment' ? formData.installment_months : '',
                        installment_amount: recoveryType === 'installment' ? formData.installment_amount : '',
                      });
                    }}
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
              <Grid item xs={12} sm={4}>
                <TextField
                  label="No. of Months"
                  type="number"
                  fullWidth
                  disabled={formData.recovery_type === 'one_time'}
                  required={formData.recovery_type === 'installment'}
                  inputProps={{ min: 1 }}
                  value={formData.installment_months}
                  onChange={(e) => setFormData({ ...formData, installment_months: e.target.value })}
                  error={!!formErrors.installment_months}
                  helperText={formErrors.installment_months}
                  sx={inputStyles}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Monthly Installment (₹)"
                  type="number"
                  fullWidth
                  disabled
                  value={calculatedInstallmentAmount}
                  helperText={formData.recovery_type === 'installment' && calculatedInstallmentAmount ? 'Auto-calculated' : ''}
                  sx={inputStyles}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth error={!!formErrors.start_month} variant="outlined">
                  <InputLabel shrink>Start Month *</InputLabel>
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
              {selectedAdvance ? 'Save Changes' : 'Issue Advance'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={openBreakdownDialog}
        onClose={() => setOpenBreakdownDialog(false)}
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
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)', pb: 2 }}>
          Advance Breakdown
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          {selectedAdvanceForBreakdown && (
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ color: 'var(--color-text-primary)', mb: 1 }}>
                {selectedAdvanceForBreakdown.employee?.employee_code} - {selectedAdvanceForBreakdown.employee?.name}
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mb: 3 }}>
                Issued {new Date(selectedAdvanceForBreakdown.date).toLocaleDateString('en-IN')} · Remaining {formatCurrency(selectedAdvanceForBreakdown.remaining_amount)}
              </Typography>

              <TableContainer component={Paper} sx={{ background: 'var(--color-surface-subtle)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-control)' }}>
                <Table>
                  <TableHead sx={{ bgcolor: 'var(--color-surface)' }}>
                    <TableRow>
                      <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Date</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Amount</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Returned</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {logsLoading ? (
                      <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}><CircularProgress size={24} sx={{ color: 'var(--color-primary)' }} /></TableCell></TableRow>
                    ) : breakdownLogs.length === 0 ? (
                      <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: 'var(--color-text-muted)' }}>No history found for this advance.</TableCell></TableRow>
                    ) : (
                      breakdownLogs.map((log: AdvanceLog) => (
                        <TableRow key={log.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                          <TableCell sx={{ color: 'var(--color-text-primary)' }}>{new Date(log.borrowed_date).toLocaleDateString('en-IN')}</TableCell>
                          <TableCell sx={{ color: 'var(--color-text-primary)' }}>{formatCurrency(log.amount)}</TableCell>
                          <TableCell sx={{ color: 'var(--color-success)' }}>{Number(log.amount_returned) > 0 ? formatCurrency(log.amount_returned) : '—'}</TableCell>
                          <TableCell sx={{ color: 'var(--color-text-primary)', textTransform: 'capitalize' }}>{log.status.replace('_', ' ')}</TableCell>
                          <TableCell sx={{ color: 'var(--color-text-secondary)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <Tooltip title={log.notes || ''} arrow>
                              <span>{log.notes || '—'}</span>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <Button onClick={() => setOpenBreakdownDialog(false)} sx={{ color: 'var(--color-text-secondary)', textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Add/Edit Log Dialog ──────────────────────────────────────────────── */}
      <Dialog open={openLogDialog} onClose={() => setOpenLogDialog(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: 'var(--color-surface)', backgroundImage: 'none', color: 'var(--color-text-primary)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)' } }}
      >
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)', pb: 2 }}>
          {selectedLog ? 'Edit Borrow Log' : 'Add Borrow Log'}
        </DialogTitle>
        <form onSubmit={handleSubmitLog}>
          <DialogContent sx={{ py: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth required sx={selectStyles}>
                  <InputLabel sx={{ color: 'var(--color-text-secondary)' }}>Select Employee</InputLabel>
                  <Select
                    value={logForm.employee_id}
                    label="Select Employee"
                    disabled={!!selectedLog}
                    onChange={(e) => setLogForm({ ...logForm, employee_id: e.target.value as string })}
                  >
                    {selectedLog ? (
                      <MenuItem value={selectedLog.employee_id}>{selectedLog.employee?.employee_code} - {selectedLog.employee?.name}</MenuItem>
                    ) : (
                      employees.map((e: any) => (<MenuItem key={e.id} value={e.id}>{e.employee_code} - {e.name}</MenuItem>))
                    )}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Amount Borrowed (₹)" type="number" fullWidth required inputProps={{ min: 1 }}
                  value={logForm.amount === 0 ? '' : logForm.amount}
                  onChange={(e) => setLogForm({ ...logForm, amount: parseFloat(e.target.value) || 0 })}
                  sx={inputStyles} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Borrowed Date" type="date" fullWidth required InputLabelProps={{ shrink: true }}
                  value={logForm.borrowed_date}
                  onChange={(e) => setLogForm({ ...logForm, borrowed_date: e.target.value })}
                  sx={inputStyles} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Tentative Return Date" type="date" fullWidth InputLabelProps={{ shrink: true }}
                  value={logForm.tentative_return_date}
                  onChange={(e) => setLogForm({ ...logForm, tentative_return_date: e.target.value })}
                  sx={inputStyles} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Actual Return Date" type="date" fullWidth InputLabelProps={{ shrink: true }}
                  value={logForm.actual_return_date}
                  onChange={(e) => setLogForm({ ...logForm, actual_return_date: e.target.value })}
                  sx={inputStyles} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Amount Returned (₹)" type="number" fullWidth inputProps={{ min: 0 }}
                  value={logForm.amount_returned === 0 ? '' : logForm.amount_returned}
                  onChange={(e) => setLogForm({ ...logForm, amount_returned: parseFloat(e.target.value) || 0 })}
                  sx={inputStyles} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth sx={selectStyles}>
                  <InputLabel sx={{ color: 'var(--color-text-secondary)' }}>Status</InputLabel>
                  <Select value={logForm.status} label="Status" onChange={(e) => setLogForm({ ...logForm, status: e.target.value as any })}>
                    <MenuItem value="open">Open</MenuItem>
                    <MenuItem value="partially_returned">Partially Returned</MenuItem>
                    <MenuItem value="returned">Returned</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField label="Notes" fullWidth multiline rows={2}
                  value={logForm.notes}
                  onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                  sx={inputStyles} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <Button onClick={() => setOpenLogDialog(false)} sx={{ color: 'var(--color-text-secondary)', textTransform: 'none' }}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ background: 'var(--color-accent)', borderRadius: 'var(--radius-control)', px: 3, textTransform: 'none' }}>
              {selectedLog ? 'Save Changes' : 'Add Log'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

const inputStyles = {
  '& .MuiOutlinedInput-root': {
    color: 'var(--color-text-primary)',
    borderRadius: 'var(--radius-control)',
    '& fieldset': { borderColor: 'var(--color-border)' },
    '&.Mui-focused fieldset': { borderColor: 'var(--color-primary)' },
    '&.Mui-disabled fieldset': { borderColor: 'var(--color-border)' },
    '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
      '-webkit-appearance': 'none',
      margin: 0,
    },
    '& input[type=number]': {
      '-moz-appearance': 'textfield',
    },
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
    '&.Mui-focused fieldset': { borderColor: 'var(--color-primary)' },
  },
  '& .MuiInputLabel-root': { color: 'var(--color-text-secondary)' },
  '& .MuiInputLabel-root.Mui-focused': { color: 'var(--color-primary-hover)' },
};

export default Advances;
