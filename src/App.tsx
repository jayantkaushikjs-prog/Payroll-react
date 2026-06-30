import React, { useState, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { AuthProvider, Permission } from './context/AuthContext';
import { REPORT_PERMISSIONS } from './constants/permissions';
import { buildTheme } from './theme';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import Layout from './components/Layout';
import { ToastProvider } from './context/ToastContext';
import { ThemeModeContext } from './context/ThemeModeContext';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import FinancialSummary from './pages/FinancialSummary';
import SalaryStructures from './pages/SalaryStructures';
import NonPayableDays from './pages/NonPayableDays';
import ComplianceSettings from './pages/ComplianceSettings';
import Advances from './pages/Advances';
import Payroll from './pages/Payroll';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Expenses from './pages/Expenses';
import PayrollCalculator from './pages/PayrollCalculator';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

const App: React.FC = () => {
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('themeMode') as 'light' | 'dark') || 'light';
  });

  const toggleTheme = () => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', next);
      return next;
    });
  };

  const themeMode = useMemo(() => ({ mode, toggleTheme }), [mode]);
  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeModeContext.Provider value={themeMode}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ToastProvider>
            <AuthProvider>
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/" element={<RoleProtectedRoute><Layout /></RoleProtectedRoute>}>
                  <Route index element={<Dashboard />} />
                  <Route
                    path="users"
                    element={
                      <RoleProtectedRoute requiredPermission={Permission.MANAGE_USERS}>
                        <Users />
                      </RoleProtectedRoute>
                    }
                  />
                  <Route
                    path="employees"
                    element={
                      <RoleProtectedRoute requiredPermission={Permission.VIEW_EMPLOYEE}>
                        <Employees />
                      </RoleProtectedRoute>
                    }
                  />
                  <Route
                    path="preview-sheet"
                    element={
                      <RoleProtectedRoute requiredPermissions={[Permission.VIEW_EMPLOYEE, Permission.MANAGE_SALARY_STRUCTURES]} requireAll={false}>
                        <Employees previewOnly />
                      </RoleProtectedRoute>
                    }
                  />
                  <Route
                    path="financial-summary"
                    element={
                      <RoleProtectedRoute requiredPermission={Permission.VIEW_EMPLOYEE}>
                        <FinancialSummary />
                      </RoleProtectedRoute>
                    }
                  />
                  <Route
                    path="salaries"
                    element={
                      <RoleProtectedRoute requiredPermission={Permission.MANAGE_SALARY_STRUCTURES}>
                        <SalaryStructures />
                      </RoleProtectedRoute>
                    }
                  />
                  <Route
                    path="non-payable-days"
                    element={
                      <RoleProtectedRoute requiredPermission={Permission.MANAGE_NON_PAYABLE_DAYS}>
                        <NonPayableDays />
                      </RoleProtectedRoute>
                    }
                  />
                  <Route
                    path="compliance"
                    element={
                      <RoleProtectedRoute requiredPermissions={[Permission.MANAGE_PF_SETTINGS, Permission.MANAGE_TAX_SLABS]} requireAll={false}>
                        <ComplianceSettings />
                      </RoleProtectedRoute>
                    }
                  />
                  <Route
                    path="advances"
                    element={
                      <RoleProtectedRoute requiredPermission={Permission.VIEW_ADVANCES}>
                        <Advances />
                      </RoleProtectedRoute>
                    }
                  />
                  <Route
                    path="expenses"
                    element={
                      <RoleProtectedRoute requiredPermission={Permission.VIEW_EXPENSES}>
                        <Expenses />
                      </RoleProtectedRoute>
                    }
                  />
                  <Route
                    path="payroll"
                    element={
                      <RoleProtectedRoute requiredPermission={Permission.VIEW_PAYROLL}>
                        <Payroll />
                      </RoleProtectedRoute>
                    }
                  />
                  <Route
                    path="reports"
                    element={
                      <RoleProtectedRoute requiredPermissions={REPORT_PERMISSIONS} requireAll={false}>
                        <Reports />
                      </RoleProtectedRoute>
                    }
                  />
                  <Route
                    path="calculator"
                    element={<PayrollCalculator />}
                  />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </ThemeModeContext.Provider>
    </QueryClientProvider>
  );
};

export default App;
