import { createTheme } from '@mui/material';

export const paletteTokens = {
  dark: {
    bg: '#0b1020',
    sidebar: '#111827',
    surface: '#172033',
    surfaceElevated: '#1f2937',
    surfaceSubtle: 'rgba(255, 255, 255, 0.035)',
    rowHover: 'rgba(148, 163, 184, 0.08)',
    border: 'rgba(148, 163, 184, 0.18)',
    borderStrong: '#334155',
    textPrimary: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    textDisabled: '#64748b',
    primary: '#6366f1',
    primaryHover: '#818cf8',
    primaryPressed: '#4f46e5',
    secondary: '#0ea5e9',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#38bdf8',
    accent: '#a78bfa',
  },
  light: {
    bg: '#f8fafc',
    sidebar: '#ffffff',
    surface: '#ffffff',
    surfaceElevated: '#f1f5f9',
    surfaceSubtle: 'rgba(15, 23, 42, 0.035)',
    rowHover: 'rgba(99, 102, 241, 0.06)',
    border: 'rgba(15, 23, 42, 0.12)',
    borderStrong: '#cbd5e1',
    textPrimary: '#0f172a',
    textSecondary: '#334155',
    textMuted: '#64748b',
    textDisabled: '#94a3b8',
    primary: '#4f46e5',
    primaryHover: '#4338ca',
    primaryPressed: '#3730a3',
    secondary: '#0284c7',
    success: '#15803d',
    warning: '#b45309',
    error: '#dc2626',
    info: '#0369a1',
    accent: '#7c3aed',
  },
} as const;

export const getThemeCssVariables = (mode: 'light' | 'dark') => {
  const active = paletteTokens[mode];
  return {
    '--color-bg': active.bg,
    '--color-sidebar': active.sidebar,
    '--color-surface': active.surface,
    '--color-surface-elevated': active.surfaceElevated,
    '--color-surface-subtle': active.surfaceSubtle,
    '--color-row-hover': active.rowHover,
    '--color-border': active.border,
    '--color-border-strong': active.borderStrong,
    '--color-text-primary': active.textPrimary,
    '--color-text-secondary': active.textSecondary,
    '--color-text-muted': active.textMuted,
    '--color-text-disabled': active.textDisabled,
    '--color-primary': active.primary,
    '--color-primary-hover': active.primaryHover,
    '--color-primary-pressed': active.primaryPressed,
    '--color-secondary': active.secondary,
    '--color-success': active.success,
    '--color-warning': active.warning,
    '--color-error': active.error,
    '--color-info': active.info,
    '--color-accent': active.accent,
    '--shadow-card': mode === 'dark' ? '0 12px 30px rgba(2, 6, 23, 0.22)' : '0 12px 30px rgba(15, 23, 42, 0.08)',
    '--shadow-card-hover': mode === 'dark' ? '0 18px 42px rgba(2, 6, 23, 0.34)' : '0 18px 42px rgba(15, 23, 42, 0.14)',
    '--radius-card': '12px',
    '--radius-control': '10px',
  };
};

export const buildTheme = (mode: 'light' | 'dark') => {
  const active = paletteTokens[mode];
  const variables = getThemeCssVariables(mode);

  return createTheme({
    palette: {
      mode,
      background: { default: active.bg, paper: active.surface },
      primary: { main: active.primary, light: active.primaryHover, dark: active.primaryPressed, contrastText: '#ffffff' },
      secondary: { main: active.secondary },
      success: { main: active.success },
      warning: { main: active.warning },
      error: { main: active.error },
      info: { main: active.info },
      text: {
        primary: active.textPrimary,
        secondary: active.textSecondary,
        disabled: active.textDisabled,
      },
      divider: active.border,
    },
    typography: {
      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      h5: { fontWeight: 700, letterSpacing: 0 },
      h6: { fontWeight: 700, letterSpacing: 0 },
      button: { textTransform: 'none', fontWeight: 700, letterSpacing: 0 },
    },
    shape: { borderRadius: 10 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ':root': variables,
          body: {
            backgroundColor: 'var(--color-bg)',
            color: 'var(--color-text-primary)',
          },
          'input[type="date"]::-webkit-calendar-picker-indicator': {
            filter: mode === 'dark' ? 'invert(1)' : 'none',
            opacity: 0.78,
          },
          'input[type="date"]': {
            colorScheme: mode,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-card)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 'var(--radius-control)',
            transition: 'background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease, transform 120ms ease',
            '&:active': {
              transform: 'translateY(1px)',
            },
          },
          containedPrimary: {
            boxShadow: '0 8px 18px rgba(99, 102, 241, 0.22)',
            '&:hover': {
              boxShadow: '0 12px 24px rgba(99, 102, 241, 0.28)',
            },
          },
          outlined: {
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
            '&:hover': {
              borderColor: 'var(--color-primary)',
              backgroundColor: 'rgba(99, 102, 241, 0.08)',
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottomColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
            paddingTop: 14,
            paddingBottom: 14,
          },
          head: {
            color: 'var(--color-text-muted)',
            fontSize: '0.76rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: 'background-color 140ms ease',
            '&:hover': {
              backgroundColor: 'var(--color-row-hover)',
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            color: 'var(--color-text-primary)',
            borderRadius: 'var(--radius-control)',
            transition: 'border-color 160ms ease, box-shadow 160ms ease',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--color-border)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--color-border-strong)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--color-primary)',
              borderWidth: 1,
            },
            '&.Mui-focused': {
              boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.16)',
            },
            '&.Mui-disabled': {
              color: 'var(--color-text-disabled)',
            },
          },
          input: {
            '&::placeholder': {
              color: 'var(--color-text-muted)',
              opacity: 1,
            },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: 'var(--color-text-muted)',
            '&.Mui-focused': {
              color: 'var(--color-primary-hover)',
            },
            '&.Mui-error': {
              color: 'var(--color-error)',
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-card)',
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            transition: 'background-color 160ms ease, color 160ms ease, transform 120ms ease',
            '&:hover': {
              backgroundColor: 'var(--color-surface-subtle)',
            },
            '&:active': {
              transform: 'scale(0.96)',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 700,
            borderRadius: 8,
          },
        },
      },
    },
  });
};
