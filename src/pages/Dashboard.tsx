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
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  AccountBalance as TaxIcon,
  AccountTree as DepartmentIcon,
  Assessment as ReportsIcon,
  CalendarMonth as CalendarIcon,
  EventBusy as LeaveIcon,
  EventNote as NonPayableIcon,
  Groups as TotalEmployeesIcon,
  People as ActiveEmployeesIcon,
  LocalAtm as AdvancesIcon,
  Paid as PayrollIcon,
  Shield as PfIcon,
  PersonAdd as NewJoinerIcon,
  PlaylistAddCheck as ApprovalIcon,
  ReceiptLong as PayslipIcon,
  Savings as SalaryIcon,
  TrendingUp as TrendIcon,
  Receipt as ExpensesIcon,
  PendingActions as PendingPayrollIcon,
  HelpOutline as HelpOutlineIcon,
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
  tooltip?: (data: DashboardData) => string;
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
  boxShadow: 'var(--shadow-card)',
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
      { key: 'totalEmployees', label: 'Total Employees', icon: <TotalEmployeesIcon />, color: 'var(--color-info)' },
      { key: 'activeEmployees', label: 'Active Employees', icon: <ActiveEmployeesIcon />, color: 'var(--color-success)' },
      { key: 'newJoineesThisMonth', label: isSuperAdmin ? 'New Joinees This Month' : 'New Joinees', icon: <NewJoinerIcon />, color: 'var(--color-accent)' },
    ] : []),
    ...(isSuperAdmin || isFinance ? [
      { 
        key: isSuperAdmin ? 'totalPayrollThisMonth' : 'currentMonthPayroll', 
        label: isSuperAdmin ? 'Total Payroll This Month' : 'Current Month Payroll', 
        icon: <PayrollIcon />, 
        color: 'var(--color-success)', 
        format: 'currency' as const,
        tooltip: (d: DashboardData) => `Breakdown: Net Salary Disbursed (${formatCurrency(d.stats.currentMonthPayroll || 0)}) + Tax Deducted (${formatCurrency(d.stats.taxDeductions || 0)}) + PF Deducted (${formatCurrency(d.stats.pfContributions || 0)})`
      },
      { 
        key: 'totalExpensesThisMonth', 
        label: 'Total Expenses This Month', 
        icon: <ExpensesIcon />, 
        color: 'var(--color-error)', 
        format: 'currency' as const,
        tooltip: (d: DashboardData) => {
          const breakdown = d.charts.expensesCategoryDistribution || [];
          if (breakdown.length === 0) return 'Total company expenses recorded this month.';
          return 'Breakdown: ' + breakdown.map((b: any) => `${b.category.toUpperCase()}: ${formatCurrency(b.amount)}`).join(' | ');
        }
      },
      { key: 'pendingPayrollProcessing', label: 'Pending Payroll Processing', icon: <PendingPayrollIcon />, color: 'var(--color-warning)' },
      { 
        key: 'totalAdvancesOutstanding', 
        label: 'Advances Outstanding', 
        icon: <AdvancesIcon />, 
        color: 'var(--color-warning)', 
        format: 'currency' as const,
        tooltip: () => 'Outstanding principal amount to be recovered from all active employee advances.'
      },
      { 
        key: 'taxDeductions', 
        label: 'Tax Deductions', 
        icon: <TaxIcon />, 
        color: 'var(--color-warning)', 
        format: 'currency' as const,
        tooltip: (d: DashboardData) => `Total professional/income tax deducted from payrolls this month (${formatCurrency(d.stats.taxDeductions || 0)}).`
      },
      { 
        key: 'pfContributions', 
        label: 'PF/ESI Contributions', 
        icon: <PfIcon />, 
        color: 'var(--color-accent)', 
        format: 'currency' as const,
        tooltip: (d: DashboardData) => `Total provident fund (PF) contribution deducted from employee salaries (${formatCurrency(d.stats.pfContributions || 0)}).`
      },
    ] : []),
  ];

  const actions: ActionConfig[] = [
    ...(isSuperAdmin ? [
      { label: 'Employees', icon: <ActiveEmployeesIcon />, permission: Permission.VIEW_EMPLOYEE, path: '/employees' },
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
    <Box sx={{ pb: 4 }}>
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
            sx={{ color: 'var(--color-text-primary)', fontWeight: 500 }}
          />
        )}
      </Box>

      {/* KPI Grid */}
      {isSuperAdmin ? (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(5, 1fr)',
              },
              gap: 3,
              mb: 3,
            }}
          >
            {[kpis[0], kpis[1], kpis[2], kpis[5], kpis[6]].filter(Boolean).map((kpi) => (
              <KpiCard
                key={kpi.key}
                label={kpi.label}
                value={formatValue(data.stats[kpi.key], kpi.format)}
                icon={kpi.icon}
                color={kpi.color}
                tooltip={kpi.tooltip?.(data)}
              />
            ))}
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(4, 1fr)',
              },
              gap: 3,
              mb: 4,
            }}
          >
            {[kpis[3], kpis[4], kpis[7], kpis[8]].filter(Boolean).map((kpi) => (
              <KpiCard
                key={kpi.key}
                label={kpi.label}
                value={formatValue(data.stats[kpi.key], kpi.format)}
                icon={kpi.icon}
                color={kpi.color}
                tooltip={kpi.tooltip?.(data)}
              />
            ))}
          </Box>
        </>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
            },
            gap: 3,
            mb: 4,
          }}
        >
          {kpis.filter(Boolean).map((kpi) => (
            <KpiCard
              key={kpi.key}
              label={kpi.label}
              value={formatValue(data.stats[kpi.key], kpi.format)}
              icon={kpi.icon}
              color={kpi.color}
              tooltip={kpi.tooltip?.(data)}
            />
          ))}
        </Box>
      )}

      {/* Charts and Summaries Grid */}
      <Grid container spacing={3.5}>
        {/* Row 1: Department Distribution + Payroll Cost Trend */}
        {(isSuperAdmin || isHr) && (
          <Grid item xs={12} lg={isSuperAdmin ? 4 : 12}>
            <ChartPanel title="Department Distribution" empty={!departmentDistribution.length}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={departmentDistribution} dataKey="count" nameKey="department" outerRadius={80} innerRadius={50} paddingAngle={3}>
                    {departmentDistribution.map((_, index) => (
                      <Cell key={index} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    contentStyle={{
                      // backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '12px',
                      color: '#ffffff',
                      fontFamily: 'Outfit',
                      backdropFilter: 'blur(8px)'
                    }}
                    formatter={(value) => [formatNumber(value as number), 'Employees']}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={72}
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{
                      fontSize: '11px',
                      fontFamily: 'Outfit',
                      color: 'var(--color-text-secondary)',
                      paddingTop: '8px',
                      lineHeight: '1.4',
                      overflowY: 'auto'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartPanel>
          </Grid>
        )}

        {(isSuperAdmin || isFinance) && (
          <>
            <Grid item xs={12} lg={isSuperAdmin ? 8 : 12}>
              <ChartPanel title="Payroll Cost Trend" empty={!payrollTrends.length}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={payrollTrends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="payrollTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" vertical={false} opacity={0.5} />
                    <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={11} tickLine={false} />
                    <YAxis stroke="var(--color-text-secondary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value as number)} />
                    <ChartTooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '12px',
                        color: '#ffffff',
                        fontFamily: 'Outfit',
                        backdropFilter: 'blur(8px)'
                      }}
                      formatter={(value) => formatCurrency(value as number)}
                    />
                    <Area type="monotone" dataKey="payrollCost" name="Payroll Cost" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#payrollTrend)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartPanel>
            </Grid>

            {/* Row 2: Tax/PF/ESI Summary + Company Expenses Trend */}
            <Grid item xs={12} lg={isSuperAdmin ? 4 : 5}>
              <ChartPanel title="Tax/PF/ESI Summary" empty={!payrollTrends.length}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={payrollTrends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" vertical={false} opacity={0.5} />
                    <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={11} tickLine={false} />
                    <YAxis stroke="var(--color-text-secondary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value as number)} />
                    <ChartTooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '12px',
                        color: '#ffffff',
                        fontFamily: 'Outfit',
                        backdropFilter: 'blur(8px)'
                      }}
                      formatter={(value) => formatCurrency(value as number)}
                    />
                    <Legend iconType="circle" />
                    <Line type="monotone" dataKey="pf" name="PF" stroke="var(--color-accent)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="tax" name="Tax" stroke="var(--color-warning)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartPanel>
            </Grid>

            <Grid item xs={12} lg={isSuperAdmin ? 8 : 7}>
              <ChartPanel title="Company Expenses Trend" empty={!expensesTrends.length}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={expensesTrends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="expensesTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-error)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--color-error)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" vertical={false} opacity={0.5} />
                    <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={11} tickLine={false} />
                    <YAxis stroke="var(--color-text-secondary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value as number)} />
                    <ChartTooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '12px',
                        color: '#ffffff',
                        fontFamily: 'Outfit',
                        backdropFilter: 'blur(8px)'
                      }}
                      formatter={(value) => formatCurrency(value as number)}
                    />
                    <Area type="monotone" dataKey="amount" name="Expense Amount" stroke="var(--color-error)" strokeWidth={3} fillOpacity={1} fill="url(#expensesTrend)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartPanel>
            </Grid>

            {/* Row 3: Expenses by Category + Salary Processing */}
            <Grid item xs={12} lg={isSuperAdmin ? 4 : 5}>
              <ChartPanel title="Expenses by Category" empty={!expensesCategoryDistribution.length}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expensesCategoryDistribution} dataKey="amount" nameKey="category" outerRadius={80} innerRadius={50} paddingAngle={3}>
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
                    <ChartTooltip
                      contentStyle={{
                        // backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '12px',
                        color: '#ffffff',
                        fontFamily: 'Outfit',
                        backdropFilter: 'blur(8px)'
                      }}
                      formatter={(value, name) => [formatCurrency(value as number), String(name).charAt(0).toUpperCase() + String(name).slice(1)]}
                    />
                    <Legend
                      formatter={(value) => String(value).charAt(0).toUpperCase() + String(value).slice(1)}
                      verticalAlign="bottom"
                      height={48}
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{
                        fontSize: '11px',
                        fontFamily: 'Outfit',
                        color: 'var(--color-text-secondary)',
                        paddingTop: '8px',
                        lineHeight: '1.4'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartPanel>
            </Grid>

            <Grid item xs={12} lg={isSuperAdmin ? 8 : 7}>
              <SummaryPanel
                title="Salary Processing & Deductions Summary"
                rows={[
                  ['Next Processing Date', data.summaries.salaryProcessing?.nextProcessingDate || '-'],
                  ['Processed Records', formatNumber(data.summaries.salaryProcessing?.processedCount)],
                  ['Pending Records', formatNumber(data.summaries.salaryProcessing?.pendingCount)],
                  ['Income Tax Deducted', formatCurrency(data.summaries.taxPfEsi?.tax || 0)],
                  ['Total PF Deductions', formatCurrency(data.summaries.taxPfEsi?.pf || 0)],
                  ['Total ESI Deductions', formatCurrency(data.summaries.taxPfEsi?.esi || 0)],
                ]}
              />
            </Grid>
          </>
        )}

        {/* Row 4: Recent Activities + Quick Actions */}
        <Grid item xs={12} lg={8}>
          <ActivityPanel activities={data.activities} />
        </Grid>

        <Grid item xs={12} lg={4}>
          <QuickActions actions={actions} onNavigate={navigate} />
        </Grid>
      </Grid>
    </Box>
  );
};

