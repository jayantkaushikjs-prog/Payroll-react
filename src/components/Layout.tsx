import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role, Permission } from '../constants/permissions';
import { useThemeMode } from '../App';
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
} from '@mui/icons-material';

const THPMSLogo: React.FC<{ size?: number; color?: string }> = ({ size = 32, color = 'var(--color-text-primary)' }) => (
  <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Left vertical block */}
    <rect x="40" y="30" width="50" height="140" fill={color} rx="4" />
    {/* Right vertical block */}
    <rect x="110" y="30" width="50" height="140" fill={color} rx="4" />
    {/* Center blue diamond rotated by 45 degrees */}
    <rect x="85" y="85" width="30" height="30" fill="#0ea5e9" transform="rotate(45 100 100)" />
  </svg>
);

const drawerWidth = 260;

const Layout: React.FC = () => {
  const { user, logout, hasPermission, hasAnyPermission } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

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
      text: 'User Management',
      icon: <AdminIcon />,
      path: '/users',
      permissions: [Permission.MANAGE_USERS],
    },
    {
      text: 'Employees',
      icon: <PeopleIcon />,
      path: '/employees',
      permissions: [Permission.CREATE_EMPLOYEE, Permission.VIEW_EMPLOYEE],
      requireAny: true,
    },
    {
      text: 'Salary Structures',
      icon: <WalletIcon />,
      path: '/salaries',
      permissions: [Permission.MANAGE_SALARY_STRUCTURES],
    },
    {
      text: 'Non Payable Days',
      icon: <AbsentIcon />,
      path: '/non-payable-days',
      permissions: [Permission.MANAGE_NON_PAYABLE_DAYS],
    },
    {
      text: 'PF Settings',
      icon: <PFIcon />,
      path: '/pf',
      permissions: [Permission.MANAGE_PF_SETTINGS],
    },
    {
      text: 'Tax Slabs',
      icon: <TaxIcon />,
      path: '/tax',
      permissions: [Permission.MANAGE_TAX_SLABS],
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
                  navigate(item.path);
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
                  {item.icon}
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

          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
              <IconButton onClick={toggleTheme} sx={{ color: 'var(--color-text-secondary)' }}>
                {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
              </IconButton>
            </Tooltip>

            {user && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Tooltip title={user.email}>
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
                </Tooltip>
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
    </Box>
  );
};

export default Layout;
