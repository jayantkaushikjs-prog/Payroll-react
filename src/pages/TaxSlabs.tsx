import React, { useState } from 'react';
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)' }}>
            Tax Slabs Configuration
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mt: 0.5 }}>
            Configure progressive income tax brackets for salary calculations.
          </Typography>
        </Box>
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
            Add Tax Bracket
          </Button>
        )}
      </Box>

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
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Regime</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Annual Income - From</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Annual Income - To</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Tax Percentage</TableCell>
                {isFinanceOrAdmin && <TableCell align="right" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    <CircularProgress size={30} sx={{ color: 'var(--color-primary)' }} />
                  </TableCell>
                </TableRow>
              ) : slabs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'var(--color-text-muted)' }}>
                    No tax slabs configured for any financial year.
                  </TableCell>
                </TableRow>
              ) : (
                slabs.map((rec: TaxSlabRecord) => (
                  <TableRow key={rec.id} sx={{ '&:hover': { bgcolor: 'var(--color-row-hover)' }, borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                    <TableCell sx={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{rec.financial_year}</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-primary)', textTransform: 'capitalize' }}>{rec.regime || 'new'}</TableCell>
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
                  sx={inputStyles}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  label="Tax Regime"
                  fullWidth
                  required
                  value={formData.regime}
                  onChange={(e) => setFormData({ ...formData, regime: e.target.value })}
                  sx={inputStyles}
                >
                  <MenuItem value="new">New Tax Regime</MenuItem>
                  <MenuItem value="old">Old Tax Regime</MenuItem>
                </TextField>
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
                  sx={inputStyles}
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
                  sx={inputStyles}
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
              Add Bracket
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
    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
    '&.Mui-focused fieldset': { borderColor: 'var(--color-primary)' },
  },
  '& .MuiInputLabel-root': { color: 'var(--color-text-secondary)' },
  '& .MuiInputLabel-root.Mui-focused': { color: 'var(--color-primary-hover)' },
};

export default TaxSlabs;
