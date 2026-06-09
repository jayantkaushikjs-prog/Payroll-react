import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Box, CircularProgress, Typography } from '@mui/material';
import { Role, Permission } from '../constants/permissions';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
  requiredPermission?: Permission;
  requiredPermissions?: Permission[];
  requireAll?: boolean; // If true, requires ALL permissions; if false, requires ANY
}

const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({
  children,
  allowedRoles,
  requiredPermission,
  requiredPermissions,
  requireAll = true,
}) => {
  const { user, loading, hasRole, hasPermission, hasAllPermissions, hasAnyPermission } =
    useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: 'var(--color-bg)',
        }}
      >
        <CircularProgress size={50} sx={{ color: 'var(--color-primary)' }} />
        <Typography sx={{ mt: 2, color: 'var(--color-text-secondary)' }}>Verifying credentials...</Typography>
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  if (allowedRoles && !hasRole(allowedRoles)) {
    return <AccessDeniedPage />;
  }

  // Check single permission
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <AccessDeniedPage />;
  }

  // Check multiple permissions
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasAccess = requireAll
      ? hasAllPermissions(requiredPermissions)
      : hasAnyPermission(requiredPermissions);

    if (!hasAccess) {
      return <AccessDeniedPage />;
    }
  }

  return <>{children}</>;
};

const AccessDeniedPage: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '80vh',
      color: 'var(--color-error)',
    }}
  >
    <Typography variant="h4" fontWeight="bold" gutterBottom>
      403 - Access Denied
    </Typography>
    <Typography sx={{ color: 'var(--color-text-secondary)' }}>
      You do not have permission to view this page.
    </Typography>
  </Box>
);

export default RoleProtectedRoute;
