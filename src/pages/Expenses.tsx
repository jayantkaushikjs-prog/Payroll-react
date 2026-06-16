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
  FormControlLabel,
  Switch,
  Autocomplete,
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
  Shield as PfIcon,
} from '@mui/icons-material';

interface Expense {
  id: number;
  title: string;
  amount: number;
  category: string;
  frequency: string;
  date: string;
  startDate?: string;
  endDate?: string;
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
  const [excludeSalaries, setExcludeSalaries] = useState(false);

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
    startDate: '',
    endDate: '',
    description: '',
  });

  // Fetch all expenses
  const { data: expenses = [], isLoading } = useQuery(['expenses', excludeSalaries], async () => {
    const res = await api.get(`/expenses?excludeSalaries=${excludeSalaries}`);
    return res.data;
  });

  // Manage Categories States
  const [openCategoriesDialog, setOpenCategoriesDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Fetch expense categories
  const { data: dbCategories = [] } = useQuery(['expenseCategories'], async () => {
    const res = await api.get('/expenses/categories');
    return res.data;
  });

  // Create new category mutation
  const addCategoryMutation = useMutation(
    async (name: string) => {
      const res = await api.post('/expenses/categories', { name });
      return res.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['expenseCategories']);
        showToast('New expense category added successfully!', 'success');
      },
      onError: (err: any) => {
        showToast(err.response?.data?.message || 'Failed to add category', 'error');
      },
    }
  );

  // Delete category mutation
  const deleteCategoryMutation = useMutation(
    async (id: number) => {
      const res = await api.delete(`/expenses/categories/${id}`);
      return res.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['expenseCategories']);
        showToast('Expense category removed successfully!', 'success');
      },
      onError: (err: any) => {
        showToast(err.response?.data?.message || 'Failed to remove category', 'error');
      },
    }
  );

  const allCategories = dbCategories.map((c: any) => c.name);

  const withCurrentOption = (options: readonly string[], currentValue: string) => {
    if (!currentValue || options.includes(currentValue)) {
      return [...options];
    }
    return [currentValue, ...options];
  };

  const handleAddCategory = async () => {
    const trimmed = newCategoryName.trim().toLowerCase();
    if (!trimmed) return;
    try {
      await addCategoryMutation.mutateAsync(trimmed);
      setNewCategoryName('');
    } catch (e) {}
  };

  const categoryOptions = withCurrentOption(allCategories, formData.category);

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
      startDate: '',
      endDate: '',
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
      startDate: expense.startDate || '',
      endDate: expense.endDate || '',
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
      startDate: formData.startDate ? formData.startDate : null,
      endDate: formData.endDate ? formData.endDate : null,
    };

    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleExportCsv = () => {
    const headers = ['ID', 'Title', 'Amount', 'Category', 'Frequency', 'Date', 'Start Date', 'End Date', 'Description'];
    const rows = filteredExpenses.map((exp: Expense) => [
      exp.id,
      `"${exp.title.replace(/"/g, '""')}"`,
      exp.amount,
      exp.category,
      exp.frequency,
      exp.date,
      exp.startDate || '-',
      exp.endDate || 'Not Confirmed',
      `"${(exp.description || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row: any[]) => row.join(','))].join('\n');
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
      case 'pf': return 'Employer PF';
      case 'utilities': return 'Utilities';
      case 'marketing': return 'Marketing';
      case 'one-time': return 'One-Time';
      default: return cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : 'Other';
    }
  };

  const getCategoryChipColor = (cat: string) => {
    switch (cat) {
      case 'rent': return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.25)', label: 'Rent' }; // Emerald
      case 'salary': return { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.25)', label: 'Salary' }; // Blue
      case 'pf': return { color: '#6366f1', bg: 'rgba(99, 102, 241, 0.08)', border: 'rgba(99, 102, 241, 0.25)', label: 'Employer PF' }; // Indigo
      case 'utilities': return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.25)', label: 'Utilities' }; // Amber
      case 'marketing': return { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.08)', border: 'rgba(139, 92, 246, 0.25)', label: 'Marketing' }; // Purple
      case 'one-time': return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.25)', label: 'One-Time' }; // Red
      default: return { 
        color: '#6b7280', 
        bg: 'rgba(107, 114, 128, 0.08)', 
        border: 'rgba(107, 114, 128, 0.25)', 
        label: cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : 'Other' 
      }; // Grey
    }
  };


  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'rent': return <RentIcon />;
      case 'salary': return <SalaryIcon />;
      case 'pf': return <PfIcon />;
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
            <>
              <Button
                variant="outlined"
                onClick={() => setOpenCategoriesDialog(true)}
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
                Categories
              </Button>
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
            </>
          )}
        </Box>
      </Box>

      {/* Grid of KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MiniKpiCard
            label="Total Month Expenses"
            value={formatCurrency(totalCMExpenses)}
            icon={<ReceiptIcon />}
            color="var(--color-primary)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MiniKpiCard
            label="Employee Salaries"
            value={formatCurrency(getCMExpensesByCategory('salary'))}
            icon={<SalaryIcon />}
            color="#3b82f6"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MiniKpiCard
            label="Employer PF"
            value={formatCurrency(getCMExpensesByCategory('pf'))}
            icon={<PfIcon />}
            color="#6366f1"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MiniKpiCard
            label="Office Rent"
            value={formatCurrency(getCMExpensesByCategory('rent'))}
            icon={<RentIcon />}
            color="#10b981"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MiniKpiCard
            label="Utilities & Cloud"
            value={formatCurrency(getCMExpensesByCategory('utilities'))}
            icon={<UtilitiesIcon />}
            color="#f59e0b"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MiniKpiCard
            label="One-Time Payments"
            value={formatCurrency(getCMExpensesByFrequency('one-time'))}
            icon={<OneTimeIcon />}
            color="#ef4444"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MiniKpiCard
            label="Other Expenses"
            value={formatCurrency(getCMExpensesByCategory('other') + getCMExpensesByCategory('marketing'))}
            icon={<OtherIcon />}
            color="#8b5cf6"
          />
        </Grid>
      </Grid>

      {/* Filter panel */}
      <Paper sx={{ ...cardSx, p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
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
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth sx={selectStyles}>
              <InputLabel id="category-filter-label" sx={{ color: 'var(--color-text-secondary)' }}>Category</InputLabel>
              <Select
                labelId="category-filter-label"
                value={categoryFilter}
                label="Category"
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value="all">All Categories</MenuItem>
                {allCategories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {getCategoryLabel(cat)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
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
          <Grid item xs={12} sm={12} md={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={!excludeSalaries}
                  onChange={(e) => {
                    setExcludeSalaries(!e.target.checked);
                    setPage(0);
                  }}
                  color="primary"
                />
              }
              label="Include Salary Expenses"
              sx={{ color: 'var(--color-text-primary)' }}
            />
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
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Start Date</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>End Date</TableCell>
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
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={32} sx={{ color: 'var(--color-primary)' }} />
                  </TableCell>
                </TableRow>
              ) : filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'var(--color-text-muted)' }}>
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
                          icon={React.cloneElement(getCategoryIcon(exp.category), { style: { color: chipDetails.color, fontSize: 14 } })}
                          label={chipDetails.label}
                          size="small"
                          sx={{
                            bgcolor: chipDetails.bg,
                            color: chipDetails.color,
                            border: `1px solid ${chipDetails.border}`,
                            fontWeight: 600,
                            borderRadius: '8px',
                            px: 0.5,
                            '& .MuiChip-icon': { color: chipDetails.color }
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)' }}>
                        <Chip
                          label={exp.frequency === 'monthly' ? 'Monthly' : 'One-Time'}
                          size="small"
                          sx={{
                            bgcolor: exp.frequency === 'monthly' ? 'rgba(99, 102, 241, 0.08)' : 'var(--color-surface-subtle)',
                            color: exp.frequency === 'monthly' ? 'var(--color-primary-hover)' : 'var(--color-text-secondary)',
                            border: exp.frequency === 'monthly' ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid var(--color-border)',
                            fontWeight: 600,
                            borderRadius: '8px',
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)' }}>{exp.date}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)' }}>{exp.startDate || '-'}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)' }}>
                        {exp.endDate ? exp.endDate : <span style={{ fontStyle: 'italic', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Not Confirmed</span>}
                      </TableCell>
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
                <Autocomplete
                  options={categoryOptions}
                  value={formData.category || null}
                  getOptionLabel={(option) => getCategoryLabel(option)}
                  onChange={(_, value) => {
                    setFormData({ ...formData, category: value || '' });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Category"
                      fullWidth
                      required
                      sx={inputStyles}
                    />
                  )}
                  ListboxProps={{ sx: dropdownListStyles }}
                />
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
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Start Date"
                  type="date"
                  fullWidth
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  sx={inputStyles}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="End Date (Optional / Not Confirmed)"
                  type="date"
                  fullWidth
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  sx={inputStyles}
                  InputLabelProps={{ shrink: true }}
                />
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
      {/* Manage Categories Dialog */}
      <Dialog
        open={openCategoriesDialog}
        onClose={() => setOpenCategoriesDialog(false)}
        maxWidth="xs"
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
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', pb: 2 }}>
          Manage Expense Categories
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Box sx={{ display: 'flex', gap: 1.5, mb: 3, mt: 1 }}>
            <TextField
              placeholder="New category..."
              fullWidth
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              sx={inputStyles}
            />
            <Button
              variant="contained"
              onClick={handleAddCategory}
              sx={{
                background: 'var(--color-primary)',
                borderRadius: 'var(--radius-control)',
                textTransform: 'none',
              }}
            >
              Add
            </Button>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: '300px', overflowY: 'auto' }}>
            {dbCategories.map((cat: any) => (
              <Box
                key={cat.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.5,
                  borderRadius: 'var(--radius-control)',
                  border: '1px solid var(--color-border)',
                  bgcolor: 'var(--color-surface-subtle)',
                }}
              >
                <Typography sx={{ color: 'var(--color-text-primary)', textTransform: 'capitalize', fontWeight: 500 }}>
                  {getCategoryLabel(cat.name)}
                </Typography>
                <IconButton
                  onClick={() => deleteCategoryMutation.mutate(cat.id)}
                  sx={{ color: 'var(--color-text-secondary)', '&:hover': { color: 'var(--color-error)' } }}
                  disabled={['salary', 'pf', 'rent', 'utilities', 'marketing', 'one-time', 'other'].includes(cat.name)}
                >
                  <DeleteIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', px: 3, py: 2 }}>
          <Button
            onClick={() => setOpenCategoriesDialog(false)}
            sx={{
              color: 'var(--color-text-secondary)',
              textTransform: 'none',
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Reusable KPI card component with vibrant styling and animations
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
      background: `linear-gradient(135deg, var(--color-surface) 60%, ${color}0d 100%)`,
      border: '1px solid var(--color-border)',
      borderRadius: '16px',
      transition: 'all 240ms cubic-bezier(0.16, 1, 0.3, 1)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      '&:hover': {
        borderColor: color,
        boxShadow: `0 12px 24px -10px ${color}50`,
        transform: 'translateY(-4px)',
        background: `linear-gradient(135deg, var(--color-surface) 40%, ${color}1a 100%)`,
        '& .icon-wrapper': {
          transform: 'scale(1.1) rotate(6deg)',
          backgroundColor: color,
          color: '#ffffff',
          boxShadow: `0 8px 20px -6px ${color}`,
        }
      },
    }}
  >
    <Box sx={{ position: 'absolute', left: 0, top: 0, width: 4, height: '100%', bgcolor: color, borderRadius: '4px 0 0 4px' }} />
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.72rem' }}>
          {label}
        </Typography>
        <Typography variant="h6" sx={{ color: 'var(--color-text-primary)', fontWeight: 800, mt: 0.5, fontFamily: 'Outfit', fontSize: '1.25rem' }}>
          {value}
        </Typography>
      </Box>
      <Box
        className="icon-wrapper"
        sx={{
          color: color,
          backgroundColor: `${color}15`,
          p: 1,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 240ms cubic-bezier(0.16, 1, 0.3, 1)',
          '& svg': { fontSize: '1.4rem' }
        }}
      >
        {icon}
      </Box>
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

export default Expenses;
