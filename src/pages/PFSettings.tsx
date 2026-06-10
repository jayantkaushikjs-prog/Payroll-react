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
  Snackbar,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

interface PFSettingsRecord {
  id: number;
  employee_contribution_rate: number;
  employer_contribution_rate: number;
  effective_date: string;
}

const PFSettings: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    employee_contribution_rate: 12.0,
    employer_contribution_rate: 12.0,
    effective_date: '',
  });

  const isFinanceOrAdmin = user && (user.role === Role.SUPER_ADMIN || user.role === Role.FINANCE);

  // Fetch all PF Settings
  const { data: pfList = [], isLoading } = useQuery(['pfSettings'], async () => {
    const res = await api.get('/pf');
    return res.data;
  });

  // Create mutation
  const createMutation = useMutation(
    async (payload: any) => {
      const res = await api.post('/pf', payload);
      return res.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['pfSettings']);
        setNotification({ open: true, message: 'PF Settings configuration saved!', severity: 'success' });
        setOpenDialog(false);
      },
      onError: (err: any) => {
        setNotification({ open: true, message: err.response?.data?.message || 'Failed to save PF configuration', severity: 'error' });
      },
    }
  );

  // Delete mutation
  const deleteMutation = useMutation(
    async (id: number) => {
      await api.delete(`/pf/${id}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['pfSettings']);
        setNotification({ open: true, message: 'PF configuration removed.', severity: 'success' });
      },
      onError: (err: any) => {
        setNotification({ open: true, message: err.response?.data?.message || 'Failed to delete configuration', severity: 'error' });
      },
    }
  );

  const handleOpenAdd = () => {
    setFormData({
      employee_contribution_rate: 12.0,
      employer_contribution_rate: 12.0,
      effective_date: new Date().toISOString().split('T')[0],
    });
    setOpenDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      employee_contribution_rate: Number(formData.employee_contribution_rate),
      employer_contribution_rate: Number(formData.employer_contribution_rate),
      effective_date: formData.effective_date,
    });
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this PF configuration?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)' }}>
            Provident Fund (PF) Configuration
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mt: 0.5 }}>
            Configure default employee and employer contribution percentages.
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
            Configure Rates
          </Button>
        )}
      </Box>

      {/* Settings History Table */}
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
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Effective Starting Date</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Employee Contribution Rate</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Employer Contribution Rate</TableCell>
                {isFinanceOrAdmin && <TableCell align="right" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                    <CircularProgress size={30} sx={{ color: 'var(--color-primary)' }} />
                  </TableCell>
                </TableRow>
              ) : pfList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'var(--color-text-muted)' }}>
                    No PF settings configured. Default rates (12% employee / 12% employer) will be applied.
                  </TableCell>
                </TableRow>
              ) : (
                pfList.map((rec: PFSettingsRecord) => (
                  <TableRow key={rec.id} sx={{ '&:hover': { bgcolor: 'var(--color-row-hover)' }, borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                    <TableCell sx={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{rec.effective_date}</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-primary)' }}>{rec.employee_contribution_rate}%</TableCell>
                    <TableCell sx={{ color: 'var(--color-text-primary)' }}>{rec.employer_contribution_rate}%</TableCell>
                    {isFinanceOrAdmin && (
                      <TableCell align="right">
                        <Tooltip title="Delete Settings">
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

      {/* Configure dialog */}
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
          New PF Configuration
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ py: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  label="Employee Contribution Rate (%)"
                  type="number"
                  fullWidth
                  required
                  inputProps={{ step: 0.1, min: 0, max: 100 }}
                  value={formData.employee_contribution_rate}
                  onChange={(e) => setFormData({ ...formData, employee_contribution_rate: parseFloat(e.target.value) || 0 })}
                  sx={inputStyles}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Employer Contribution Rate (%)"
                  type="number"
                  fullWidth
                  required
                  inputProps={{ step: 0.1, min: 0, max: 100 }}
                  value={formData.employer_contribution_rate}
                  onChange={(e) => setFormData({ ...formData, employer_contribution_rate: parseFloat(e.target.value) || 0 })}
                  sx={inputStyles}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Effective Starting Date"
                  type="date"
                  fullWidth
                  required
                  value={formData.effective_date}
                  onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
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
              Save Configuration
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

export default PFSettings;
