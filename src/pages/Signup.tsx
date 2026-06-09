import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Link,
} from '@mui/material';
import { PersonAddOutlined as SignupIcon } from '@mui/icons-material';
import api from '../services/api';
import { Role } from '../context/AuthContext';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(Role.HR);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !role) {
      setError('Please fill in all fields');
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await api.post('/auth/register', { email, password, role });
      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectStyle = {
    '& .MuiOutlinedInput-root': {
      color: 'var(--color-text-primary)',
      '& fieldset': { borderColor: 'var(--color-border)' },
      '&:hover fieldset': { borderColor: 'var(--color-border-strong)' },
      '&.Mui-focused fieldset': { borderColor: 'var(--color-primary)' },
    },
    '& .MuiInputLabel-root': { color: 'var(--color-text-secondary)' },
    '& .MuiInputLabel-root.Mui-focused': { color: 'var(--color-primary-hover)' },
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, var(--color-bg) 0%, #111827 50%, var(--color-sidebar) 100%)',
        p: 2,
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 440,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                bgcolor: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--color-primary-hover)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
                border: '1px solid rgba(99, 102, 241, 0.3)',
              }}
            >
              <SignupIcon />
            </Box>
            <Typography
              variant="h5"
              fontWeight="bold"
              fontFamily="Outfit"
              sx={{ color: 'var(--color-text-primary)', letterSpacing: '0.5px' }}
            >
              Create Account
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mt: 0.5 }}>
              Register a new user to manage organizational roles
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(244, 63, 94, 0.15)', color: 'var(--color-error)' }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3, bgcolor: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)' }}>
              {success}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              label="Email Address"
              fullWidth
              variant="outlined"
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              sx={selectStyle}
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              variant="outlined"
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              sx={selectStyle}
            />

            <FormControl fullWidth margin="normal" sx={selectStyle}>
              <InputLabel id="role-select-label">Select Role</InputLabel>
              <Select
                labelId="role-select-label"
                id="role-select"
                value={role}
                label="Select Role"
                onChange={(e) => setRole(e.target.value as Role)}
                disabled={loading}
              >
                <MenuItem value={Role.SUPER_ADMIN}>Super Admin</MenuItem>
                <MenuItem value={Role.FINANCE}>Finance</MenuItem>
                <MenuItem value={Role.HR}>HR</MenuItem>
              </Select>
            </FormControl>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mt: 3,
                py: 1.3,
                fontSize: '1rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-control)',
                background: 'var(--color-primary)',
                boxShadow: '0 8px 18px rgba(99, 102, 241, 0.22)',
                '&:hover': {
                  background: 'var(--color-primary-pressed)',
                },
                textTransform: 'none',
              }}
            >
              {loading ? <CircularProgress size={24} sx={{ color: 'var(--color-text-primary)' }} /> : 'Sign Up'}
            </Button>
          </form>

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
              Already have an account?{' '}
              <Link
                component={RouterLink}
                to="/login"
                sx={{
                  color: 'var(--color-primary-hover)',
                  textDecoration: 'none',
                  fontWeight: 600,
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Sign In
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Signup;
