import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
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
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';

interface Employee {
  id: number;
  employee_code: string;
  name: string;
}

interface NonPayableDays {
  id: number;
  employee_id: number;
  employee: Employee;
  month: number;
  year: number;
  days: number;
}

const NonPayableDays: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  
  // Filters
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState<number>(currentYear);

  // Dialog State
  const [openDialog, setOpenDialog] = useState(false);
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' } | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    employee_id: '',
    month: new Date().getMonth() + 1,
    year: currentYear,
    days: 0,
  });

  const isHRorAdmin = user && (user.role === Role.SUPER_ADMIN || user.role === Role.HR);

  // Fetch active employees for dropdown
  const { data: employees = [] } = useQuery(['employees'], async () => {
    const res = await api.get('/employees');
    return res.data.filter((e: any) => e.active_status);
  });

  // Fetch non-payable days logs with filters
  const { data: unpaidLogs = [], isLoading } = useQuery(
    ['nonPayableDays', filterMonth, filterYear],
    async () => {
      const res = await api.get(`/non-payable-days/filter?month=${filterMonth}&year=${filterYear}`);
      return res.data;
    }
  );

  // Upsert (Create/Update) mutation
  const upsertMutation = useMutation(
    async (payload: any) => {
      const res = await api.post('/non-payable-days', payload);
      return res.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['nonPayableDays']);
        setNotification({ open: true, message: 'Unpaid days logged successfully!', severity: 'success' });
        setOpenDialog(false);
      },
      onError: (err: any) => {
        setNotification({ open: true, message: err.response?.data?.message || 'Failed to log unpaid days', severity: 'error' });
      },
    }
  );

  // Delete mutation
  const deleteMutation = useMutation(
    async (id: number) => {
      await api.delete(`/non-payable-days/${id}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['nonPayableDays']);
        setNotification({ open: true, message: 'Attendance log deleted.', severity: 'success' });
      },
      onError: (err: any) => {
        setNotification({ open: true, message: err.response?.data?.message || 'Failed to delete attendance log', severity: 'error' });
      },
    }
  );

  const handleOpenAdd = () => {
    setFormData({
      employee_id: '',
      month: filterMonth,
      year: filterYear,
      days: 0,
    });
    setOpenDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_id) {
      setNotification({ open: true, message: 'Please select an employee', severity: 'error' });
      return;
    }
    upsertMutation.mutate({
      employee_id: Number(formData.employee_id),
      month: Number(formData.month),
      year: Number(formData.year),
      days: Number(formData.days),
    });
  };

  const handleExportCsv = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await api.get('/reports/non-payable-days/csv', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `non-payable-days_${today}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      setNotification({ open: true, message: 'Non-payable days exported successfully!', severity: 'success' });
    } catch (err: any) {
      setNotification({ open: true, message: err.response?.data?.message || 'Failed to export CSV', severity: 'error' });
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this unpaid day record?')) {
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

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)' }}>
            Non Payable Days (Absences)
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mt: 0.5 }}>
            Record unpaid leaves to automatically deduct daily rates during payroll run.
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
          {isHRorAdmin && (
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
              Log Absences
            </Button>
          )}
        </Box>
      </Box>

      {/* Filter Header */}
      <Paper
        sx={{
          background: 'var(--color-surface)',
          
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card)',
          p: 3,
          mb: 3,
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth sx={selectStyles}>
              <InputLabel id="filter-month-label" sx={{ color: 'var(--color-text-secondary)' }}>Month</InputLabel>
              <Select
                labelId="filter-month-label"
                value={filterMonth}
                label="Month"
                onChange={(e) => setFilterMonth(e.target.value as number)}
              >
                {months.map((m) => (
                  <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth sx={selectStyles}>
              <InputLabel id="filter-year-label" sx={{ color: 'var(--color-text-secondary)' }}>Year</InputLabel>
              <Select
                labelId="filter-year-label"
                value={filterYear}
                label="Year"
                onChange={(e) => setFilterYear(e.target.value as number)}
              >
                {years.map((y) => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Table Paper */}
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
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Employee Code</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Employee Name</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Month / Year</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Unpaid Absence Days</TableCell>
                {isHRorAdmin && <TableCell align="right" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                    <CircularProgress size={30} sx={{ color: 'var(--color-primary)' }} />
                  </TableCell>
                </TableRow>
              ) : unpaidLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'var(--color-text-muted)' }}>
                    No unpaid absence records found for {months.find(m => m.value === filterMonth)?.label} {filterYear}.
                  </TableCell>
                </TableRow>
              ) : (
                unpaidLogs.map((log: NonPayableDays) => (
                  <TableRow key={log.id} sx={{ '&:hover': { bgcolor: 'var(--color-row-hover)' }, borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                    <TableCell sx={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{log.employee?.employee_code}</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{log.employee?.name}</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-primary)' }}>{months.find(m => m.value === log.month)?.label} {log.year}</TableCell>
                    <TableCell sx={{ color: 'var(--color-error)', fontWeight: 600 }}>{log.days} Days</TableCell>
                    {isHRorAdmin && (
                      <TableCell align="right">
                        <Tooltip title="Delete Log">
                          <IconButton onClick={() => handleDelete(log.id)} sx={{ color: 'var(--color-error)' }}>
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

      {/* Log absence dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="xs"
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
          Log Unpaid Absence
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ py: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth required sx={selectStyles}>
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
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth sx={selectStyles}>
                  <InputLabel id="form-month-label" sx={{ color: 'var(--color-text-secondary)' }}>Month</InputLabel>
                  <Select
                    labelId="form-month-label"
                    value={formData.month}
                    label="Month"
                    onChange={(e) => setFormData({ ...formData, month: e.target.value as number })}
                  >
                    {months.map((m) => (
                      <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth sx={selectStyles}>
                  <InputLabel id="form-year-label" sx={{ color: 'var(--color-text-secondary)' }}>Year</InputLabel>
                  <Select
                    labelId="form-year-label"
                    value={formData.year}
                    label="Year"
                    onChange={(e) => setFormData({ ...formData, year: e.target.value as number })}
                  >
                    {years.map((y) => (
                      <MenuItem key={y} value={y}>{y}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Unpaid Days Count"
                  type="number"
                  fullWidth
                  required
                  inputProps={{ step: 0.5, min: 0.5, max: 31 }}
                  value={formData.days}
                  onChange={(e) => setFormData({ ...formData, days: parseFloat(e.target.value) || 0 })}
                  sx={inputStyles}
                />
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
              Submit
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
  },
  '& .MuiInputLabel-root': { color: 'var(--color-text-secondary)' },
  '& .MuiInputLabel-root.Mui-focused': { color: 'var(--color-primary-hover)' },
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

export default NonPayableDays;
