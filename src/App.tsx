import React, { createContext, useContext, useState, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { AuthProvider, Permission } from './context/AuthContext';
import { REPORT_PERMISSIONS } from './constants/permissions';
import { buildTheme } from './theme';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import SalaryStructures from './pages/SalaryStructures';
import NonPayableDays from './pages/NonPayableDays';
import PFSettings from './pages/PFSettings';
import TaxSlabs from './pages/TaxSlabs';
import Advances from './pages/Advances';
import Payroll from './pages/Payroll';
import Reports from './pages/Reports';

interface ThemeModeContextType {
  mode: 'light' | 'dark';
  toggleTheme: () => void;
}

export const ThemeModeContext = createContext<ThemeModeContextType>({
  mode: 'dark',
  toggleTheme: () => {},
});

export const useThemeMode = () => useContext(ThemeModeContext);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

const App: React.FC = () => {
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('themeMode') as 'light' | 'dark') || 'dark';
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
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/" element={<RoleProtectedRoute><Layout /></RoleProtectedRoute>}>
                  <Route index element={<Dashboard />} />
                  <Route
                    path="employees"
                    element={
                      <RoleProtectedRoute requiredPermission={Permission.VIEW_EMPLOYEE}>
                        <Employees />
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
                    path="pf"
                    element={
                      <RoleProtectedRoute requiredPermission={Permission.MANAGE_PF_SETTINGS}>
                        <PFSettings />
                      </RoleProtectedRoute>
                    }
                  />
                  <Route
                    path="tax"
                    element={
                      <RoleProtectedRoute requiredPermission={Permission.MANAGE_TAX_SLABS}>
                        <TaxSlabs />
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
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ThemeProvider>
      </ThemeModeContext.Provider>
    </QueryClientProvider>
  );
};

export default App;
