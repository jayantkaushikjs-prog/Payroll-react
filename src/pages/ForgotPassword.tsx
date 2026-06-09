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
  Link,
} from '@mui/material';
import { HelpOutlineOutlined as ForgotIcon, ContentCopy as CopyIcon } from '@mui/icons-material';
import api from '../services/api';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setToken(res.data.token);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to request reset token. Please verify your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
              <ForgotIcon />
            </Box>
            <Typography
              variant="h5"
              fontWeight="bold"
              fontFamily="Outfit"
              sx={{ color: 'var(--color-text-primary)', letterSpacing: '0.5px' }}
            >
              Forgot Password
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mt: 0.5, textAlign: 'center' }}>
              {!token
                ? 'Enter your email address and we will generate a password reset token'
                : 'Reset token successfully generated!'}
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(244, 63, 94, 0.15)', color: 'var(--color-error)' }}>
              {error}
            </Alert>
          )}

          {!token ? (
            <form onSubmit={handleSubmit}>
              <TextField
                label="Email Address"
                fullWidth
                variant="outlined"
                margin="normal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
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
                {loading ? <CircularProgress size={24} sx={{ color: 'var(--color-text-primary)' }} /> : 'Request Reset Token'}
              </Button>
            </form>
          ) : (
            <Box>
              <Alert severity="info" sx={{ mb: 3, bgcolor: 'rgba(59, 130, 246, 0.15)', color: 'var(--color-info)' }}>
                For sandbox testing, please copy the token below to reset your password.
              </Alert>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  bgcolor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-control)',
                  p: 1.5,
                  mb: 3,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    color: 'var(--color-text-primary)',
                    wordBreak: 'break-all',
                    flexGrow: 1,
                    userSelect: 'all',
                  }}
                >
                  {token}
                </Typography>
                <Button
                  size="small"
                  onClick={handleCopy}
                  sx={{ minWidth: 'auto', p: 1, color: copied ? 'var(--color-success)' : 'var(--color-text-secondary)' }}
                >
                  {copied ? 'Copied' : <CopyIcon fontSize="small" />}
                </Button>
              </Box>

              <Button
                fullWidth
                variant="contained"
                onClick={() => navigate(`/reset-password?token=${token}`)}
                sx={{
                  py: 1.3,
                  fontSize: '1rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-control)',
                  background: 'var(--color-primary)',
                  '&:hover': {
                    background: 'var(--color-primary-pressed)',
                  },
                  textTransform: 'none',
                }}
              >
                Proceed to Reset Password
              </Button>
            </Box>
          )}

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

export default ForgotPassword;
