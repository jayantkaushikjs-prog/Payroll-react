import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  LockOpenOutlined as ResetIcon,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import api from '../services/api';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess('Password has been reset successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. Please check your token.');
    } finally {
      setLoading(false);
    }
  };

  const textFieldStyle = {
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
              <ResetIcon />
            </Box>
            <Typography
              variant="h5"
              fontWeight="bold"
              fontFamily="Outfit"
              sx={{ color: 'var(--color-text-primary)', letterSpacing: '0.5px' }}
            >
              Reset Password
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mt: 0.5 }}>
              Enter the reset OTP and choose a new password
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
              label="One-Time Password (OTP)"
              fullWidth
              variant="outlined"
              margin="normal"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={loading}
              sx={textFieldStyle}
            />
            <TextField
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              variant="outlined"
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      sx={{ color: 'var(--color-text-secondary)' }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={textFieldStyle}
            />

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
              {loading ? <CircularProgress size={24} sx={{ color: 'var(--color-text-primary)' }} /> : 'Reset Password'}
            </Button>
          </form>

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
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
              Back to Login
            </Link>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ResetPassword;
