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
  IconButton,
  Tooltip,
  Grid,
  FormControlLabel,
  Switch,
  Alert,
  Snackbar,
  CircularProgress,
  Divider,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  Upload as UploadIcon,
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
}

const Employees: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [formErrors, setFormErrors] = useState({ department: '', designation: '' });
  
  // Notification State
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' } | null>(null);

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
  });

  const isHRorAdmin = user && (user.role === Role.SUPER_ADMIN || user.role === Role.HR);
  const isAdmin = user && user.role === Role.SUPER_ADMIN;

  // Fetch employees
  const { data: employees = [], isLoading } = useQuery(['employees'], async () => {
    const res = await api.get('/employees');
    return res.data;
  });

  // Create employee mutation
  const createMutation = useMutation(
    async (newEmp: typeof formData) => {
      const res = await api.post('/employees', newEmp);
      return res.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['employees']);
        setNotification({ open: true, message: 'Employee registered successfully!', severity: 'success' });
        setOpenDialog(false);
      },
      onError: (err: any) => {
        setNotification({ open: true, message: err.response?.data?.message || 'Failed to register employee', severity: 'error' });
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
        setNotification({ open: true, message: 'Employee profile updated!', severity: 'success' });
        setOpenDialog(false);
      },
      onError: (err: any) => {
        setNotification({ open: true, message: err.response?.data?.message || 'Failed to update employee', severity: 'error' });
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
        setNotification({ open: true, message: 'Employee record removed.', severity: 'success' });
      },
      onError: (err: any) => {
        setNotification({ open: true, message: err.response?.data?.message || 'Failed to delete employee', severity: 'error' });
      },
    }
  );

  const handleOpenAddDialog = () => {
    setSelectedEmp(null);
    setFormErrors({ department: '', designation: '' });
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
    });
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (emp: Employee) => {
    setSelectedEmp(emp);
    setFormErrors({ department: '', designation: '' });
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
    });
    setOpenDialog(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = {
      department: formData.department ? '' : 'Department is required',
      designation: formData.designation ? '' : 'Designation is required',
    };

    setFormErrors(nextErrors);

    if (nextErrors.department || nextErrors.designation) {
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
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err: any) {
      setNotification({ open: true, message: err.response?.data?.message || 'Failed to export employees', severity: 'error' });
    }
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
          setNotification({
            open: true,
            message: `Imported ${imported} employees. There were ${errors.length} warnings/errors (see console details).`,
            severity: 'error',
          });
          console.warn('Import CSV warnings/errors:', errors);
        } else {
          setNotification({
            open: true,
            message: `Successfully imported ${imported} employees!`,
            severity: 'success',
          });
        }
      } catch (err: any) {
        setNotification({
          open: true,
          message: err.response?.data?.message || 'Failed to import CSV file.',
          severity: 'error',
        });
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h5" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)' }}>
          Employees List
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <input
            type="file"
            accept=".csv"
            id="import-csv-file-input"
            style={{ display: 'none' }}
            onChange={handleImportCsv}
          />
          {isHRorAdmin && (
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
              '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
              '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
              '&.Mui-focused fieldset': { borderColor: 'var(--color-primary)' },
            },
          }}
        />

        <TableContainer>
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ bgcolor: 'var(--color-surface-subtle)' }}>
              <TableRow>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Emp Code</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Department</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Designation</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Joining Date</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Tax Regime</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Status</TableCell>
                {isHRorAdmin && <TableCell align="right" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                    <CircularProgress size={30} sx={{ color: 'var(--color-primary)' }} />
                  </TableCell>
                </TableRow>
              ) : filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'var(--color-text-muted)' }}>
                    No employees found matching the search filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((emp: Employee) => (
                  <TableRow
                    key={emp.id}
                    sx={{
                      '&:hover': { bgcolor: 'var(--color-row-hover)' },
                      borderColor: 'rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <TableCell sx={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{emp.employee_code}</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{emp.name}</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-primary)' }}>{emp.department}</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-primary)' }}>{emp.designation}</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-primary)' }}>{emp.joining_date}</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-primary)', textTransform: 'capitalize' }}>{emp.tax_regime || 'new'}</TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          display: 'inline-block',
                          px: 1.5,
                          py: 0.4,
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          bgcolor: emp.active_status ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                          color: emp.active_status ? 'var(--color-success)' : '#fda4af',
                        }}
                      >
                        {emp.active_status ? 'Active' : 'Inactive'}
                      </Box>
                    </TableCell>
                    {isHRorAdmin && (
                      <TableCell align="right">
                        <Tooltip title="Edit Profile">
                          <IconButton onClick={() => handleOpenEditDialog(emp)} sx={{ color: 'var(--color-info)', mr: 0.5 }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {isAdmin && (
                          <Tooltip title="Remove Record">
                            <IconButton onClick={() => handleDelete(emp.id)} sx={{ color: 'var(--color-error)' }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
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
                  sx={inputStyles}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Email Address"
                  type="email"
                  fullWidth
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  sx={inputStyles}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Phone Number"
                  fullWidth
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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

      {/* Snackbar notification */}
      <Snackbar
        open={notification?.open}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setNotification(null)} severity={notification?.severity} sx={{ width: '100%' }}>
          {notification?.message}
        </Alert>
      </Snackbar>
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
