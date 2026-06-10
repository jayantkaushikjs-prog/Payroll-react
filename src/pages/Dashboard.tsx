import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { formatCurrency } from '../constants/currency';
import { Permission, Role, useAuth } from '../context/AuthContext';
import {
  Box,
  Button,
  CircularProgress,
  Grid,
  Paper,
  Typography,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  AccountBalance as TaxIcon,
  AccountTree as DepartmentIcon,
  Assessment as ReportsIcon,
  CalendarMonth as CalendarIcon,
  EventBusy as LeaveIcon,
  EventNote as NonPayableIcon,
  Groups as PeopleIcon,
  LocalAtm as AdvancesIcon,
  Paid as PayrollIcon,
  Percent as PfIcon,
  PersonAdd as NewJoinerIcon,
  PlaylistAddCheck as ApprovalIcon,
  ReceiptLong as PayslipIcon,
  Savings as SalaryIcon,
  TrendingUp as TrendIcon,
  Receipt as ExpensesIcon,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface DashboardData {
  role: Role;
  stats: Record<string, number>;
  summaries: {
    attendance?: { presentToday: number; absentToday: number; onLeaveToday: number; configured: boolean };
    nonPayableDays?: { employeesAffected: number; totalDays: number };
    taxPfEsi?: { tax: number; pf: number; esi: number; esiConfigured: boolean };
    salaryProcessing?: { nextProcessingDate: string; processedCount: number; pendingCount: number };
    upcomingMilestones?: { birthdays: unknown[]; workAnniversaries: unknown[]; configured: boolean };
  };
  charts: {
    departmentDistribution?: { department: string; count: number }[];
    payrollTrends?: { name: string; payrollCost: number; pf: number; tax: number }[];
    expensesTrend?: { name: string; amount: number }[];
    expensesCategoryDistribution?: { category: string; amount: number }[];
  };
  activities: { title: string; description: string; date: string }[];
  notices: string[];
}

interface KpiConfig {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  format?: 'currency' | 'number';
}

interface ActionConfig {
  label: string;
  icon: React.ReactNode;
  permission: Permission;
  path?: string;
}

const cardSx = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-card)',
  boxShadow: 'none',
  transition: 'border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
};

const chartColors = ['var(--color-info)', 'var(--color-success)', 'var(--color-warning)', 'var(--color-error)', 'var(--color-accent)', 'var(--color-secondary)'];

const formatNumber = (value?: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(value || 0));

const formatValue = (value?: number, format: KpiConfig['format'] = 'number') =>
  format === 'currency' ? formatCurrency(value || 0) : formatNumber(value);

