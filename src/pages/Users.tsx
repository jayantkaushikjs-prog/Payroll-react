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
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
} from '@mui/material';
import { useToast } from '../context/ToastContext';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Lock as LockIcon,
  Block as BlockIcon,
  LockOpen as LockOpenIcon,
} from '@mui/icons-material';

interface UserRecord {
  id: number;
  email: string;
  role: Role;
  is_blocked: boolean;
  created_at: string;
}

const Users: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(Role.HR);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch users
  const { data: users = [], isLoading } = useQuery(['users'], async () => {
    const res = await api.get('/users');
    return res.data;
  });

  // Create user mutation
  const createUserMutation = useMutation(
    async (newUser: any) => {
      const res = await api.post('/users', newUser);
      return res.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['users']);
        showToast('User added successfully!', 'success');
        setOpenDialog(false);
        // Clear form
        setEmail('');
        setPassword('');
        setRole(Role.HR);
      },
      onError: (err: any) => {
        showToast(err.response?.data?.message || 'Failed to add user', 'error');
      },
    }
  );

  // Delete user mutation
  const deleteUserMutation = useMutation(
    async (id: number) => {
      await api.delete(`/users/${id}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['users']);
        showToast('User deleted successfully.', 'success');
      },
      onError: (err: any) => {
        showToast(err.response?.data?.message || 'Failed to delete user', 'error');
      },
    }
  );

  // Toggle block user mutation
  const toggleBlockMutation = useMutation(
    async ({ id, is_blocked }: { id: number; is_blocked: boolean }) => {
      await api.patch(`/users/${id}/block`, { is_blocked });
    },
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries(['users']);
        showToast(
          `User account ${variables.is_blocked ? 'blocked' : 'unblocked'} successfully.`,
          'success'
        );
      },
      onError: (err: any) => {
        showToast(err.response?.data?.message || 'Failed to update block status', 'error');
      },
    }
  );

  const handleOpenAddDialog = () => {
    setError(null);
    setEmail('');
    setPassword('');
    setRole(Role.HR);
    setOpenDialog(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !role) {
      setError('Please fill in all fields');
      return;
    }

    createUserMutation.mutate({ email, password, role });
  };

  const handleDelete = (user: UserRecord) => {
    if (user.role === Role.SUPER_ADMIN) {
      showToast('Super Admin cannot be deleted!', 'error');
      return;
    }
    if (currentUser && currentUser.id === user.id) {
      showToast('You cannot delete your own logged-in account!', 'error');
      return;
    }
    if (window.confirm(`Are you sure you want to delete user: ${user.email}?`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const handleToggleBlock = (user: UserRecord) => {
    if (user.role === Role.SUPER_ADMIN) {
      showToast('Super Admin cannot be blocked!', 'error');
      return;
    }
    if (currentUser && currentUser.id === user.id) {
      showToast('You cannot block your own logged-in account!', 'error');
      return;
    }
    const action = user.is_blocked ? 'unblock' : 'block';
    if (window.confirm(`Are you sure you want to ${action} user: ${user.email}?`)) {
      toggleBlockMutation.mutate({ id: user.id, is_blocked: !user.is_blocked });
    }
  };

  const getRoleColor = (role: Role) => {
    switch (role) {
      case Role.SUPER_ADMIN:
        return 'error';
      case Role.FINANCE:
        return 'success';
      case Role.HR:
        return 'primary';
      default:
        return 'default';
    }
  };

  const filteredUsers = users.filter((u: UserRecord) =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h5" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)' }}>
          User Management
        </Typography>
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
          Add User
        </Button>
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
          placeholder="Search by email or role..."
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
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Email Address</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>System Role</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Created At</TableCell>
                <TableCell align="right" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                    <CircularProgress size={30} sx={{ color: 'var(--color-primary)' }} />
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'var(--color-text-muted)' }}>
                    No users found matching the search filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u: UserRecord) => (
                  <TableRow
                    key={u.id}
                    sx={{
                      '&:hover': { bgcolor: 'var(--color-row-hover)' },
                      borderColor: 'rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <TableCell sx={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{u.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={u.role}
                        size="small"
                        color={getRoleColor(u.role)}
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={u.is_blocked ? 'Blocked' : 'Active'}
                        size="small"
                        color={u.is_blocked ? 'error' : 'success'}
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: 'var(--color-text-primary)' }}>
                      {new Date(u.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell align="right">
                      {u.role === Role.SUPER_ADMIN ? (
                        <Tooltip title="Super Admin cannot be modified">
                          <span>
                            <IconButton disabled sx={{ color: 'var(--color-text-muted)' }}>
                              <LockIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      ) : (
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                          <Tooltip title={u.is_blocked ? 'Unblock User' : 'Block User'}>
                            <IconButton
                              onClick={() => handleToggleBlock(u)}
                              sx={{ color: u.is_blocked ? 'var(--color-success)' : 'var(--color-warning)' }}
                              disabled={currentUser?.id === u.id}
                            >
                              {u.is_blocked ? <LockOpenIcon fontSize="small" /> : <BlockIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete User">
                            <IconButton
                              onClick={() => handleDelete(u)}
                              sx={{ color: 'var(--color-error)' }}
                              disabled={currentUser?.id === u.id}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </TableCell>
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
          Add New System User
        </DialogTitle>
        <form onSubmit={handleFormSubmit}>
          <DialogContent sx={{ py: 3 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(244, 63, 94, 0.15)', color: 'var(--color-error)' }}>
                {error}
              </Alert>
            )}
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  label="Email Address"
                  type="email"
                  fullWidth
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  sx={inputStyles}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Password"
                  type="password"
                  fullWidth
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  sx={inputStyles}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth sx={inputStyles}>
                  <InputLabel id="role-select-label">System Role</InputLabel>
                  <Select
                    labelId="role-select-label"
                    id="role-select"
                    value={role}
                    label="System Role"
                    onChange={(e) => setRole(e.target.value as Role)}
                  >
                    <MenuItem value={Role.FINANCE}>Finance</MenuItem>
                    <MenuItem value={Role.HR}>HR</MenuItem>
                  </Select>
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
              disabled={createUserMutation.isLoading}
              sx={{
                background: 'var(--color-primary)',
                borderRadius: 'var(--radius-control)',
                px: 3,
                textTransform: 'none',
              }}
            >
              {createUserMutation.isLoading ? <CircularProgress size={24} sx={{ color: 'var(--color-text-primary)' }} /> : 'Add User'}
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

export default Users;