const KpiCard: React.FC<{ label: string; value: string; icon: React.ReactNode; color: string; tooltip?: string }> = ({ label, value, icon, color, tooltip }) => (
  <Paper
    sx={{
      ...cardSx,
      p: 3,
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      cursor: 'default',
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderLeft: `4px solid ${color}`,
      borderRadius: '16px',
      boxShadow: 'var(--shadow-card)',
      transition: 'border-color 200ms ease, border-left-width 200ms ease, box-shadow 200ms ease, transform 200ms ease',
      '&:hover': {
        borderColor: 'var(--color-border-strong)',
        borderLeftWidth: '6px',
        boxShadow: 'var(--shadow-card-hover)',
        transform: 'translateY(-3px)',
        '& .icon-wrapper': {
          transform: 'scale(1.1) rotate(5deg)',
          backgroundColor: color,
          color: '#ffffff',
        }
      },
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: '0.88rem' }}>
          {label}
        </Typography>
        {tooltip && (
          <Tooltip title={tooltip} arrow>
            <IconButton size="small" sx={{ p: 0.1, ml: 0.5, color: 'var(--color-text-secondary)', '& svg': { fontSize: '0.875rem' } }}>
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <Box
        className="icon-wrapper"
        sx={{
          color: color,
          backgroundColor: `${color}15`,
          p: 1.2,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 200ms ease, background-color 200ms ease, color 200ms ease',
          '& svg': { fontSize: '1.4rem' }
        }}
      >
        {icon}
      </Box>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <Typography variant="h4" sx={{ color: 'var(--color-text-primary)', fontWeight: 700, fontFamily: 'Outfit', letterSpacing: '-0.5px' }}>
        {value}
      </Typography>
    </Box>
  </Paper>
);

const ChartPanel: React.FC<{ title: string; empty: boolean; children: React.ReactNode }> = ({ title, empty, children }) => (
  <Paper
    sx={{
      ...cardSx,
      p: 3.5,
      height: 400,
      borderRadius: '16px',
      boxShadow: 'var(--shadow-card)',
      transition: 'border-color 200ms ease, box-shadow 200ms ease',
      '&:hover': {
        boxShadow: 'var(--shadow-card-hover)',
        borderColor: 'rgba(99, 102, 241, 0.25)',
      }
    }}
  >
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Typography variant="h6" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)' }}>
        {title}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: 'var(--color-success)',
            animation: 'pulse 2s infinite',
            '@keyframes pulse': {
              '0%': { boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.4)' },
              '70%': { boxShadow: '0 0 0 6px rgba(16, 185, 129, 0)' },
              '100%': { boxShadow: '0 0 0 0 rgba(16, 185, 129, 0)' }
            }
          }}
        />
        <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>Live Data</Typography>
      </Box>
    </Box>
    <Box sx={{ height: 310 }}>
      {empty ? (
        <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
          No records found
        </Box>
      ) : children}
    </Box>
  </Paper>
);

