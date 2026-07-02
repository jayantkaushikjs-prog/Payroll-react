import React, { useEffect, useRef, useState } from 'react';
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
import { THPMSLogo } from '../components/brand/THPMSLogo';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: any) => void;
          renderButton: (element: HTMLElement, options: any) => void;
          cancel: () => void;
        };
      };
    };
  }
}

const Login: React.FC = () => {
  const { login, loginWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleInitializedRef = useRef(false);

  // If already logged in, redirect to dashboard
  React.useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID || googleInitializedRef.current) {
      return;
    }

    const initializeGoogleButton = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current || googleInitializedRef.current) {
        return;
      }

      googleInitializedRef.current = true;

      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: async (response: { credential?: string }) => {
          if (!response.credential) {
            return;
          }
          try {
            setError(null);
            setLoading(true);
            await loginWithGoogle(response.credential);
            navigate('/');
          } catch (err: any) {
            setError(err.response?.data?.message || 'Google sign-in failed.');
          } finally {
            setLoading(false);
          }
        },
      });

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        width: 280,
      });
    };

    const existingScript = document.getElementById('google-gsi-script');
    if (existingScript) {
      initializeGoogleButton();
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogleButton;
    document.head.appendChild(script);
  }, [loginWithGoogle, navigate]);

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
            <Box sx={{ mb: 2 }}>
              <THPMSLogo size={56} />
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
              Sign in to manage TH-PMS payroll
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

          {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', textAlign: 'center', mb: 1.5 }}>
                Or continue with
              </Typography>
              <div ref={googleButtonRef} />
            </Box>
          )}

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