const roleTitle = (role?: Role) => {
  if (role === Role.HR) return 'HR Dashboard';
  if (role === Role.FINANCE) return 'Finance Dashboard';
  return 'Super Admin Dashboard';
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();

  const [excludeSalaries, setExcludeSalaries] = useState(false);

  const { data, isLoading, error } = useQuery<DashboardData>(['dashboardData', user?.role, excludeSalaries], async () => {
    const res = await api.get(`/reports/dashboard?excludeSalaries=${excludeSalaries}`);
    return res.data;
  }, { enabled: !!user });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress sx={{ color: 'var(--color-primary)' }} />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Paper sx={{ ...cardSx, p: 3, bgcolor: 'rgba(244, 63, 94, 0.1)', color: 'var(--color-error)' }}>
        <Typography variant="h6">Failed to load dashboard data</Typography>
      </Paper>
    );
  }

  const isSuperAdmin = user?.role === Role.SUPER_ADMIN;
  const isHr = user?.role === Role.HR;
  const isFinance = user?.role === Role.FINANCE;

  const kpis: KpiConfig[] = [
    ...(isSuperAdmin || isHr ? [
      { key: 'totalEmployees', label: 'Total Employees', icon: <PeopleIcon />, color: 'var(--color-info)' },
      { key: 'activeEmployees', label: 'Active Employees', icon: <PeopleIcon />, color: 'var(--color-success)' },
      { key: 'newJoineesThisMonth', label: isSuperAdmin ? 'New Joinees This Month' : 'New Joinees', icon: <NewJoinerIcon />, color: 'var(--color-accent)' },
    ] : []),
    ...(isSuperAdmin || isFinance ? [
      { key: isSuperAdmin ? 'totalPayrollThisMonth' : 'currentMonthPayroll', label: isSuperAdmin ? 'Total Payroll This Month' : 'Current Month Payroll', icon: <PayrollIcon />, color: 'var(--color-success)', format: 'currency' as const },
      { key: 'totalExpensesThisMonth', label: 'Total Expenses This Month', icon: <ExpensesIcon />, color: 'var(--color-error)', format: 'currency' as const },
      { key: 'pendingPayrollProcessing', label: 'Pending Payroll Processing', icon: <CalendarIcon />, color: 'var(--color-warning)' },
      { key: 'totalAdvancesOutstanding', label: 'Advances Outstanding', icon: <AdvancesIcon />, color: 'var(--color-warning)', format: 'currency' as const },
      { key: 'taxDeductions', label: 'Tax Deductions', icon: <TaxIcon />, color: 'var(--color-warning)', format: 'currency' as const },
      { key: 'pfContributions', label: 'PF/ESI Contributions', icon: <PfIcon />, color: 'var(--color-accent)', format: 'currency' as const },
    ] : []),
  ];

  const actions: ActionConfig[] = [
    ...(isSuperAdmin ? [
      { label: 'Employees', icon: <PeopleIcon />, permission: Permission.VIEW_EMPLOYEE, path: '/employees' },
      { label: 'Salary Structures', icon: <SalaryIcon />, permission: Permission.MANAGE_SALARY_STRUCTURES, path: '/salaries' },
      { label: 'Non-Payable Days', icon: <NonPayableIcon />, permission: Permission.MANAGE_NON_PAYABLE_DAYS, path: '/non-payable-days' },
      { label: 'PF Settings', icon: <PfIcon />, permission: Permission.MANAGE_PF_SETTINGS, path: '/pf' },
      { label: 'Tax Slabs', icon: <TaxIcon />, permission: Permission.MANAGE_TAX_SLABS, path: '/tax' },
      { label: 'Payroll', icon: <PayrollIcon />, permission: Permission.VIEW_PAYROLL, path: '/payroll' },
      { label: 'Advances', icon: <AdvancesIcon />, permission: Permission.VIEW_ADVANCES, path: '/advances' },
      { label: 'Company Expenses', icon: <ExpensesIcon />, permission: Permission.VIEW_EXPENSES, path: '/expenses' },
      { label: 'Reports', icon: <ReportsIcon />, permission: Permission.VIEW_HR_REPORTS, path: '/reports' },
    ] : []),
    ...(isHr ? [
      { label: 'Add Employee', icon: <NewJoinerIcon />, permission: Permission.CREATE_EMPLOYEE, path: '/employees' },
      { label: 'Download HR Reports', icon: <ReportsIcon />, permission: Permission.VIEW_HR_REPORTS, path: '/reports' },
    ] : []),
    ...(isFinance ? [
      { label: 'Process Payroll', icon: <PayrollIcon />, permission: Permission.GENERATE_PAYROLL, path: '/payroll' },
      { label: 'Manage Advances', icon: <AdvancesIcon />, permission: Permission.MANAGE_ADVANCES, path: '/advances' },
      { label: 'Manage Expenses', icon: <ExpensesIcon />, permission: Permission.MANAGE_EXPENSES, path: '/expenses' },
      { label: 'Generate Payslips', icon: <PayslipIcon />, permission: Permission.VIEW_PAYROLL, path: '/reports' },
      { label: 'Download Finance Reports', icon: <ReportsIcon />, permission: Permission.VIEW_PAYROLL_REPORTS, path: '/reports' },
    ] : []),
  ].filter((action) => hasPermission(action.permission));

  const payrollTrends = data.charts.payrollTrends || [];
  const departmentDistribution = data.charts.departmentDistribution || [];
  const expensesTrends = data.charts.expensesTrend || [];
  const expensesCategoryDistribution = data.charts.expensesCategoryDistribution || [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)' }}>
            {roleTitle(user?.role)}
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mt: 0.5 }}>
            Welcome back! Here is your business overview.
          </Typography>
        </Box>
        {(isSuperAdmin || isFinance) && (
          <FormControlLabel
            control={
              <Switch
                checked={!excludeSalaries}
                onChange={(e) => setExcludeSalaries(!e.target.checked)}
                color="primary"
              />
            }
            label="Include Salary Expenses"
            sx={{ color: 'var(--color-text-primary)' }}
          />
        )}
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {kpis.map((kpi) => (
          <Grid item xs={12} sm={6} md={isSuperAdmin ? 3 : 4} key={kpi.key}>
            <KpiCard
              label={kpi.label}
              value={formatValue(data.stats[kpi.key], kpi.format)}
              icon={kpi.icon}
              color={kpi.color}
            />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {(isSuperAdmin || isHr) && (
          <>
            <Grid item xs={12} lg={12}>
              <ChartPanel title="Department Distribution" empty={!departmentDistribution.length}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={departmentDistribution} dataKey="count" nameKey="department" outerRadius={105} innerRadius={58} paddingAngle={2}>
                      {departmentDistribution.map((_, index) => (
                        <Cell key={index} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip formatter={(value) => formatNumber(value as number)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartPanel>
            </Grid>
          </>
        )}

        {(isSuperAdmin || isFinance) && (
          <>
            <Grid item xs={12} lg={7}>
              <ChartPanel title="Payroll Cost Trend" empty={!payrollTrends.length}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={payrollTrends} margin={{ top: 10, right: 24, left: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="payrollTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-strong)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={11} tickLine={false} />
                    <YAxis stroke="var(--color-text-secondary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value as number)} />
                    <ChartTooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-control)', color: 'var(--color-text-primary)' }} formatter={(value) => formatCurrency(value as number)} />
                    <Area type="monotone" dataKey="payrollCost" name="Payroll Cost" stroke="var(--color-primary)" strokeWidth={2.5} fillOpacity={1} fill="url(#payrollTrend)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartPanel>
            </Grid>
            <Grid item xs={12} lg={5}>
              <ChartPanel title="Tax/PF/ESI Summary" empty={!payrollTrends.length}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={payrollTrends} margin={{ top: 10, right: 24, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-strong)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={11} tickLine={false} />
                    <YAxis stroke="var(--color-text-secondary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value as number)} />
                    <ChartTooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-control)', color: 'var(--color-text-primary)' }} formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Line type="monotone" dataKey="pf" name="PF" stroke="var(--color-accent)" strokeWidth={2.5} dot={{ strokeWidth: 2 }} />
                    <Line type="monotone" dataKey="tax" name="Tax" stroke="var(--color-warning)" strokeWidth={2.5} dot={{ strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartPanel>
            </Grid>
            <Grid item xs={12} lg={7}>
              <ChartPanel title="Company Expenses Trend" empty={!expensesTrends.length}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={expensesTrends} margin={{ top: 10, right: 24, left: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="expensesTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-error)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--color-error)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-strong)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={11} tickLine={false} />
                    <YAxis stroke="var(--color-text-secondary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value as number)} />
                    <ChartTooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-control)', color: 'var(--color-text-primary)' }} formatter={(value) => formatCurrency(value as number)} />
                    <Area type="monotone" dataKey="amount" name="Expense Amount" stroke="var(--color-error)" strokeWidth={2.5} fillOpacity={1} fill="url(#expensesTrend)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartPanel>
            </Grid>
            <Grid item xs={12} lg={5}>
              <ChartPanel title="Expenses by Category" empty={!expensesCategoryDistribution.length}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expensesCategoryDistribution} dataKey="amount" nameKey="category" outerRadius={105} innerRadius={58} paddingAngle={2}>
                      {expensesCategoryDistribution.map((entry: any, index: number) => {
                        const colors: Record<string, string> = {
                          rent: '#10b981',
                          salary: '#3b82f6',
                          utilities: '#f59e0b',
                          marketing: '#8b5cf6',
                          'one-time': '#ef4444',
                        };
                        return <Cell key={index} fill={colors[entry.category] || chartColors[index % chartColors.length]} />;
                      })}
                    </Pie>
                    <ChartTooltip formatter={(value, name) => [formatCurrency(value as number), String(name).charAt(0).toUpperCase() + String(name).slice(1)]} />
                    <Legend formatter={(value) => String(value).charAt(0).toUpperCase() + String(value).slice(1)} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartPanel>
            </Grid>

            <Grid item xs={12} lg={5}>
              <SummaryPanel
                title="Salary Processing"
                rows={[
                  ['Next Date', data.summaries.salaryProcessing?.nextProcessingDate || '-'],
                  ['Processed Records', formatNumber(data.summaries.salaryProcessing?.processedCount)],
                  ['Pending Records', formatNumber(data.summaries.salaryProcessing?.pendingCount)],
                  ['Tax', formatCurrency(data.summaries.taxPfEsi?.tax || 0)],
                  ['PF', formatCurrency(data.summaries.taxPfEsi?.pf || 0)],
                  ['ESI', formatCurrency(data.summaries.taxPfEsi?.esi || 0)],
                ]}
              />
            </Grid>
          </>
        )}

        <Grid item xs={12} lg={isSuperAdmin ? 7 : 6}>
          <ActivityPanel activities={data.activities} />
        </Grid>

        <Grid item xs={12} lg={isSuperAdmin ? 5 : 6}>
          <QuickActions actions={actions} onNavigate={navigate} />
        </Grid>
      </Grid>
    </Box>
  );
};

const KpiCard: React.FC<{ label: string; value: string; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => (
  <Paper
    sx={{
      ...cardSx,
      p: 2.5,
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
      cursor: 'default',
      '&:hover': {
        borderColor: 'rgba(148, 163, 184, 0.32)',
        boxShadow: 'var(--shadow-card)',
        transform: 'translateY(-2px)',
      },
    }}
  >
    <Box sx={{ position: 'absolute', left: 0, top: 0, width: 4, height: '100%', bgcolor: color }} />
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
      <Box>
        <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)', fontWeight: 700 }}>{label}</Typography>
        <Typography variant="h5" sx={{ color: 'var(--color-text-primary)', fontWeight: 700, mt: 1, fontFamily: 'Outfit' }}>{value}</Typography>
      </Box>
      <Box sx={{ color, display: 'flex', '& svg': { fontSize: '1.8rem' } }}>{icon}</Box>
    </Box>
  </Paper>
);

const ChartPanel: React.FC<{ title: string; empty: boolean; children: React.ReactNode }> = ({ title, empty, children }) => (
  <Paper sx={{ ...cardSx, p: 3, height: 390 }}>
    <Typography variant="h6" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)', mb: 3 }}>{title}</Typography>
    <Box sx={{ height: 310 }}>
      {empty ? (
        <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>No records found</Box>
      ) : children}
    </Box>
  </Paper>
);

const SummaryPanel: React.FC<{ title: string; rows: [string, string][] }> = ({ title, rows }) => (
  <Paper sx={{ ...cardSx, p: 3, height: '100%' }}>
    <Typography variant="h6" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)', mb: 2 }}>{title}</Typography>
    <Grid container spacing={1.5}>
      {rows.map(([label, value]) => (
        <Grid item xs={12} sm={6} key={label}>
          <Box sx={{ p: 2, borderRadius: 'var(--radius-control)', bgcolor: 'var(--color-surface-subtle)', border: '1px solid var(--color-border)' }}>
            <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)', fontWeight: 700 }}>{label}</Typography>
            <Typography variant="body1" sx={{ color: 'var(--color-text-primary)', fontWeight: 700, mt: 0.5 }}>{value}</Typography>
          </Box>
        </Grid>
      ))}
    </Grid>
  </Paper>
);

const ActivityPanel: React.FC<{ activities: DashboardData['activities'] }> = ({ activities }) => (
  <Paper sx={{ ...cardSx, p: 3, height: '100%' }}>
    <Typography variant="h6" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)', mb: 2 }}>Recent Activities</Typography>
    {activities.length === 0 ? (
      <Typography sx={{ color: 'var(--color-text-muted)' }}>No records found</Typography>
    ) : activities.map((activity, index) => (
      <Box key={`${activity.title}-${index}`} sx={{ py: 1.5, borderBottom: index === activities.length - 1 ? 'none' : '1px solid var(--color-border)' }}>
        <Typography variant="body2" sx={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>{activity.title}</Typography>
        <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>{activity.description}</Typography>
      </Box>
    ))}
  </Paper>
);

const QuickActions: React.FC<{ actions: ActionConfig[]; onNavigate: (path: string) => void }> = ({ actions, onNavigate }) => (
  <Paper sx={{ ...cardSx, p: 3, height: '100%' }}>
    <Typography variant="h6" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)', mb: 2 }}>Quick Actions</Typography>
    <Grid container spacing={1.5}>
      {actions.map((action) => (
        <Grid item xs={12} sm={6} key={action.label}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={action.icon}
            disabled={!action.path}
            onClick={() => action.path && onNavigate(action.path)}
            sx={{
              justifyContent: 'flex-start',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
              borderRadius: 'var(--radius-control)',
              py: 1.2,
              transition: 'background-color 160ms ease, border-color 160ms ease, color 160ms ease',
              '&:hover': { borderColor: 'var(--color-primary)', bgcolor: 'rgba(99,102,241,0.08)', color: 'var(--color-text-primary)' },
            }}
          >
            {action.label}
          </Button>
        </Grid>
      ))}
    </Grid>
  </Paper>
);

export default Dashboard;