const SummaryPanel: React.FC<{ title: string; rows: [string, string][] }> = ({ title, rows }) => (
  <Paper
    sx={{
      ...cardSx,
      p: 3.5,
      height: '100%',
      borderRadius: '16px',
      boxShadow: 'var(--shadow-card)',
      transition: 'border-color 200ms ease, box-shadow 200ms ease',
      '&:hover': {
        boxShadow: 'var(--shadow-card-hover)',
        borderColor: 'rgba(99, 102, 241, 0.25)',
      }
    }}
  >
    <Typography variant="h6" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)', mb: 3 }}>
      {title}
    </Typography>
    <Grid container spacing={2}>
      {rows.map(([label, value]) => (
        <Grid item xs={12} sm={6} key={label}>
          <Box
            sx={{
              p: 2.2,
              borderRadius: '12px',
              bgcolor: 'var(--color-surface-subtle)',
              border: '1px solid var(--color-border)',
              transition: 'border-color 160ms ease, background-color 160ms ease',
              '&:hover': {
                borderColor: 'var(--color-border-strong)',
                bgcolor: 'var(--color-row-hover)',
              }
            }}
          >
            <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {label}
            </Typography>
            <Typography variant="h6" sx={{ color: 'var(--color-text-primary)', fontWeight: 700, mt: 0.5, fontFamily: 'Outfit' }}>
              {value}
            </Typography>
          </Box>
        </Grid>
      ))}
    </Grid>
  </Paper>
);

