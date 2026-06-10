import React, { createContext, useContext, useState, useCallback } from 'react';
import { Box, IconButton, Typography, Portal } from '@mui/material';
import {
  CheckCircleOutline as SuccessIcon,
  ErrorOutline as ErrorIcon,
  InfoOutlined as InfoIcon,
  WarningAmberOutlined as WarningIcon,
  Close as CloseIcon
} from '@mui/icons-material';

export type ToastSeverity = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  severity: ToastSeverity;
}

interface ToastContextType {
  showToast: (message: string, severity?: ToastSeverity) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, severity: ToastSeverity = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, severity }]);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const getSeverityStyles = (severity: ToastSeverity) => {
    switch (severity) {
      case 'success':
        return {
          icon: <SuccessIcon sx={{ color: '#10b981', fontSize: 24 }} />,
          border: '1px solid rgba(16, 185, 129, 0.2)',
          glow: 'rgba(16, 185, 129, 0.15)',
          barColor: '#10b981',
        };
      case 'error':
        return {
          icon: <ErrorIcon sx={{ color: '#f43f5e', fontSize: 24 }} />,
          border: '1px solid rgba(244, 63, 94, 0.2)',
          glow: 'rgba(244, 63, 94, 0.15)',
          barColor: '#f43f5e',
        };
      case 'warning':
        return {
          icon: <WarningIcon sx={{ color: '#f59e0b', fontSize: 24 }} />,
          border: '1px solid rgba(245, 158, 11, 0.2)',
          glow: 'rgba(245, 158, 11, 0.15)',
          barColor: '#f59e0b',
        };
      case 'info':
      default:
        return {
          icon: <InfoIcon sx={{ color: '#3b82f6', fontSize: 24 }} />,
          border: '1px solid rgba(59, 130, 246, 0.2)',
          glow: 'rgba(59, 130, 246, 0.15)',
          barColor: '#3b82f6',
        };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Portal>
        <Box
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            maxWidth: 380,
            width: 'calc(100vw - 48px)',
          }}
        >
          {toasts.map((toast) => {
            const styles = getSeverityStyles(toast.severity);
            return (
              <Box
                key={toast.id}
                sx={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  pb: 2.2, // extra bottom padding for the progress bar
                  bgcolor: 'rgba(17, 24, 39, 0.95)',
                  backdropFilter: 'blur(8px)',
                  border: styles.border,
                  boxShadow: `0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 0 15px 0 ${styles.glow}`,
                  borderRadius: '12px',
                  color: '#f3f4f6',
                  overflow: 'hidden',
                  animation: 'toast-slide-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                  '@keyframes toast-slide-in': {
                    from: {
                      opacity: 0,
                      transform: 'translateY(20px) scale(0.95)',
                    },
                    to: {
                      opacity: 1,
                      transform: 'translateY(0) scale(1)',
                    },
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {styles.icon}
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.4, fontFamily: 'Inter' }}>
                    {toast.message}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={() => removeToast(toast.id)}
                  sx={{ color: '#9ca3af', '&:hover': { color: '#f3f4f6' } }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>

                {/* Linear progress bar at the bottom */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    height: 3,
                    bgcolor: styles.barColor,
                    width: '100%',
                    animation: 'toast-progress 4s linear forwards',
                    transformOrigin: 'left',
                    '@keyframes toast-progress': {
                      from: { transform: 'scaleX(1)' },
                      to: { transform: 'scaleX(0)' },
                    },
                  }}
                />
              </Box>
            );
          })}
        </Box>
      </Portal>
    </ToastContext.Provider>
  );
};
