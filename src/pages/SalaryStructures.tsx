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
} from '@mui/material';
import { useToast } from '../context/ToastContext';
import {
  History as HistoryIcon,
  Upgrade as RevisionIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';

interface Employee {
  id: number;
  employee_code: string;
  name: string;
  department: string;
  designation: string;
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
    basic_salary: '',
    hra: '',
    special_allowance: '',
    other_allowance: '',
    effective_from: '',
  });

  // Form State
  const [formData, setFormData] = useState({
    basic_salary: 0,
    hra: 0,
    special_allowance: 0,
    other_allowance: 0,
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
      basic_salary: '',
      hra: '',
      special_allowance: '',
      other_allowance: '',
      effective_from: '',
    };

    if (Array.isArray(backendMessage)) {
      backendMessage.forEach((msg: string) => {
        const lowerMsg = msg.toLowerCase();
        if (lowerMsg.includes('basic')) {
          errors.basic_salary = msg;
        } else if (lowerMsg.includes('hra')) {
          errors.hra = msg;
        } else if (lowerMsg.includes('special')) {
          errors.special_allowance = msg;
        } else if (lowerMsg.includes('other')) {
          errors.other_allowance = msg;
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
      basic_salary: '',
      hra: '',
      special_allowance: '',
      other_allowance: '',
      effective_from: '',
    });
    setFormData({
      basic_salary: current ? Number(current.basic_salary) : 0,
      hra: current ? Number(current.hra) : 0,
      special_allowance: current ? Number(current.special_allowance) : 0,
      other_allowance: current ? Number(current.other_allowance) : 0,
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
      basic_salary: '',
      hra: '',
      special_allowance: '',
      other_allowance: '',
      effective_from: '',
    };
    let isValid = true;

    if (Number(formData.basic_salary) < 0) {
      nextErrors.basic_salary = 'Basic salary cannot be negative';
      isValid = false;
    }
    if (Number(formData.hra) < 0) {
      nextErrors.hra = 'HRA cannot be negative';
      isValid = false;
    }
    if (Number(formData.special_allowance) < 0) {
      nextErrors.special_allowance = 'Special allowance cannot be negative';
      isValid = false;
    }
    if (Number(formData.other_allowance) < 0) {
      nextErrors.other_allowance = 'Other allowance cannot be negative';
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

    revisionMutation.mutate({
      employee_id: selectedEmp.id,
      basic_salary: Number(formData.basic_salary),
      hra: Number(formData.hra),
      special_allowance: Number(formData.special_allowance),
      other_allowance: Number(formData.other_allowance),
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
      link.click();
      URL.revokeObjectURL(link.href);
      showToast('Salary components exported successfully!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to export CSV', 'error');
    }
  };

  const calculatedGross =
    Number(formData.basic_salary) +
    Number(formData.hra) +
    Number(formData.special_allowance) +
    Number(formData.other_allowance);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)' }}>
            Salary Structures & Revisions
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mt: 0.5 }}>
            Manage employee salary bands and create historical revisions.
          </Typography>
        </Box>
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
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Basic Salary</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>HRA</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Special Allowance</TableCell>
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
                      }}
                    >
                      <TableCell sx={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{emp.employee_code}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{emp.name}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)' }}>{current ? formatCurrency(current.basic_salary) : '—'}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)' }}>{current ? formatCurrency(current.hra) : '—'}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)' }}>{current ? formatCurrency(current.special_allowance) : '—'}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)' }}>{current ? formatCurrency(current.other_allowance) : '—'}</TableCell>
                      <TableCell sx={{ color: current ? 'var(--color-success)' : 'var(--color-text-muted)', fontWeight: 600 }}>
                        {current ? formatCurrency(current.gross_salary) : '—'}
                      </TableCell>
                      <TableCell align="right">
                        {current ? (
                          <Button
                            size="small"
                            startIcon={<HistoryIcon />}
                            onClick={() => handleOpenHistory(emp)}
                            sx={{ color: 'var(--color-text-secondary)', mr: 1, textTransform: 'none' }}
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
                              bgcolor: current ? 'rgba(99, 102, 241, 0.15)' : 'var(--color-primary)',
                              color: current ? 'var(--color-primary-hover)' : '#ffffff',
                              border: current ? '1px solid rgba(99, 102, 241, 0.3)' : 'none',
                              borderRadius: 'var(--radius-control)',
                              textTransform: 'none',
                              '&:hover': {
                                bgcolor: 'var(--color-primary)',
                                color: '#ffffff',
                              },
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
          Revise Salary - {selectedEmp?.name}
        </DialogTitle>
        <form onSubmit={handleRevisionSubmit}>
          <DialogContent sx={{ py: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Basic Salary"
                  type="number"
                  fullWidth
                  required
                  value={formData.basic_salary}
                  onChange={(e) => setFormData({ ...formData, basic_salary: parseFloat(e.target.value) || 0 })}
                  error={!!formErrors.basic_salary}
                  helperText={formErrors.basic_salary}
                  sx={inputStyles}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="HRA"
                  type="number"
                  fullWidth
                  required
                  value={formData.hra}
                  onChange={(e) => setFormData({ ...formData, hra: parseFloat(e.target.value) || 0 })}
                  error={!!formErrors.hra}
                  helperText={formErrors.hra}
                  sx={inputStyles}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Special Allowance"
                  type="number"
                  fullWidth
                  required
                  value={formData.special_allowance}
                  onChange={(e) => setFormData({ ...formData, special_allowance: parseFloat(e.target.value) || 0 })}
                  error={!!formErrors.special_allowance}
                  helperText={formErrors.special_allowance}
                  sx={inputStyles}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Other Allowance"
                  type="number"
                  fullWidth
                  required
                  value={formData.other_allowance}
                  onChange={(e) => setFormData({ ...formData, other_allowance: parseFloat(e.target.value) || 0 })}
                  error={!!formErrors.other_allowance}
                  helperText={formErrors.other_allowance}
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
                <Card sx={{ bgcolor: 'var(--color-surface-subtle)', border: '1px dashed rgba(255, 255, 255, 0.1)', borderRadius: 'var(--radius-control)' }}>
                  <CardContent sx={{ py: '12px !important', px: 2 }}>
                    <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>
                      Calculated Gross
                    </Typography>
                    <Typography variant="h5" sx={{ color: 'var(--color-success)', fontWeight: 700, mt: 0.5, fontFamily: 'Outfit' }}>
                      {formatCurrency(calculatedGross)}
                    </Typography>
                  </CardContent>
                </Card>
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
              Submit Revision
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
                    <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Basic</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>HRA</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Special</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Other</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Gross</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {salaryHistory.map((hist: SalaryStructure) => (
                    <TableRow key={hist.id} sx={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                      <TableCell sx={{ color: 'var(--color-text-primary)' }}>{hist.effective_from}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)' }}>{formatCurrency(hist.basic_salary)}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)' }}>{formatCurrency(hist.hra)}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)' }}>{formatCurrency(hist.special_allowance)}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)' }}>{formatCurrency(hist.other_allowance)}</TableCell>
                      <TableCell sx={{ color: 'var(--color-success)', fontWeight: 600 }}>{formatCurrency(hist.gross_salary)}</TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: 'inline-block',
                            px: 1.2,
                            py: 0.2,
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            bgcolor: hist.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            color: hist.is_active ? 'var(--color-success)' : 'var(--color-text-muted)',
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
