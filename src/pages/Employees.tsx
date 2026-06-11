import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth, Role } from '../context/AuthContext';
import { formatCurrency } from '../constants/currency';
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
  IconButton,
  Tooltip,
  Grid,
  FormControlLabel,
  Switch,
  CircularProgress,
  Divider,
  Autocomplete,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import { useToast } from '../context/ToastContext';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  Upload as UploadIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { DEPARTMENT_OPTIONS, DESIGNATION_OPTIONS } from '../constants/employeeOptions';

interface Employee {
  id: number;
  employee_code: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  joining_date: string;
  bank_name: string;
  account_number: string;
  ifsc: string;
  tax_regime: string;
  active_status: boolean;
  pf_deduction?: boolean;
  tax_deduction?: boolean;
}

const Employees: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [formErrors, setFormErrors] = useState({
    employee_code: '',
    name: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    joining_date: '',
    bank_name: '',
    account_number: '',
    ifsc: '',
  });

  // Form Fields
  const [formData, setFormData] = useState({
    employee_code: '',
    name: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    joining_date: '',
    bank_name: '',
    account_number: '',
    ifsc: '',
    tax_regime: 'new',
    active_status: true,
    pf_deduction: true,
    tax_deduction: true,
  });

  const isHRorAdmin = user && (user.role === Role.SUPER_ADMIN || user.role === Role.HR);
  const isAdmin = user && user.role === Role.SUPER_ADMIN;

  // Fetch employees
  const { data: employees = [], isLoading } = useQuery(['employees'], async () => {
    const res = await api.get('/employees');
    return res.data;
  });

  // Profile Details Dialog State
  const [openProfileDialog, setOpenProfileDialog] = useState(false);

  // States for Detailed Employee Profile Tab
  const [profileEmpId, setProfileEmpId] = useState<number | ''>('');
  const [profileYear, setProfileYear] = useState<number>(new Date().getFullYear());
  const [profileFormData, setProfileFormData] = useState({
    employee_code: '',
    name: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    joining_date: '',
    bank_name: '',
    account_number: '',
    ifsc: '',
    tax_regime: 'new',
    active_status: true,
    pf_deduction: true,
    tax_deduction: true,
  });

  // Query for Detailed Employee Financial Summary
  const { data: profileSummary, isLoading: isLoadingProfileSummary } = useQuery(
    ['profileFinancialSummary', profileEmpId, profileYear],
    async () => {
      if (!profileEmpId) return null;
      const res = await api.get(`/employees/${profileEmpId}/financial-summary?year=${profileYear}`);
      return res.data;
    },
    {
      enabled: openProfileDialog && !!profileEmpId,
      onError: (err: any) => {
        showToast(err.response?.data?.message || 'Failed to fetch financial summary data', 'error');
      },
    }
  );

  // Effect to load employee details when profileEmpId is selected
  useEffect(() => {
    if (profileEmpId && employees.length > 0) {
      const emp = employees.find((e: any) => e.id === profileEmpId);
      if (emp) {
        setProfileFormData({
          employee_code: emp.employee_code || '',
          name: emp.name || '',
          email: emp.email || '',
          phone: emp.phone || '',
          department: emp.department || '',
          designation: emp.designation || '',
          joining_date: emp.joining_date || '',
          bank_name: emp.bank_name || '',
          account_number: emp.account_number || '',
          ifsc: emp.ifsc || '',
          tax_regime: emp.tax_regime || 'new',
          active_status: emp.active_status !== false,
          pf_deduction: emp.pf_deduction !== false,
          tax_deduction: emp.tax_deduction !== false,
        });
      }
    }
  }, [profileEmpId, employees]);

  // Profile update mutation
  const updateProfileMutation = useMutation(
    async ({ id, payload }: { id: number; payload: any }) => {
      const res = await api.put(`/employees/${id}`, payload);
      return res.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['employees']);
        showToast('Employee profile details saved successfully!', 'success');
      },
      onError: (err: any) => {
        showToast(err.response?.data?.message || 'Failed to update employee details', 'error');
      },
    }
  );

  const handleProfileFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileEmpId) return;
    updateProfileMutation.mutate({
      id: Number(profileEmpId),
      payload: profileFormData,
    });
  };



  const handleMutationError = (err: any, fallbackMessage: string) => {
    const backendMessage = err.response?.data?.message;
    const errors = {
      employee_code: '',
      name: '',
      email: '',
      phone: '',
      department: '',
      designation: '',
      joining_date: '',
      bank_name: '',
      account_number: '',
      ifsc: '',
    };

    if (Array.isArray(backendMessage)) {
      backendMessage.forEach((msg: string) => {
        const lowerMsg = msg.toLowerCase();
        if (lowerMsg.includes('employee code') || lowerMsg.includes('code')) {
          errors.employee_code = msg;
        } else if (lowerMsg.includes('name')) {
          errors.name = msg;
        } else if (lowerMsg.includes('email')) {
          errors.email = msg;
        } else if (lowerMsg.includes('phone')) {
          errors.phone = msg;
        } else if (lowerMsg.includes('department')) {
          errors.department = msg;
        } else if (lowerMsg.includes('designation')) {
          errors.designation = msg;
        } else if (lowerMsg.includes('joining')) {
          errors.joining_date = msg;
        } else if (lowerMsg.includes('bank')) {
          errors.bank_name = msg;
        } else if (lowerMsg.includes('account')) {
          errors.account_number = msg;
        } else if (lowerMsg.includes('ifsc')) {
          errors.ifsc = msg;
        }
      });
      setFormErrors(errors);
      showToast('Please correct the highlighted validation errors.', 'error');
    } else {
      showToast(backendMessage || fallbackMessage, 'error');
    }
  };

  // Create employee mutation
  const createMutation = useMutation(
    async (newEmp: typeof formData) => {
      const res = await api.post('/employees', newEmp);
      return res.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['employees']);
        showToast('Employee registered successfully!', 'success');
        setOpenDialog(false);
      },
      onError: (err: any) => {
        handleMutationError(err, 'Failed to register employee');
      },
    }
  );

  // Update employee mutation
  const updateMutation = useMutation(
    async ({ id, data }: { id: number; data: Partial<Employee> }) => {
      const res = await api.put(`/employees/${id}`, data);
      return res.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['employees']);
        showToast('Employee profile updated!', 'success');
        setOpenDialog(false);
      },
      onError: (err: any) => {
        handleMutationError(err, 'Failed to update employee');
      },
    }
  );

  // Delete employee mutation
  const deleteMutation = useMutation(
    async (id: number) => {
      await api.delete(`/employees/${id}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['employees']);
        showToast('Employee record removed.', 'success');
      },
      onError: (err: any) => {
        showToast(err.response?.data?.message || 'Failed to delete employee', 'error');
      },
    }
  );

  const handleOpenAddDialog = () => {
    setSelectedEmp(null);
    setFormErrors({
      employee_code: '',
      name: '',
      email: '',
      phone: '',
      department: '',
      designation: '',
      joining_date: '',
      bank_name: '',
      account_number: '',
      ifsc: '',
    });
    setFormData({
      employee_code: `EMP${String(employees.length + 1).padStart(3, '0')}`,
      name: '',
      email: '',
      phone: '',
      department: '',
      designation: '',
      joining_date: new Date().toISOString().split('T')[0],
      bank_name: '',
      account_number: '',
      ifsc: '',
      tax_regime: 'new',
      active_status: true,
      pf_deduction: true,
      tax_deduction: true,
    });
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (emp: Employee) => {
    setSelectedEmp(emp);
    setFormErrors({
      employee_code: '',
      name: '',
      email: '',
      phone: '',
      department: '',
      designation: '',
      joining_date: '',
      bank_name: '',
      account_number: '',
      ifsc: '',
    });
    setFormData({
      employee_code: emp.employee_code,
      name: emp.name,
      email: emp.email,
      phone: emp.phone || '',
      department: emp.department,
      designation: emp.designation,
      joining_date: emp.joining_date,
      bank_name: emp.bank_name,
      account_number: emp.account_number,
      ifsc: emp.ifsc,
      tax_regime: emp.tax_regime || 'new',
      active_status: emp.active_status,
      pf_deduction: emp.pf_deduction !== false,
      tax_deduction: emp.tax_deduction !== false,
    });
    setOpenDialog(true);
  };

  const handleOpenProfileDialog = (emp: Employee) => {
    setProfileEmpId(emp.id);
    setProfileFormData({
      employee_code: emp.employee_code || '',
      name: emp.name || '',
      email: emp.email || '',
      phone: emp.phone || '',
      department: emp.department || '',
      designation: emp.designation || '',
      joining_date: emp.joining_date || '',
      bank_name: emp.bank_name || '',
      account_number: emp.account_number || '',
      ifsc: emp.ifsc || '',
      tax_regime: emp.tax_regime || 'new',
      active_status: emp.active_status !== false,
      pf_deduction: emp.pf_deduction !== false,
      tax_deduction: emp.tax_deduction !== false,
    });
    setOpenProfileDialog(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = {
      employee_code: '',
      name: '',
      email: '',
      phone: '',
      department: '',
      designation: '',
      joining_date: '',
      bank_name: '',
      account_number: '',
      ifsc: '',
    };
    let isValid = true;

    // Employee Code
    if (!formData.employee_code || formData.employee_code.trim().length < 3 || formData.employee_code.trim().length > 20) {
      nextErrors.employee_code = 'Employee code must be between 3 and 20 characters';
      isValid = false;
    }

    // Name
    if (!formData.name || formData.name.trim().length < 2 || formData.name.trim().length > 100) {
      nextErrors.name = 'Name must be between 2 and 100 characters';
      isValid = false;
    }

    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email.trim())) {
      nextErrors.email = 'Invalid email address format';
      isValid = false;
    }

    // Phone (optional)
    if (formData.phone && !/^\d{10}$/.test(formData.phone.trim())) {
      nextErrors.phone = 'Phone number must be numeric and exactly 10 digits';
      isValid = false;
    }

    // Department
    if (!formData.department) {
      nextErrors.department = 'Department is required';
      isValid = false;
    }

    // Designation
    if (!formData.designation) {
      nextErrors.designation = 'Designation is required';
      isValid = false;
    }

    // Joining Date
    if (!formData.joining_date) {
      nextErrors.joining_date = 'Joining date is required';
      isValid = false;
    }

    // Bank Name
    if (!formData.bank_name || formData.bank_name.trim().length < 2 || formData.bank_name.trim().length > 100) {
      nextErrors.bank_name = 'Bank name must be between 2 and 100 characters';
      isValid = false;
    }

    // Account Number
    if (!formData.account_number || !/^\d{9,18}$/.test(formData.account_number.trim())) {
      nextErrors.account_number = 'Account number must be numeric and between 9 and 18 digits';
      isValid = false;
    }

    // IFSC Code
    const ifscRegex = /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/;
    if (!formData.ifsc || !ifscRegex.test(formData.ifsc.trim())) {
      nextErrors.ifsc = 'Invalid IFSC code format (e.g. CHAS0001234)';
      isValid = false;
    }

    setFormErrors(nextErrors);

    if (!isValid) {
      showToast('Please correct the highlighted validation errors.', 'error');
      return;
    }

    if (selectedEmp) {
      updateMutation.mutate({ id: selectedEmp.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleExportCsv = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await api.get('/employees/csv', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `employee-master_${today}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(link.href), 100);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to export employees', 'error');
    }
  };

  const handleDownloadSampleCsv = () => {
    const headers = [
      'Employee Code',
      'Name',
      'Email',
      'Phone',
      'Department',
      'Designation',
      'Joining Date',
      'Bank Name',
      'Account Number',
      'IFSC',
      'Tax Regime',
      'Active Status',
    ];
    const sampleRows = [
      ['EMP001', 'John Doe', 'john.doe@example.com', '9876543210', 'Engineering', 'Software Engineer', '2026-01-15', 'HDFC Bank', '50100234567891', 'HDFC0000123', 'new', 'Active'],
      ['EMP002', 'Jane Smith', 'jane.smith@example.com', '9876543211', 'Human Resources', 'HR Manager', '2026-02-01', 'ICICI Bank', '000401234567', 'ICIC0000004', 'old', 'Active']
    ];
    const csvContent = [headers.join(','), ...sampleRows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'sample_employee_import.csv');
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
        const res = await api.post('/employees/import', { csvContent: text });
        const { imported, errors } = res.data;
        queryClient.invalidateQueries(['employees']);
        queryClient.invalidateQueries(['dashboardData']);
        if (errors && errors.length > 0) {
          showToast(`Imported ${imported} employees. There were ${errors.length} warnings/errors (see console details).`, 'error');
          console.warn('Import CSV warnings/errors:', errors);
        } else {
          showToast(`Successfully imported ${imported} employees!`, 'success');
        }
      } catch (err: any) {
        showToast(err.response?.data?.message || 'Failed to import CSV file.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredEmployees = employees.filter((emp: Employee) =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const departmentOptions = withCurrentOption(DEPARTMENT_OPTIONS, formData.department);
  const designationOptions = withCurrentOption(DESIGNATION_OPTIONS, formData.designation);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)' }}>
            Employees
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mt: 0.5 }}>
            Manage employee directory profiles, bank configuration, and annual financial summaries.
          </Typography>
        </Box>
      </Box>

      {/* Employee Directory View */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 3 }}>
        <input
          type="file"
          accept=".csv"
          id="import-csv-file-input"
          style={{ display: 'none' }}
          onChange={handleImportCsv}
        />
        {isHRorAdmin && (
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
        {isHRorAdmin && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAddDialog}
            sx={{
              background: 'var(--color-primary)',
              boxShadow: '0 8px 18px rgba(99, 102, 241, 0.22)',
              borderRadius: 'var(--radius-control)',
              textTransform: 'none',
            }}
          >
            Add Employee
          </Button>
        )}
      </Box>

      {/* Filter and Table */}
      <Paper
        sx={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card)',
          overflow: 'hidden',
          p: 3,
        }}
      >
        <TextField
          placeholder="Search by name, employee code, or department..."
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: 'var(--color-text-muted)', mr: 1 }} />,
          }}
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': {
              color: 'var(--color-text-primary)',
              borderRadius: 'var(--radius-control)',
              '& fieldset': { borderColor: 'var(--color-border)' },
              '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
              '&.Mui-focused fieldset': { borderColor: 'var(--color-primary)' },
            },
          }}
        />

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={40} sx={{ color: 'var(--color-primary)' }} />
          </Box>
        ) : filteredEmployees.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No employees found matching the search criteria.
          </Box>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 650 }}>
              <TableHead sx={{ bgcolor: 'var(--color-surface-subtle)' }}>
                <TableRow>
                  <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Code</TableCell>
                  <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Email</TableCell>
                  <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Department</TableCell>
                  <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Designation</TableCell>
                  <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Status</TableCell>
                  <TableCell align="right" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEmployees.map((emp: Employee) => (
                  <TableRow key={emp.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell component="th" scope="row" sx={{ color: 'var(--color-text-primary)' }}>{emp.employee_code}</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-primary)' }}>{emp.name}</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-primary)' }}>{emp.email}</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-primary)' }}>{emp.department}</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-primary)' }}>{emp.designation}</TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          display: 'inline-block',
                          px: 1.5,
                          py: 0.5,
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          bgcolor: emp.active_status ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: emp.active_status ? 'var(--color-success)' : 'var(--color-error)',
                        }}
                      >
                        {emp.active_status ? 'Active' : 'Inactive'}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Profile & Financials">
                        <IconButton onClick={() => handleOpenProfileDialog(emp)} sx={{ color: 'var(--color-text-secondary)', '&:hover': { color: 'var(--color-primary)' }, mr: 0.5 }}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Details">
                        <IconButton onClick={() => handleOpenEditDialog(emp)} sx={{ color: 'var(--color-text-secondary)', '&:hover': { color: 'var(--color-primary)' } }}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {isHRorAdmin && (
                        <Tooltip title="Delete Employee">
                          <IconButton onClick={() => handleDelete(emp.id)} sx={{ color: 'var(--color-text-secondary)', '&:hover': { color: 'var(--color-error)' } }}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Detailed Employee Profile Dialog */}
      <Dialog
        open={openProfileDialog}
        onClose={() => setOpenProfileDialog(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-card)',
            boxShadow: 'var(--shadow-card)',
          },
        }}
      >
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)' }}>
            Employee Profile & Financial Summary
          </Typography>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel id="dialog-profile-year-select-label" sx={{ color: 'var(--color-text-secondary)' }}>Year</InputLabel>
            <Select
              labelId="dialog-profile-year-select-label"
              value={profileYear}
              label="Year"
              size="small"
              onChange={(e) => setProfileYear(Number(e.target.value))}
              sx={{
                color: 'var(--color-text-primary)',
                height: '38px',
                borderRadius: 'var(--radius-control)',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-border)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-primary)' },
              }}
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                <MenuItem key={y} value={y}>{y}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          {!profileEmpId ? (
            <Box sx={{ py: 4, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              No employee selected.
            </Box>
          ) : (
            <Grid container spacing={3.5}>
              {/* Left Column: Editable HR & Bank Details */}
              <Grid item xs={12} lg={5}>
                <Paper sx={{ p: 3, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', background: 'var(--color-surface-subtle)' }}>
                  <Typography variant="subtitle1" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)', mb: 2 }}>
                    HR & Bank Profile Details
                  </Typography>
                  <form onSubmit={handleProfileFormSubmit}>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          label="Employee Code"
                          fullWidth
                          required
                          disabled={!isHRorAdmin}
                          value={profileFormData.employee_code}
                          onChange={(e) => setProfileFormData({ ...profileFormData, employee_code: e.target.value })}
                          sx={inputStyles}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Full Name"
                          fullWidth
                          required
                          disabled={!isHRorAdmin}
                          value={profileFormData.name}
                          onChange={(e) => setProfileFormData({ ...profileFormData, name: e.target.value })}
                          sx={inputStyles}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Email Address"
                          fullWidth
                          required
                          type="email"
                          disabled={!isHRorAdmin}
                          value={profileFormData.email}
                          onChange={(e) => setProfileFormData({ ...profileFormData, email: e.target.value })}
                          sx={inputStyles}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Phone Number"
                          fullWidth
                          disabled={!isHRorAdmin}
                          value={profileFormData.phone}
                          onChange={(e) => setProfileFormData({ ...profileFormData, phone: e.target.value })}
                          sx={inputStyles}
                        />
                      </Grid>

                      <Grid item xs={6}>
                        <Autocomplete
                          options={DEPARTMENT_OPTIONS}
                          value={profileFormData.department}
                          disabled={!isHRorAdmin}
                          onChange={(_, newValue) => setProfileFormData({ ...profileFormData, department: newValue || '' })}
                          renderInput={(params) => (
                            <TextField {...params} label="Department" required sx={inputStyles} />
                          )}
                          ListboxProps={{ sx: dropdownListStyles }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <Autocomplete
                          options={DESIGNATION_OPTIONS}
                          value={profileFormData.designation}
                          disabled={!isHRorAdmin}
                          onChange={(_, newValue) => setProfileFormData({ ...profileFormData, designation: newValue || '' })}
                          renderInput={(params) => (
                            <TextField {...params} label="Designation" required sx={inputStyles} />
                          )}
                          ListboxProps={{ sx: dropdownListStyles }}
                        />
                      </Grid>

                      <Grid item xs={6}>
                        <TextField
                          label="Joining Date"
                          type="date"
                          fullWidth
                          required
                          disabled={!isHRorAdmin}
                          InputLabelProps={{ shrink: true }}
                          value={profileFormData.joining_date}
                          onChange={(e) => setProfileFormData({ ...profileFormData, joining_date: e.target.value })}
                          sx={inputStyles}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <Autocomplete
                          options={['new', 'old']}
                          value={profileFormData.tax_regime}
                          disabled={!isHRorAdmin}
                          onChange={(_, newValue) => setProfileFormData({ ...profileFormData, tax_regime: newValue || 'new' })}
                          renderInput={(params) => (
                            <TextField {...params} label="Tax Regime" required sx={inputStyles} />
                          )}
                          ListboxProps={{ sx: dropdownListStyles }}
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={profileFormData.active_status}
                              disabled={!isHRorAdmin}
                              onChange={(e) => setProfileFormData({ ...profileFormData, active_status: e.target.checked })}
                              sx={{
                                '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--color-primary)' },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: 'var(--color-primary)' },
                              }}
                            />
                          }
                          label="Active Status"
                          sx={{ color: 'var(--color-text-secondary)' }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={profileFormData.pf_deduction}
                              disabled={!isHRorAdmin}
                              onChange={(e) => setProfileFormData({ ...profileFormData, pf_deduction: e.target.checked })}
                              sx={{
                                '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--color-primary)' },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: 'var(--color-primary)' },
                              }}
                            />
                          }
                          label="PF Deduction"
                          sx={{ color: 'var(--color-text-secondary)' }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={profileFormData.tax_deduction}
                              disabled={!isHRorAdmin}
                              onChange={(e) => setProfileFormData({ ...profileFormData, tax_deduction: e.target.checked })}
                              sx={{
                                '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--color-primary)' },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: 'var(--color-primary)' },
                              }}
                            />
                          }
                          label="Tax Deduction"
                          sx={{ color: 'var(--color-text-secondary)' }}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Typography variant="caption" sx={{ color: 'var(--color-primary-hover)', fontWeight: 600 }}>
                          BANK ACCOUNT DETAILS
                        </Typography>
                        <Divider sx={{ borderColor: 'var(--color-border)', mt: 0.5, mb: 1.5 }} />
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          label="Bank Name"
                          fullWidth
                          required
                          disabled={!isHRorAdmin}
                          value={profileFormData.bank_name}
                          onChange={(e) => setProfileFormData({ ...profileFormData, bank_name: e.target.value })}
                          sx={inputStyles}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Account Number"
                          fullWidth
                          required
                          disabled={!isHRorAdmin}
                          value={profileFormData.account_number}
                          onChange={(e) => setProfileFormData({ ...profileFormData, account_number: e.target.value })}
                          sx={inputStyles}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="IFSC Code"
                          fullWidth
                          required
                          disabled={!isHRorAdmin}
                          value={profileFormData.ifsc}
                          onChange={(e) => setProfileFormData({ ...profileFormData, ifsc: e.target.value })}
                          sx={inputStyles}
                        />
                      </Grid>

                      {isHRorAdmin && (
                        <Grid item xs={12} sx={{ mt: 1.5 }}>
                          <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            disabled={updateProfileMutation.isLoading}
                            sx={{
                              background: 'var(--color-primary)',
                              borderRadius: 'var(--radius-control)',
                              py: 1.2,
                              textTransform: 'none',
                              fontWeight: 600,
                            }}
                          >
                            {updateProfileMutation.isLoading ? 'Saving...' : 'Save Profile Changes'}
                          </Button>
                        </Grid>
                      )}
                    </Grid>
                  </form>
                </Paper>
              </Grid>

              {/* Right Column: Financial Summary & Graphical Charts */}
              <Grid item xs={12} lg={7}>
                {isLoadingProfileSummary ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress size={40} sx={{ color: 'var(--color-primary)' }} />
                  </Box>
                ) : !profileSummary ? (
                  <Paper sx={{ p: 4, textAlign: 'center', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', background: 'var(--color-surface)' }}>
                    <Typography sx={{ color: 'var(--color-text-secondary)' }}>No summary details available for this year.</Typography>
                  </Paper>
                ) : (
                  <Grid container spacing={3}>
                    {/* Top Stats */}
                    <Grid item xs={12} sm={6}>
                      <Paper sx={{ p: 2.5, background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-control)' }}>
                        <Typography variant="caption" sx={{ color: 'var(--color-success)', fontWeight: 600 }}>TOTAL AMOUNT PAID (YTD)</Typography>
                        <Typography variant="h4" sx={{ color: 'var(--color-success)', fontWeight: 'bold', fontFamily: 'Outfit', mt: 1 }}>
                          {formatCurrency(profileSummary.amountPaid)}
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Paper sx={{ p: 2.5, background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 'var(--radius-control)' }}>
                        <Typography variant="caption" sx={{ color: 'var(--color-primary-hover)', fontWeight: 600 }}>ESTIMATED TO BE PAID (REMAINING)</Typography>
                        <Typography variant="h4" sx={{ color: 'var(--color-primary-hover)', fontWeight: 'bold', fontFamily: 'Outfit', mt: 1 }}>
                          {formatCurrency(profileSummary.amountToBePaid)}
                        </Typography>
                      </Paper>
                    </Grid>

                    {/* PF & Tax Summaries */}
                    <Grid item xs={12} sm={6}>
                      <Paper sx={{ p: 2.5, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-control)', background: 'var(--color-surface-subtle)' }}>
                        <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>PROVIDENT FUND (PF)</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5 }}>
                          <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>PF Deducted (YTD):</Typography>
                          <Typography variant="body2" fontWeight="bold" sx={{ color: 'var(--color-text-primary)' }}>{formatCurrency(profileSummary.pfDeducted)}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                          <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>Est. PF Remaining:</Typography>
                          <Typography variant="body2" fontWeight="bold" sx={{ color: 'var(--color-text-primary)' }}>{formatCurrency(profileSummary.expectedPFRemaining)}</Typography>
                        </Box>
                      </Paper>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Paper sx={{ p: 2.5, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-control)', background: 'var(--color-surface-subtle)' }}>
                        <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>INCOME TAX (TDS)</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5 }}>
                          <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>Tax Deducted (YTD):</Typography>
                          <Typography variant="body2" fontWeight="bold" sx={{ color: 'var(--color-text-primary)' }}>{formatCurrency(profileSummary.taxDeducted)}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                          <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>Est. Tax Remaining:</Typography>
                          <Typography variant="body2" fontWeight="bold" sx={{ color: 'var(--color-text-primary)' }}>{formatCurrency(profileSummary.expectedTaxRemaining)}</Typography>
                        </Box>
                      </Paper>
                    </Grid>

                    {/* Advances loan summary */}
                    <Grid item xs={12}>
                      <Paper sx={{ p: 2.5, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-control)', background: 'var(--color-surface-subtle)' }}>
                        <Typography variant="caption" sx={{ color: 'var(--color-primary-hover)', fontWeight: 600 }}>SALARY ADVANCES OVERVIEW</Typography>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                          <Grid item xs={4}>
                            <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>Total Taken</Typography>
                            <Typography variant="body2" fontWeight="bold" sx={{ color: 'var(--color-text-primary)', mt: 0.5 }}>{formatCurrency(profileSummary.totalAdvancesTaken)}</Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>Total Repaid (YTD)</Typography>
                            <Typography variant="body2" fontWeight="bold" sx={{ color: 'var(--color-success)', mt: 0.5 }}>{formatCurrency(profileSummary.totalAdvancesRepaid)}</Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>Outstanding Loan</Typography>
                            <Typography variant="body2" fontWeight="bold" sx={{ color: profileSummary.remainingAdvanceBalance > 0 ? '#fb923c' : 'var(--color-text-muted)', mt: 0.5 }}>
                              {formatCurrency(profileSummary.remainingAdvanceBalance)}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>

                    {/* Chart 1: Bar Chart of Paid vs Remaining */}
                    <Grid item xs={12}>
                      <Paper sx={{ p: 2.5, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', background: 'var(--color-surface)', height: 320 }}>
                        <Typography variant="body2" fontWeight="bold" sx={{ color: 'var(--color-text-primary)', mb: 2 }}>
                          Paid vs Projected Remaining Analysis ({profileYear})
                        </Typography>
                        <Box sx={{ height: 240 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={[
                                { name: 'Net Salary', Paid: profileSummary.amountPaid, Remaining: profileSummary.amountToBePaid },
                                { name: 'PF', Paid: profileSummary.pfDeducted, Remaining: profileSummary.expectedPFRemaining },
                                { name: 'Tax', Paid: profileSummary.taxDeducted, Remaining: profileSummary.expectedTaxRemaining },
                              ]}
                              margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-strong)" vertical={false} />
                              <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={11} tickLine={false} />
                              <YAxis stroke="var(--color-text-secondary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => formatCurrency(val)} />
                              <ChartTooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-control)', color: 'var(--color-text-primary)' }} formatter={(value) => formatCurrency(value as number)} />
                              <Legend />
                              <Bar dataKey="Paid" name="YTD Paid/Deducted" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="Remaining" name="Est. Remaining" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <Button onClick={() => setOpenProfileDialog(false)} variant="outlined" sx={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)', textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit/Add Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-card)',
            boxShadow: 'var(--shadow-card)',
          },
        }}
      >
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', pb: selectedEmp ? 1 : 2 }}>
          {selectedEmp ? 'Edit Employee Details' : 'Register New Employee'}
        </DialogTitle>
        <form onSubmit={handleFormSubmit}>
          <DialogContent sx={{ py: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Employee Code"
                    fullWidth
                    required
                    value={formData.employee_code}
                    onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                    error={!!formErrors.employee_code}
                    helperText={formErrors.employee_code}
                    sx={inputStyles}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Full Name"
                    fullWidth
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    error={!!formErrors.name}
                    helperText={formErrors.name}
                    sx={inputStyles}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Email Address"
                    fullWidth
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    error={!!formErrors.email}
                    helperText={formErrors.email}
                    sx={inputStyles}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Phone Number"
                    fullWidth
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    error={!!formErrors.phone}
                    helperText={formErrors.phone}
                    sx={inputStyles}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    options={departmentOptions}
                    value={formData.department || null}
                    onChange={(_, value) => {
                      setFormData({ ...formData, department: value || '' });
                      setFormErrors({ ...formErrors, department: value ? '' : 'Department is required' });
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Department"
                        fullWidth
                        required
                        error={!!formErrors.department}
                        helperText={formErrors.department}
                        sx={inputStyles}
                      />
                    )}
                    ListboxProps={{ sx: dropdownListStyles }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    options={designationOptions}
                    value={formData.designation || null}
                    onChange={(_, value) => {
                      setFormData({ ...formData, designation: value || '' });
                      setFormErrors({ ...formErrors, designation: value ? '' : 'Designation is required' });
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Designation"
                        fullWidth
                        required
                        error={!!formErrors.designation}
                        helperText={formErrors.designation}
                        sx={inputStyles}
                      />
                    )}
                    ListboxProps={{ sx: dropdownListStyles }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Joining Date"
                    type="date"
                    fullWidth
                    required
                    value={formData.joining_date}
                    onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    error={!!formErrors.joining_date}
                    helperText={formErrors.joining_date}
                    sx={inputStyles}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Autocomplete
                    options={['new', 'old']}
                    getOptionLabel={(option) => option === 'new' ? 'New Tax Regime' : 'Old Tax Regime'}
                    value={formData.tax_regime || 'new'}
                    onChange={(_, value) => {
                      setFormData({ ...formData, tax_regime: value || 'new' });
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Tax Regime"
                        fullWidth
                        required
                        sx={inputStyles}
                      />
                    )}
                    ListboxProps={{ sx: dropdownListStyles }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControlLabel
                    control={
	                      <Switch
	                        checked={formData.active_status}
	                        onChange={(e) => setFormData({ ...formData, active_status: e.target.checked })}
	                        sx={{
	                          '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--color-primary)' },
	                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: 'var(--color-primary)' },
                        }}
                      />
                    }
                    label="Active Status"
                    sx={{ mt: 1.5, color: 'var(--color-text-secondary)' }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControlLabel
                    control={
	                      <Switch
	                        checked={formData.pf_deduction}
	                        onChange={(e) => setFormData({ ...formData, pf_deduction: e.target.checked })}
	                        sx={{
	                          '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--color-primary)' },
	                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: 'var(--color-primary)' },
                        }}
                      />
                    }
                    label="PF Deduction"
                    sx={{ mt: 1.5, color: 'var(--color-text-secondary)' }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControlLabel
                    control={
	                      <Switch
	                        checked={formData.tax_deduction}
	                        onChange={(e) => setFormData({ ...formData, tax_deduction: e.target.checked })}
	                        sx={{
	                          '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--color-primary)' },
	                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: 'var(--color-primary)' },
                        }}
                      />
                    }
                    label="Tax Deduction"
                    sx={{ mt: 1.5, color: 'var(--color-text-secondary)' }}
                  />
                </Grid>

                {/* Bank Details Sub-header */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ color: 'var(--color-primary-hover)', fontWeight: 600, mt: 1 }}>
                    BANK ACCOUNT INFORMATION
                  </Typography>
                  <Divider sx={{ borderColor: 'var(--color-border)', mt: 1 }} />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Bank Name"
                    fullWidth
                    required
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    error={!!formErrors.bank_name}
                    helperText={formErrors.bank_name}
                    sx={inputStyles}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Account Number"
                    fullWidth
                    required
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    error={!!formErrors.account_number}
                    helperText={formErrors.account_number}
                    sx={inputStyles}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="IFSC Code"
                    fullWidth
                    required
                    value={formData.ifsc}
                    onChange={(e) => setFormData({ ...formData, ifsc: e.target.value })}
                    error={!!formErrors.ifsc}
                    helperText={formErrors.ifsc}
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
              {selectedEmp ? 'Save Changes' : 'Register Employee'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>


    </Box>
  );
};

// Styling for text fields inside dialogs
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

const dropdownListStyles = {
  bgcolor: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  '& .MuiAutocomplete-option.Mui-focused': {
    bgcolor: 'rgba(99, 102, 241, 0.18)',
  },
  '& .MuiAutocomplete-option[aria-selected="true"]': {
    bgcolor: 'rgba(99, 102, 241, 0.24)',
  },
};

const withCurrentOption = (options: readonly string[], currentValue: string) => {
  if (!currentValue || options.includes(currentValue)) {
    return [...options];
  }

  return [currentValue, ...options];
};

export default Employees;
