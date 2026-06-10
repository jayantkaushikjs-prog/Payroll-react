import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Link,
} from '@mui/material';
import { LockOutlined as LockIcon, Visibility, VisibilityOff } from '@mui/icons-material';

const Login: React.FC = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect to dashboard
  React.useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
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
              <LockIcon />
            </Box>
            <Typography
              variant="h5"
              fontWeight="bold"
              fontFamily="Outfit"
              sx={{ color: 'var(--color-text-primary)', letterSpacing: '0.5px' }}
            >
              Welcome Back
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mt: 0.5 }}>
              Sign in to manage THPS payroll
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(244, 63, 94, 0.15)', color: 'var(--color-error)' }}>
              {error}
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
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: 'var(--color-text-primary)',
                  '& fieldset': { borderColor: 'var(--color-border)' },
                  '&:hover fieldset': { borderColor: 'var(--color-border-strong)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--color-primary)' },
                },
                '& .MuiInputLabel-root': { color: 'var(--color-text-secondary)' },
                '& .MuiInputLabel-root.Mui-focused': { color: 'var(--color-primary-hover)' },
              }}
            />
            <TextField
              label="Password"
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
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: 'var(--color-text-primary)',
                  '& fieldset': { borderColor: 'var(--color-border)' },
                  '&:hover fieldset': { borderColor: 'var(--color-border-strong)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--color-primary)' },
                },
                '& .MuiInputLabel-root': { color: 'var(--color-text-secondary)' },
                '& .MuiInputLabel-root.Mui-focused': { color: 'var(--color-primary-hover)' },
              }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
              <Link
                component={RouterLink}
                to="/forgot-password"
                variant="body2"
                sx={{
                  color: 'var(--color-primary-hover)',
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Forgot Password?
              </Link>
            </Box>

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
              {loading ? <CircularProgress size={24} sx={{ color: 'var(--color-text-primary)' }} /> : 'Sign In'}
            </Button>
          </form>

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Typography variant="body2" sx={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
              Only administrative users can manage organization credentials.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
