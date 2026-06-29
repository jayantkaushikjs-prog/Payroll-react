import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { formatCurrency as formatInr } from '../constants/currency';
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
  CircularProgress,
  IconButton,
  Tooltip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import { useToast } from '../context/ToastContext';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

interface TaxSlabRecord {
  id: number;
  financial_year: string;
  regime: string;
  from_amount: number;
  to_amount: number | null;
  percentage: number;
}

const TaxSlabs: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    financial_year: '2026-2027',
    regime: 'new',
    from_amount: 0,
    to_amount: '',
    percentage: 0,
  });

  const isFinanceOrAdmin = user && (user.role === Role.SUPER_ADMIN || user.role === Role.FINANCE);

  // Fetch tax slabs
  const { data: slabs = [], isLoading } = useQuery(['taxSlabs'], async () => {
    const res = await api.get('/tax');
    return res.data;
  });

  const [selectedYear, setSelectedYear] = useState('2026-2027');
  const years = Array.from(new Set(slabs.map((s: any) => s.financial_year))).sort().reverse() as string[];

  useEffect(() => {
    if (years.length > 0 && !years.includes(selectedYear)) {
      setSelectedYear(years[0]);
    }
  }, [slabs]);

  // Create mutation
  const createMutation = useMutation(
    async (payload: any) => {
      const res = await api.post('/tax', payload);
      return res.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['taxSlabs']);
        showToast('Tax slab added successfully!', 'success');
        setOpenDialog(false);
      },
      onError: (err: any) => {
        showToast(err.response?.data?.message || 'Failed to add tax slab', 'error');
      },
    }
  );

  // Delete mutation
  const deleteMutation = useMutation(
    async (id: number) => {
      await api.delete(`/tax/${id}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['taxSlabs']);
        showToast('Tax slab deleted.', 'success');
      },
      onError: (err: any) => {
        showToast(err.response?.data?.message || 'Failed to delete tax slab', 'error');
      },
    }
  );

  const handleOpenAdd = () => {
    setFormData({
      financial_year: '2026-2027',
      regime: 'new',
      from_amount: 0,
      to_amount: '',
      percentage: 0,
    });
    setOpenDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      financial_year: formData.financial_year,
      regime: formData.regime,
      from_amount: Number(formData.from_amount),
      to_amount: formData.to_amount === '' ? null : Number(formData.to_amount),
      percentage: Number(formData.percentage),
    });
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this tax slab?')) {
      deleteMutation.mutate(id);
    }
  };

  const formatSlabAmount = (val: number | null) => {
    if (val === null) return 'No limit';
    return formatInr(val);
  };

  const actionsNode = document.getElementById('compliance-actions');

  return (
    <Box>
      {actionsNode && createPortal(
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {years.length > 0 && (
            <FormControl sx={{ minWidth: 150 }}>
              <Select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value as string)}
                size="small"
                sx={{
                  color: 'var(--color-text-primary)',
                  borderRadius: 'var(--radius-control)',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-border)' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-primary)' },
                }}
              >
                {years.map((y) => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
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
              Add Bracket
            </Button>
          )}
        </Box>,
        actionsNode
      )}

      {/* Active Rules Card */}
      <Paper
        sx={{
          p: 3,
          mb: 4,
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.03) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: 'var(--radius-card)',
          boxShadow: '0 8px 32px 0 rgba(99, 102, 241, 0.04)',
        }}
      >
        <Typography variant="subtitle1" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-primary-hover)', display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          ✨ Active FY 2025-26 & FY 2026-27 Rules & Reliefs (New Tax Regime)
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={4}>
            <Box>
              <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600, display: 'block', mb: 0.5 }}>STANDARD DEDUCTION</Typography>
              <Typography variant="body1" fontWeight="bold" sx={{ color: 'var(--color-text-primary)' }}>₹75,000</Typography>
              <Typography variant="caption" sx={{ color: 'var(--color-text-muted)' }}>Automatically applied to salaried employees</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Box>
              <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600, display: 'block', mb: 0.5 }}>SECTION 87A REBATE</Typography>
              <Typography variant="body1" fontWeight="bold" sx={{ color: 'var(--color-text-primary)' }}>Up to ₹60,000</Typography>
              <Typography variant="caption" sx={{ color: 'var(--color-text-muted)' }}>Applicable if taxable income is ≤ ₹12 Lakhs</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Box>
              <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600, display: 'block', mb: 0.5 }}>EFFECTIVE ZERO TAX</Typography>
              <Typography variant="body1" fontWeight="bold" sx={{ color: 'var(--color-success)' }}>Up to ₹12,75,000</Typography>
              <Typography variant="caption" sx={{ color: 'var(--color-text-muted)' }}>Total gross salary with Standard Deduction + Rebate</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Box>
              <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600, display: 'block', mb: 0.5 }}>HEALTH & EDUCATION CESS</Typography>
              <Typography variant="body1" fontWeight="bold" sx={{ color: 'var(--color-text-primary)' }}>4.0%</Typography>
              <Typography variant="caption" sx={{ color: 'var(--color-text-muted)' }}>Levied on calculated tax and surcharge</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Box>
              <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600, display: 'block', mb: 0.5 }}>MARGINAL RELIEF</Typography>
              <Typography variant="body1" fontWeight="bold" sx={{ color: 'var(--color-text-primary)' }}>Enabled</Typography>
              <Typography variant="caption" sx={{ color: 'var(--color-text-muted)' }}>Capped tax increase above ₹12 Lakhs threshold</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Box>
              <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600, display: 'block', mb: 0.5 }}>SURCHARGE (HIGH INCOME)</Typography>
              <Typography variant="body1" fontWeight="bold" sx={{ color: 'var(--color-text-primary)' }}>10% / 15% / 25%</Typography>
              <Typography variant="caption" sx={{ color: 'var(--color-text-muted)' }}>Capped at 25% under the new tax regime</Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Tax Slabs List */}
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
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Financial Year</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Annual Income - From</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Annual Income - To</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Tax Percentage</TableCell>
                {isFinanceOrAdmin && <TableCell align="right" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                    <CircularProgress size={30} sx={{ color: 'var(--color-primary)' }} />
                  </TableCell>
                </TableRow>
              ) : slabs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'var(--color-text-muted)' }}>
                    No tax slabs configured for any financial year.
                  </TableCell>
                </TableRow>
              ) : (
                slabs
                  .filter((rec: TaxSlabRecord) => rec.financial_year === selectedYear)
                  .map((rec: TaxSlabRecord) => (
                  <TableRow key={rec.id} sx={{ '&:hover': { bgcolor: 'var(--color-row-hover)' }, borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                    <TableCell sx={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{rec.financial_year}</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-primary)' }}>{formatSlabAmount(rec.from_amount)}</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-primary)' }}>{formatSlabAmount(rec.to_amount)}</TableCell>
                    <TableCell sx={{ color: 'var(--color-warning)', fontWeight: 600 }}>{rec.percentage}%</TableCell>
                    {isFinanceOrAdmin && (
                      <TableCell align="right">
                        <Tooltip title="Delete Slab">
                          <IconButton onClick={() => handleDelete(rec.id)} sx={{ color: 'var(--color-error)' }}>
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

      {/* Add Dialog */}
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
          Create Income Tax Slab
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ py: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  label="Financial Year (e.g. 2026-2027)"
                  fullWidth
                  required
                  placeholder="YYYY-YYYY"
                  value={formData.financial_year}
                  onChange={(e) => setFormData({ ...formData, financial_year: e.target.value })}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="From Annual Amount (₹)"
                  type="number"
                  fullWidth
                  required
                  inputProps={{ min: 0 }}
                  value={formData.from_amount}
                  onChange={(e) => setFormData({ ...formData, from_amount: parseFloat(e.target.value) || 0 })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="To Annual Amount (₹) - Leave blank for Unlimited"
                  type="number"
                  fullWidth
                  placeholder="Unlimited"
                  inputProps={{ min: 0 }}
                  value={formData.to_amount}
                  onChange={(e) => setFormData({ ...formData, to_amount: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Tax Percentage (%)"
                  type="number"
                  fullWidth
                  required
                  inputProps={{ min: 0, max: 100, step: 0.1 }}
                  value={formData.percentage}
                  onChange={(e) => setFormData({ ...formData, percentage: parseFloat(e.target.value) || 0 })}
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
              Add Bracket
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default TaxSlabs;
