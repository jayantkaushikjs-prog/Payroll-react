import React, { useState } from 'react';
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
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  CircularProgress,
  Chip,
  TablePagination,
  Card,
  CardContent,
} from '@mui/material';
import { useToast } from '../context/ToastContext';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  AttachMoney as MoneyIcon,
  Receipt as ReceiptIcon,
  Home as RentIcon,
  People as SalaryIcon,
  Devices as OneTimeIcon,
  Dns as UtilitiesIcon,
  Public as MarketingIcon,
  HelpOutline as OtherIcon,
} from '@mui/icons-material';

interface Expense {
  id: number;
  title: string;
  amount: number;
  category: string;
  frequency: string;
  date: string;
  description?: string;
  created_at: string;
}

const cardSx = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-card)',
  boxShadow: 'none',
  transition: 'border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
};

const Expenses: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const isFinanceOrAdmin = user && (user.role === Role.SUPER_ADMIN || user.role === Role.FINANCE);

  // Filters & Pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [frequencyFilter, setFrequencyFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialog State
  const [openDialog, setOpenDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'rent',
    frequency: 'monthly',
    date: new Date().toISOString().split('T')[0],
    description: '',
  });

  // Fetch all expenses
  const { data: expenses = [], isLoading } = useQuery(['expenses'], async () => {
    const res = await api.get('/expenses');
    return res.data;
  });

  // Create mutation
  const createMutation = useMutation(
    async (payload: any) => {
      const res = await api.post('/expenses', payload);
      return res.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['expenses']);
        queryClient.invalidateQueries(['dashboardData']);
        showToast('Expense created successfully!', 'success');
        setOpenDialog(false);
      },
      onError: (err: any) => {
        showToast(err.response?.data?.message || 'Failed to create expense', 'error');
      },
    }
  );

  // Update mutation
  const updateMutation = useMutation(
    async ({ id, payload }: { id: number; payload: any }) => {
      const res = await api.put(`/expenses/${id}`, payload);
      return res.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['expenses']);
        queryClient.invalidateQueries(['dashboardData']);
        showToast('Expense updated successfully!', 'success');
        setOpenDialog(false);
      },
      onError: (err: any) => {
        showToast(err.response?.data?.message || 'Failed to update expense', 'error');
      },
    }
  );

  // Delete mutation
  const deleteMutation = useMutation(
    async (id: number) => {
      await api.delete(`/expenses/${id}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['expenses']);
        queryClient.invalidateQueries(['dashboardData']);
        showToast('Expense deleted successfully!', 'success');
      },
      onError: (err: any) => {
        showToast(err.response?.data?.message || 'Failed to delete expense', 'error');
      },
    }
  );

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setFormData({
      title: '',
      amount: '',
      category: 'rent',
      frequency: 'monthly',
      date: new Date().toISOString().split('T')[0],
      description: '',
    });
    setOpenDialog(true);
  };

  const handleOpenEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      title: expense.title,
      amount: String(expense.amount),
      category: expense.category,
      frequency: expense.frequency,
      date: expense.date,
      description: expense.description || '',
    });
    setOpenDialog(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this expense record?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('Please enter an expense title', 'error');
      return;
    }
    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      showToast('Please enter a valid amount greater than 0', 'error');
      return;
    }

    const payload = {
      ...formData,
      amount: amt,
    };

    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleExportCsv = () => {
    const headers = ['ID', 'Title', 'Amount', 'Category', 'Frequency', 'Date', 'Description'];
    const rows = filteredExpenses.map((exp: Expense) => [
      exp.id,
      `"${exp.title.replace(/"/g, '""')}"`,
      exp.amount,
      exp.category,
      exp.frequency,
      exp.date,
      `"${(exp.description || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `company_expenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Expenses exported successfully!', 'success');
  };

  // Helper calculation for Stats (Current Month)
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const getExpensesForCurrentMonth = () => {
    return expenses.filter((e: Expense) => {
      const expDate = new Date(e.date);
      return (expDate.getMonth() + 1) === currentMonth && expDate.getFullYear() === currentYear;
    });
  };

  const currentMonthExpenses = getExpensesForCurrentMonth();
  const totalCMExpenses = currentMonthExpenses.reduce((sum: number, e: Expense) => sum + Number(e.amount), 0);
  
  const getCMExpensesByCategory = (cat: string) => {
    return currentMonthExpenses
      .filter((e: Expense) => e.category === cat)
      .reduce((sum: number, e: Expense) => sum + Number(e.amount), 0);
  };

  const getCMExpensesByFrequency = (freq: string) => {
    return currentMonthExpenses
      .filter((e: Expense) => e.frequency === freq)
      .reduce((sum: number, e: Expense) => sum + Number(e.amount), 0);
  };

  // Filter Logic
  const filteredExpenses = expenses.filter((exp: Expense) => {
    const matchesSearch =
      exp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exp.description && exp.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || exp.category === categoryFilter;
    const matchesFrequency = frequencyFilter === 'all' || exp.frequency === frequencyFilter;
    return matchesSearch && matchesCategory && matchesFrequency;
  });

  // Pagination Logic
  const paginatedExpenses = filteredExpenses.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'rent': return 'Rent';
      case 'salary': return 'Salary';
      case 'utilities': return 'Utilities';
      case 'marketing': return 'Marketing';
      case 'one-time': return 'One-Time';
      default: return 'Other';
    }
  };

  const getCategoryChipColor = (cat: string) => {
    switch (cat) {
      case 'rent': return { color: '#10b981', label: 'Rent' }; // Emerald
      case 'salary': return { color: '#3b82f6', label: 'Salary' }; // Blue
      case 'utilities': return { color: '#f59e0b', label: 'Utilities' }; // Amber
      case 'marketing': return { color: '#8b5cf6', label: 'Marketing' }; // Purple
      case 'one-time': return { color: '#ef4444', label: 'One-Time' }; // Red
      default: return { color: '#6b7280', label: 'Other' }; // Grey
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'rent': return <RentIcon />;
      case 'salary': return <SalaryIcon />;
      case 'utilities': return <UtilitiesIcon />;
      case 'marketing': return <MarketingIcon />;
      case 'one-time': return <OneTimeIcon />;
      default: return <OtherIcon />;
    }
  };

  return (
    <Box>
      {/* Header section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)' }}>
            Company Expenses
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mt: 0.5 }}>
            Track and manage company expenditures, recurring monthly fees, and one-time purchases.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
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
              Add Expense
            </Button>
          )}
        </Box>
      </Box>

      {/* KPI Cards Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <MiniKpiCard
            label="Total Month Expenses"
            value={formatCurrency(totalCMExpenses)}
            icon={<ReceiptIcon />}
            color="var(--color-primary)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <MiniKpiCard
            label="Office Rent"
            value={formatCurrency(getCMExpensesByCategory('rent'))}
            icon={<RentIcon />}
            color="#10b981"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <MiniKpiCard
            label="Employee Salaries"
            value={formatCurrency(getCMExpensesByCategory('salary'))}
            icon={<SalaryIcon />}
            color="#3b82f6"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <MiniKpiCard
            label="Utilities & Cloud"
            value={formatCurrency(getCMExpensesByCategory('utilities'))}
            icon={<UtilitiesIcon />}
            color="#f59e0b"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <MiniKpiCard
            label="One-Time Payments"
            value={formatCurrency(getCMExpensesByFrequency('one-time'))}
            icon={<OneTimeIcon />}
            color="#ef4444"
          />
        </Grid>
      </Grid>

      {/* Filter panel */}
      <Paper sx={{ ...cardSx, p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search expenses by title or description..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'var(--color-text-muted)', mr: 1 }} />,
              }}
              sx={inputStyles}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth sx={selectStyles}>
              <InputLabel id="category-filter-label" sx={{ color: 'var(--color-text-secondary)' }}>Category</InputLabel>
              <Select
                labelId="category-filter-label"
                value={categoryFilter}
                label="Category"
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value="all">All Categories</MenuItem>
                <MenuItem value="rent">Rent</MenuItem>
                <MenuItem value="salary">Salary</MenuItem>
                <MenuItem value="utilities">Utilities & Cloud</MenuItem>
                <MenuItem value="marketing">Marketing & Subscriptions</MenuItem>
                <MenuItem value="one-time">One-Time Equipment</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth sx={selectStyles}>
              <InputLabel id="frequency-filter-label" sx={{ color: 'var(--color-text-secondary)' }}>Frequency</InputLabel>
              <Select
                labelId="frequency-filter-label"
                value={frequencyFilter}
                label="Frequency"
                onChange={(e) => { setFrequencyFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value="all">All Frequencies</MenuItem>
                <MenuItem value="monthly">Monthly Recurring</MenuItem>
                <MenuItem value="one-time">One-Time Only</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Expense Listing Table */}
      <Paper sx={{ ...cardSx, p: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: 'var(--color-surface-subtle)' }}>
              <TableRow>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Title</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Category</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Frequency</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Amount</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Description</TableCell>
                {isFinanceOrAdmin && (
                  <TableCell align="right" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Actions</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={32} sx={{ color: 'var(--color-primary)' }} />
                  </TableCell>
                </TableRow>
              ) : filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'var(--color-text-muted)' }}>
                    No expenses matching criteria.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedExpenses.map((exp: Expense) => {
                  const chipDetails = getCategoryChipColor(exp.category);
                  return (
                    <TableRow key={exp.id} sx={{ '&:hover': { bgcolor: 'var(--color-row-hover)' }, borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                      <TableCell sx={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{exp.title}</TableCell>
                      <TableCell>
                        <Chip
                          icon={React.cloneElement(getCategoryIcon(exp.category), { style: { color: 'white', fontSize: 15 } })}
                          label={chipDetails.label}
                          size="small"
                          sx={{
                            bgcolor: chipDetails.color,
                            color: 'white',
                            fontWeight: 600,
                            borderRadius: '6px',
                            '& .MuiChip-icon': { color: 'white' }
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)' }}>
                        <Chip
                          label={exp.frequency === 'monthly' ? 'Monthly' : 'One-Time'}
                          size="small"
                          variant="outlined"
                          sx={{
                            borderColor: exp.frequency === 'monthly' ? 'var(--color-primary)' : 'var(--color-border)',
                            color: exp.frequency === 'monthly' ? 'var(--color-primary-hover)' : 'var(--color-text-secondary)',
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)' }}>{exp.date}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>
                        {formatCurrency(exp.amount)}
                      </TableCell>
                      <TableCell sx={{ color: 'var(--color-text-secondary)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {exp.description || '-'}
                      </TableCell>
                      {isFinanceOrAdmin && (
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                            <Tooltip title="Edit Expense">
                              <IconButton onClick={() => handleOpenEdit(exp)} sx={{ color: 'var(--color-primary)' }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Expense">
                              <IconButton onClick={() => handleDelete(exp.id)} sx={{ color: 'var(--color-error)' }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredExpenses.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          sx={{
            color: 'var(--color-text-secondary)',
            '& .MuiTablePagination-selectIcon': { color: 'var(--color-text-secondary)' },
            '& .MuiTablePagination-actions': { color: 'var(--color-text-secondary)' },
          }}
        />
      </Paper>

      {/* Dialog for Add/Edit */}
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
          {editingExpense ? 'Edit Expense Record' : 'Add Company Expense'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ py: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  label="Expense Title"
                  required
                  fullWidth
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Office Space Rent, AWS Cloud Hosting, Team Dinner"
                  sx={inputStyles}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Amount"
                  type="number"
                  required
                  fullWidth
                  inputProps={{ step: 0.01, min: 0.01 }}
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  sx={inputStyles}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Expense Date"
                  type="date"
                  required
                  fullWidth
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  sx={inputStyles}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required sx={selectStyles}>
                  <InputLabel id="form-category-label" sx={{ color: 'var(--color-text-secondary)' }}>Category</InputLabel>
                  <Select
                    labelId="form-category-label"
                    value={formData.category}
                    label="Category"
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <MenuItem value="rent">Rent</MenuItem>
                    <MenuItem value="salary">Salary</MenuItem>
                    <MenuItem value="utilities">Utilities & Cloud</MenuItem>
                    <MenuItem value="marketing">Marketing & Subscriptions</MenuItem>
                    <MenuItem value="one-time">One-Time Equipment</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required sx={selectStyles}>
                  <InputLabel id="form-frequency-label" sx={{ color: 'var(--color-text-secondary)' }}>Frequency</InputLabel>
                  <Select
                    labelId="form-frequency-label"
                    value={formData.frequency}
                    label="Frequency"
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  >
                    <MenuItem value="monthly">Monthly Recurring</MenuItem>
                    <MenuItem value="one-time">One-Time Only</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Description / Remarks"
                  multiline
                  rows={3}
                  fullWidth
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide additional details regarding the expense..."
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
    </Box>
  );
};

// Simple reusable KPI card component
const MiniKpiCard: React.FC<{ label: string; value: string; icon: React.ReactNode; color: string }> = ({
  label,
  value,
  icon,
  color,
}) => (
  <Paper
    sx={{
      ...cardSx,
      p: 2.5,
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
      cursor: 'default',
      '&:hover': {
        borderColor: 'rgba(148, 163, 184, 0.32)',
        boxShadow: 'var(--shadow-card)',
        transform: 'translateY(-2px)',
      },
    }}
  >
    <Box sx={{ position: 'absolute', left: 0, top: 0, width: 4, height: '100%', bgcolor: color }} />
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
      <Box>
        <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)', fontWeight: 700 }}>
          {label}
        </Typography>
        <Typography variant="h6" sx={{ color: 'var(--color-text-primary)', fontWeight: 700, mt: 1, fontFamily: 'Outfit' }}>
          {value}
        </Typography>
      </Box>
      <Box sx={{ color, display: 'flex', '& svg': { fontSize: '1.6rem' } }}>{icon}</Box>
    </Box>
  </Paper>
);

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

export default Expenses;