const ActivityPanel: React.FC<{ activities: DashboardData['activities'] }> = ({ activities }) => (
  <Paper
    sx={{
      ...cardSx,
      p: 3.5,
      height: '100%',
      borderRadius: '16px',
      boxShadow: 'var(--shadow-card)',
      transition: 'border-color 200ms ease, box-shadow 200ms ease',
      '&:hover': {
        boxShadow: 'var(--shadow-card-hover)',
        borderColor: 'rgba(99, 102, 241, 0.25)',
      }
    }}
  >
    <Typography variant="h6" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)', mb: 3 }}>
      Recent Activities
    </Typography>
    {activities.length === 0 ? (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
        No recent activities
      </Box>
    ) : (
      <Box sx={{ position: 'relative', pl: 3, '&::before': { content: '""', position: 'absolute', left: 7, top: 8, bottom: 8, width: '2px', bgcolor: 'var(--color-border)' } }}>
        {activities.map((activity, index) => (
          <Box key={`${activity.title}-${index}`} sx={{ position: 'relative', mb: index === activities.length - 1 ? 0 : 3 }}>
            {/* Timeline bullet */}
            <Box
              sx={{
                position: 'absolute',
                left: -29,
                top: 4,
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: 'var(--color-surface)',
                border: '3px solid var(--color-primary)',
                zIndex: 2,
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
              <Typography variant="body2" sx={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>
                {activity.title}
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                {activity.date}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mt: 0.5, fontSize: '0.85rem' }}>
              {activity.description}
            </Typography>
          </Box>
        ))}
      </Box>
    )}
  </Paper>
);

const QuickActions: React.FC<{ actions: ActionConfig[]; onNavigate: (path: string) => void }> = ({ actions, onNavigate }) => (
  <Paper
    sx={{
      ...cardSx,
      p: 3.5,
      height: '100%',
      borderRadius: '16px',
      boxShadow: 'var(--shadow-card)',
      transition: 'border-color 200ms ease, box-shadow 200ms ease',
      '&:hover': {
        boxShadow: 'var(--shadow-card-hover)',
        borderColor: 'rgba(99, 102, 241, 0.25)',
      }
    }}
  >
    <Typography variant="h6" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)', mb: 3 }}>
      Quick Actions
    </Typography>
    <Grid container spacing={2}>
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
              borderRadius: '12px',
              py: 1.5,
              px: 2.5,
              textTransform: 'none',
              fontFamily: 'Outfit',
              fontWeight: 600,
              fontSize: '0.92rem',
              transition: 'all 200ms ease',
              '&:hover': {
                borderColor: 'var(--color-primary)',
                bgcolor: 'rgba(99, 102, 241, 0.06)',
                color: 'var(--color-primary-hover)',
                transform: 'translateX(3px)',
              },
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
