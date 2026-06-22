import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role, Permission } from '../constants/permissions';
import { useThemeMode } from '../context/ThemeModeContext';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Chip,
  Tooltip,
  Autocomplete,
  TextField,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  CircularProgress,
  Badge,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  AccountBalanceWallet as WalletIcon,
  EventBusy as AbsentIcon,
  LocalAtm as AdvancesIcon,
  Percent as TaxIcon,
  SettingsApplications as PFIcon,
  ReceiptLong as PayrollIcon,
  Assessment as ReportsIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  ManageAccounts as AdminIcon,
  TrendingUp as TrendIcon,
  Receipt as ExpensesIcon,
  FactCheck as PreviewSheetIcon,
  Search as SearchIcon,
  LockReset as LockResetIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { THPMSLogo } from './brand/THPMSLogo';

const drawerWidth = 260;

const Layout: React.FC = () => {
  const { user, logout, hasPermission, hasAnyPermission } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Profile menu state
  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);
  const profileMenuOpen = Boolean(profileAnchorEl);

  // Reset password dialog state
  const [resetPwdOpen, setResetPwdOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetPwdLoading, setResetPwdLoading] = useState(false);
  const [resetPwdError, setResetPwdError] = useState<string | null>(null);
  const [resetPwdSuccess, setResetPwdSuccess] = useState(false);

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleProfileClose = () => {
    setProfileAnchorEl(null);
  };

  const handleOpenResetPwd = () => {
    handleProfileClose();
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setResetPwdError(null);
    setResetPwdSuccess(false);
    setResetPwdOpen(true);
  };

  const handleResetPwdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setResetPwdError('All fields are required');
      return;
    }
    if (newPassword.length < 6) {
      setResetPwdError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetPwdError('New passwords do not match');
      return;
    }
    setResetPwdLoading(true);
    setResetPwdError(null);
    try {
      await api.patch('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setResetPwdSuccess(true);
      setTimeout(() => {
        setResetPwdOpen(false);
        setResetPwdSuccess(false);
        logout();
      }, 2000);
    } catch (err: any) {
      setResetPwdError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setResetPwdLoading(false);
    }
  };

  const handleLogoutFromMenu = () => {
    handleProfileClose();
    logout();
  };

  const { data: employees = [] } = useQuery(['employees'], async () => {
    const res = await api.get('/employees');
    return res.data.filter((emp: any) => emp.active_status !== false);
  });

  const isHRorAdmin = user && (user.role === Role.SUPER_ADMIN || user.role === Role.HR);
  const isFinance = user && user.role === Role.FINANCE;
  const currentMonthValue = new Date().toISOString().slice(0, 7);

  const { data: previewNotifData } = useQuery(
    ['hrPreviewReview-notif', currentMonthValue],
    async () => {
      const res = await api.get(`/employees/preview-review?month=${currentMonthValue}`);
      return res.data;
    },
    { enabled: Boolean(isHRorAdmin || isFinance), refetchInterval: 30000 }
  );

  const previewSheetHasDot = (() => {
    if (!previewNotifData) return false;
    if (isFinance && previewNotifData.status === 'done' && previewNotifData.hr_marked_done_at) {
      const key = `preview-notif-finance-${previewNotifData.month}-${previewNotifData.hr_marked_done_at}`;
      return !localStorage.getItem(key);
    }
    if (isHRorAdmin && previewNotifData.finance_remarks_updated_at) {
      const key = `preview-notif-hr-${previewNotifData.month}-${previewNotifData.finance_remarks_updated_at}`;
      return !localStorage.getItem(key);
    }
    return false;
  })();

  // Clear dot when visiting preview sheet
  useEffect(() => {
    if (location.pathname !== '/preview-sheet' || !previewNotifData) return;
    if (isFinance && previewNotifData.hr_marked_done_at) {
      localStorage.setItem(`preview-notif-finance-${previewNotifData.month}-${previewNotifData.hr_marked_done_at}`, 'true');
    }
    if (isHRorAdmin && previewNotifData.finance_remarks_updated_at) {
      localStorage.setItem(`preview-notif-hr-${previewNotifData.month}-${previewNotifData.finance_remarks_updated_at}`, 'true');
    }
  }, [location.pathname, previewNotifData, isFinance, isHRorAdmin]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const formatUserLabel = (email: string) =>
    email
      .split('@')[0]
      .replace(/[._-]+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');

  // Menu configuration with permission-based visibility
  const menuItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/',
      permissions: [Permission.VIEW_HR_REPORTS, Permission.VIEW_PAYROLL_REPORTS, Permission.VIEW_FINANCIAL_DASHBOARDS],
      requireAny: true,
    },
    {
      text: 'Employees',
      icon: <PeopleIcon />,
      path: '/employees',
      permissions: [Permission.CREATE_EMPLOYEE, Permission.VIEW_EMPLOYEE],
      requireAny: true,
    },
    {
      text: 'Preview Sheet',
      icon: <PreviewSheetIcon />,
      path: '/preview-sheet',
      permissions: [Permission.VIEW_EMPLOYEE, Permission.MANAGE_SALARY_STRUCTURES],
      requireAny: true,
    },
    {
      text: 'Salary Structures',
      icon: <WalletIcon />,
      path: '/salaries',
      permissions: [Permission.MANAGE_SALARY_STRUCTURES],
    },
    // {
    //   text: 'Non Payable Days',
    //   icon: <AbsentIcon />,
    //   path: '/non-payable-days',
    //   permissions: [Permission.MANAGE_NON_PAYABLE_DAYS],
    // },
    {
      text: 'Compliance Settings',
      icon: <PFIcon />,
      path: '/compliance',
      permissions: [Permission.MANAGE_PF_SETTINGS, Permission.MANAGE_TAX_SLABS],
      requireAny: true,
    },
    {
      text: 'Advances',
      icon: <AdvancesIcon />,
      path: '/advances',
      permissions: [Permission.MANAGE_ADVANCES, Permission.VIEW_ADVANCES],
      requireAny: true,
    },
    {
      text: 'Company Expenses',
      icon: <ExpensesIcon />,
      path: '/expenses',
      permissions: [Permission.MANAGE_EXPENSES, Permission.VIEW_EXPENSES],
      requireAny: true,
    },
    {
      text: 'Payroll Calculation',
      icon: <PayrollIcon />,
      path: '/payroll',
      permissions: [Permission.GENERATE_PAYROLL, Permission.VIEW_PAYROLL],
      requireAny: true,
    },
    {
      text: 'Reports & Export',
      icon: <ReportsIcon />,
      path: '/reports',
      permissions: [Permission.VIEW_PAYROLL_REPORTS, Permission.VIEW_HR_REPORTS, Permission.VIEW_FINANCIAL_DASHBOARDS],
      requireAny: true,
    },

    {
      text: 'User Management',
      icon: <AdminIcon />,
      path: '/users',
      permissions: [Permission.MANAGE_USERS],
    },
  ];

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

  const checkMenuItemAccess = (item: (typeof menuItems)[0]): boolean => {
    if (!user) return false;
    if (!item.permissions) return true;
    if (item.requireAny) {
      return hasAnyPermission(item.permissions);
    }
    return item.permissions.every((perm) => hasPermission(perm));
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-sidebar)' }}>
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <THPMSLogo size={36} color="var(--color-text-primary)" />
        <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '1px' }}>
          TH-PMS
        </Typography>
      </Box>
      <Divider sx={{ borderColor: 'var(--color-border)' }} />
      <List sx={{ px: 1.5, py: 2, flexGrow: 1 }}>
        {menuItems.map((item) => {
          const isSelected = location.pathname === item.path;
          const hasAccess = checkMenuItemAccess(item);

          if (!hasAccess) return null;

          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => {
                  if (item.path === '/employees') {
                    window.dispatchEvent(new CustomEvent('openEmployeeDirectory'));
                    navigate('/employees?tab=directory');
                  } else {
                    navigate(item.path);
                  }
                  setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 'var(--radius-control)',
                  backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.14)' : 'transparent',
                  color: isSelected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  border: isSelected ? '1px solid rgba(99, 102, 241, 0.26)' : '1px solid transparent',
                  position: 'relative',
                  '&:hover': {
                    backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.18)' : 'var(--color-surface-subtle)',
                    color: 'var(--color-text-primary)',
                    '& .MuiListItemIcon-root': {
                      color: isSelected ? 'var(--color-primary-hover)' : 'var(--color-text-primary)',
                    },
                  },
                  '&::before': isSelected ? {
                    content: '""',
                    position: 'absolute',
                    left: -6,
                    top: 10,
                    bottom: 10,
                    width: 3,
                    borderRadius: 999,
                    backgroundColor: 'var(--color-primary)',
                  } : undefined,
                  transition: 'background-color 160ms ease, border-color 160ms ease, color 160ms ease',
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isSelected ? 'var(--color-primary-hover)' : 'var(--color-text-muted)',
                    minWidth: '40px',
                    transition: 'color 160ms ease',
                  }}
                >
                  {item.path === '/preview-sheet' && previewSheetHasDot ? (
                    <Badge variant="dot" color="error">{item.icon}</Badge>
                  ) : item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{ fontSize: '0.92rem', fontWeight: isSelected ? 600 : 500 }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Divider sx={{ borderColor: 'var(--color-border)' }} />
      <Box sx={{ p: 2 }}>
        <List disablePadding>
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => { navigate('/calculator'); setMobileOpen(false); }}
              sx={{
                borderRadius: 'var(--radius-control)',
                backgroundColor: location.pathname === '/calculator' ? 'rgba(99, 102, 241, 0.14)' : 'transparent',
                color: location.pathname === '/calculator' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                border: location.pathname === '/calculator' ? '1px solid rgba(99, 102, 241, 0.26)' : '1px solid transparent',
                position: 'relative',
                '&:hover': {
                  backgroundColor: location.pathname === '/calculator' ? 'rgba(99, 102, 241, 0.18)' : 'var(--color-surface-subtle)',
                  color: 'var(--color-text-primary)',
                  '& .MuiListItemIcon-root': {
                    color: location.pathname === '/calculator' ? 'var(--color-primary-hover)' : 'var(--color-text-primary)',
                  },
                },
                '&::before': location.pathname === '/calculator' ? {
                  content: '""',
                  position: 'absolute',
                  left: -6,
                  top: 10,
                  bottom: 10,
                  width: 3,
                  borderRadius: 999,
                  backgroundColor: 'var(--color-primary)',
                } : undefined,
                transition: 'background-color 160ms ease, border-color 160ms ease, color 160ms ease',
              }}
            >
              <ListItemIcon sx={{ color: location.pathname === '/calculator' ? 'var(--color-primary-hover)' : 'var(--color-text-muted)', minWidth: '40px', transition: 'color 160ms ease' }}>
                <TrendIcon />
              </ListItemIcon>
              <ListItemText primary="Payroll Calculator" primaryTypographyProps={{ fontSize: '0.92rem', fontWeight: location.pathname === '/calculator' ? 600 : 500 }} />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              onClick={logout}
              sx={{
                borderRadius: 'var(--radius-control)',
                color: 'var(--color-error)',
                '&:hover': {
                  backgroundColor: 'rgba(244, 63, 94, 0.08)',
                },
              }}
            >
              <ListItemIcon sx={{ color: 'var(--color-error)', minWidth: '40px' }}>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: '0.92rem', fontWeight: 600 }} />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          boxShadow: 'none',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 3 } }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' }, color: 'var(--color-text-secondary)' }}
          >
            <MenuIcon />
          </IconButton>

          <Autocomplete
            options={employees}
            getOptionLabel={(option: any) => `${option.name} (${option.employee_code})`}
            onChange={(_, value: any) => {
              if (value) {
                navigate(`/employees?openProfile=${value.id}`);
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Global Search (Employees)..."
                size="small"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <SearchIcon sx={{ color: 'var(--color-text-secondary)', mr: 1, fontSize: '1.2rem' }} />
                  ),
                }}
                sx={{
                  width: { xs: 200, sm: 300, md: 350 },
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'var(--color-bg)',
                    borderRadius: '20px',
                    border: '1px solid var(--color-border)',
                    paddingLeft: '12px !important',
                    '& fieldset': { border: 'none' },
                    '&:hover': {
                      border: '1px solid var(--color-primary-hover)',
                    },
                    '&.Mui-focused': {
                      border: '1px solid var(--color-primary)',
                      boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.2)',
                    },
                  },
                  '& .MuiInputBase-input': {
                    color: 'var(--color-text-primary)',
                    fontFamily: 'Outfit',
                    fontSize: '0.88rem',
                  },
                }}
              />
            )}
            sx={{
              ml: { xs: 1, sm: 2 },
            }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
              <IconButton onClick={toggleTheme} sx={{ color: 'var(--color-text-secondary)' }}>
                {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
              </IconButton>
            </Tooltip>

            {user && (
              <>
                <Box
                  onClick={handleProfileClick}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-control)',
                    px: 1.5,
                    py: 0.5,
                    transition: 'background-color 150ms ease',
                    '&:hover': { bgcolor: 'var(--color-surface-subtle)' },
                  }}
                >
                  <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {formatUserLabel(user.email)}
                    </Typography>
                    <Chip
                      label={user.role}
                      size="small"
                      color={getRoleColor(user.role)}
                      sx={{
                        height: '18px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        mt: 0.25,
                      }}
                    />
                  </Box>
                  <Avatar
                    sx={{
                      bgcolor: 'var(--color-primary)',
                      width: 36,
                      height: 36,
                      fontSize: '0.95rem',
                      fontWeight: 600,
                    }}
                  >
                    {user.email.charAt(0).toUpperCase()}
                  </Avatar>
                </Box>

                {/* Profile Dropdown Menu */}
                <Menu
                  anchorEl={profileAnchorEl}
                  open={profileMenuOpen}
                  onClose={handleProfileClose}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  PaperProps={{
                    sx: {
                      bgcolor: 'var(--color-surface)',
                      color: 'var(--color-text-primary)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-card)',
                      minWidth: 200,
                      mt: 1,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    },
                  }}
                >
                  <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid var(--color-border)' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {user.email}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--color-text-muted)' }}>
                      {user.role}
                    </Typography>
                  </Box>
                  <MenuItem onClick={handleOpenResetPwd} sx={{ gap: 1.5, py: 1.5, color: 'var(--color-text-secondary)', '&:hover': { color: 'var(--color-text-primary)', bgcolor: 'var(--color-surface-subtle)' } }}>
                    <LockResetIcon fontSize="small" /> Reset Password
                  </MenuItem>
                  <Divider sx={{ borderColor: 'var(--color-border)' }} />
                  <MenuItem onClick={handleLogoutFromMenu} sx={{ gap: 1.5, py: 1.5, color: 'var(--color-error)', '&:hover': { bgcolor: 'rgba(244, 63, 94, 0.08)' } }}>
                    <LogoutIcon fontSize="small" /> Logout
                  </MenuItem>
                </Menu>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="mailbox folders"
      >
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px solid var(--color-border)' },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px solid var(--color-border)' },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 4 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
          overflowY: 'auto',
        }}
      >
        <Box className="animate-fade-in">
          <Outlet />
        </Box>
      </Box>

      {/* Reset Password Dialog */}
      <Dialog
        open={resetPwdOpen}
        onClose={() => setResetPwdOpen(false)}
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
          Reset Password
        </DialogTitle>
        <form onSubmit={handleResetPwdSubmit}>
          <DialogContent sx={{ py: 3 }}>
            {resetPwdError && (
              <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(244, 63, 94, 0.15)', color: 'var(--color-error)' }}>
                {resetPwdError}
              </Alert>
            )}
            {resetPwdSuccess && (
              <Alert severity="success" sx={{ mb: 3 }}>
                Password changed successfully!
              </Alert>
            )}
            <TextField
              label="Current Password"
              type="password"
              fullWidth
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              sx={{ ...resetPwdInputStyles, mb: 3 }}
            />
            <TextField
              label="New Password"
              type="password"
              fullWidth
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              sx={{ ...resetPwdInputStyles, mb: 3 }}
            />
            <TextField
              label="Confirm New Password"
              type="password"
              fullWidth
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              sx={resetPwdInputStyles}
            />
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <Button onClick={() => setResetPwdOpen(false)} sx={{ color: 'var(--color-text-secondary)', textTransform: 'none' }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={resetPwdLoading || resetPwdSuccess}
              sx={{
                background: 'var(--color-primary)',
                borderRadius: 'var(--radius-control)',
                px: 3,
                textTransform: 'none',
              }}
            >
              {resetPwdLoading ? <CircularProgress size={24} sx={{ color: 'var(--color-text-primary)' }} /> : 'Change Password'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

const resetPwdInputStyles = {
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

export default Layout;
