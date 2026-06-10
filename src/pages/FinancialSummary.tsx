import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { formatCurrency } from '../constants/currency';
import { useAuth, Permission } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';

interface Employee {
  id: number;
  employee_code: string;
  name: string;
  active_status?: boolean;
}

interface FinancialSummaryData {
  year: number;
  amountPaid: number;
  amountToBePaid: number;
  pfDeducted: number;
  expectedPFRemaining: number;
  taxDeducted: number;
  expectedTaxRemaining: number;
  advanceRecovered: number;
  totalAdvancesTaken: number;
  totalAdvancesRepaid: number;
  remainingAdvanceBalance: number;
}

const cardSx = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-card)',
  boxShadow: 'none',
  transition: 'border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
};

const chartColors = [
  'var(--color-success)',
  'var(--color-primary)',
  'var(--color-accent)',
  'var(--color-warning)',
];

const FinancialSummary: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [selectedEmpId, setSelectedEmpId] = useState<number | ''>('');
  const [financialYear, setFinancialYear] = useState<number>(new Date().getFullYear());

  // Fetch all employees for selection
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery(
    ['employees-summary-list'],
    async () => {
      const res = await api.get('/employees');
      return res.data as Employee[];
    },
    {
      onSuccess: (data) => {
        if (data.length > 0 && !selectedEmpId) {
          setSelectedEmpId(data[0].id);
        }
      },
      onError: (err: any) => {
        showToast(err.response?.data?.message || 'Failed to fetch employees list', 'error');
      },
    }
  );

  // Fetch financial summary for the selected employee
  const { data: summary, isLoading: isLoadingSummary, error } = useQuery<FinancialSummaryData | null>(
    ['financialSummaryPage', selectedEmpId, financialYear],
    async () => {
      if (!selectedEmpId) return null;
      const res = await api.get(`/employees/${selectedEmpId}/financial-summary?year=${financialYear}`);
      return res.data;
    },
    {
      enabled: !!selectedEmpId,
      onError: (err: any) => {
        showToast(err.response?.data?.message || 'Failed to fetch financial summary data', 'error');
      },
    }
  );

  // Prepare chart data
  const barData = summary
    ? [
        {
          name: 'Net Salary',
          Paid: summary.amountPaid,
          Remaining: summary.amountToBePaid,
        },
        {
          name: 'PF Contribution',
          Paid: summary.pfDeducted,
          Remaining: summary.expectedPFRemaining,
        },
        {
          name: 'Income Tax (TDS)',
          Paid: summary.taxDeducted,
          Remaining: summary.expectedTaxRemaining,
        },
      ]
    : [];

  const pieData = summary
    ? [
        { name: 'Net Paid YTD', value: summary.amountPaid },
        { name: 'Est. Net Remaining', value: summary.amountToBePaid },
        { name: 'Provident Fund (Total)', value: summary.pfDeducted + summary.expectedPFRemaining },
        { name: 'Income Tax (Total)', value: summary.taxDeducted + summary.expectedTaxRemaining },
      ].filter((d) => d.value > 0)
    : [];

  const selectedEmployee = employees.find((emp) => emp.id === selectedEmpId);

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)' }}>
            Financial Summary
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mt: 0.5 }}>
            Annual financial overview and analytics of earnings, deductions, and advances.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {isLoadingEmployees ? (
            <CircularProgress size={24} sx={{ color: 'var(--color-primary)' }} />
          ) : (
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel id="emp-select-label" sx={{ color: 'var(--color-text-secondary)' }}>Select Employee</InputLabel>
              <Select
                labelId="emp-select-label"
                value={selectedEmpId}
                label="Select Employee"
                onChange={(e) => setSelectedEmpId(Number(e.target.value))}
                sx={{
                  color: 'var(--color-text-primary)',
                  height: '42px',
                  borderRadius: 'var(--radius-control)',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-border)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-primary)' },
                }}
              >
                {employees.map((emp) => (
                  <MenuItem key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employee_code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControl sx={{ minWidth: 110 }}>
            <InputLabel id="year-select-label" sx={{ color: 'var(--color-text-secondary)' }}>Year</InputLabel>
            <Select
              labelId="year-select-label"
              value={financialYear}
              label="Year"
              onChange={(e) => setFinancialYear(Number(e.target.value))}
              sx={{
                color: 'var(--color-text-primary)',
                height: '42px',
                borderRadius: 'var(--radius-control)',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-border)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-primary)' },
              }}
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                <MenuItem key={y} value={y}>{y}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {isLoadingSummary ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={50} sx={{ color: 'var(--color-primary)' }} />
        </Box>
      ) : !summary ? (
        <Paper sx={{ ...cardSx, p: 4, textAlign: 'center' }}>
          <Typography sx={{ color: 'var(--color-text-secondary)' }}>
            No employee selected or summary data is not available.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3.5}>
          {/* Main KPI Cards */}
          <Grid item xs={12} sm={6}>
            <Paper
              sx={{
                p: 3,
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.02) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 'var(--radius-card)',
                boxShadow: '0 8px 32px 0 rgba(16, 185, 129, 0.08)',
              }}
            >
              <Typography variant="caption" sx={{ color: 'var(--color-success)', fontWeight: 700, letterSpacing: '0.05em' }}>
                TOTAL NET AMOUNT PAID (YTD)
              </Typography>
              <Typography variant="h3" sx={{ color: 'var(--color-success)', fontWeight: 'bold', fontFamily: 'Outfit', mt: 1.5 }}>
                {formatCurrency(summary.amountPaid)}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', color: 'var(--color-text-secondary)', mt: 1 }}>
                Calculated from all disbursed payroll structures for {financialYear}.
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Paper
              sx={{
                p: 3,
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0.02) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: 'var(--radius-card)',
                boxShadow: '0 8px 32px 0 rgba(59, 130, 246, 0.08)',
              }}
            >
              <Typography variant="caption" sx={{ color: 'var(--color-primary-hover)', fontWeight: 700, letterSpacing: '0.05em' }}>
                ESTIMATED NET TO BE PAID (REMAINING)
              </Typography>
              <Typography variant="h3" sx={{ color: 'var(--color-primary-hover)', fontWeight: 'bold', fontFamily: 'Outfit', mt: 1.5 }}>
                {formatCurrency(summary.amountToBePaid)}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', color: 'var(--color-text-secondary)', mt: 1 }}>
                Projected using current salary structure config for active months remaining.
              </Typography>
            </Paper>
          </Grid>

          {/* PF and Tax summaries */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ ...cardSx, p: 3, height: '100%' }}>
              <Typography variant="subtitle2" sx={{ color: 'var(--color-text-primary)', fontWeight: 700, mb: 2.5 }}>
                Provident Fund (PF) Overview
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>PF Deducted (YTD):</Typography>
                <Typography variant="body2" fontWeight="bold" sx={{ color: 'var(--color-text-primary)' }}>
                  {formatCurrency(summary.pfDeducted)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>Estimated PF Remaining:</Typography>
                <Typography variant="body2" fontWeight="bold" sx={{ color: 'var(--color-text-primary)' }}>
                  {formatCurrency(summary.expectedPFRemaining)}
                </Typography>
              </Box>
              <Divider sx={{ my: 1.5, borderColor: 'var(--color-border)' }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>Total PF contribution (Projected):</Typography>
                <Typography variant="body2" fontWeight="bold" sx={{ color: 'var(--color-accent)' }}>
                  {formatCurrency(summary.pfDeducted + summary.expectedPFRemaining)}
                </Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ ...cardSx, p: 3, height: '100%' }}>
              <Typography variant="subtitle2" sx={{ color: 'var(--color-text-primary)', fontWeight: 700, mb: 2.5 }}>
                Income Tax (TDS) Overview
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>Tax Deducted (YTD):</Typography>
                <Typography variant="body2" fontWeight="bold" sx={{ color: 'var(--color-text-primary)' }}>
                  {formatCurrency(summary.taxDeducted)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>Estimated Tax Remaining:</Typography>
                <Typography variant="body2" fontWeight="bold" sx={{ color: 'var(--color-text-primary)' }}>
                  {formatCurrency(summary.expectedTaxRemaining)}
                </Typography>
              </Box>
              <Divider sx={{ my: 1.5, borderColor: 'var(--color-border)' }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>Total TDS contribution (Projected):</Typography>
                <Typography variant="body2" fontWeight="bold" sx={{ color: 'var(--color-warning)' }}>
                  {formatCurrency(summary.taxDeducted + summary.expectedTaxRemaining)}
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Salary advances */}
          <Grid item xs={12}>
            <Paper sx={{ ...cardSx, p: 3 }}>
              <Typography variant="subtitle2" sx={{ color: 'var(--color-primary-hover)', fontWeight: 700, mb: 2.5 }}>
                Salary Advances & Loans
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={3}>
                  <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>Total Advances Granted</Typography>
                  <Typography variant="body1" fontWeight="bold" sx={{ color: 'var(--color-text-primary)', mt: 0.5 }}>
                    {formatCurrency(summary.totalAdvancesTaken)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>Total Repaid (YTD)</Typography>
                  <Typography variant="body1" fontWeight="bold" sx={{ color: 'var(--color-success)', mt: 0.5 }}>
                    {formatCurrency(summary.totalAdvancesRepaid)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>Recovered via Payroll (YTD)</Typography>
                  <Typography variant="body1" fontWeight="bold" sx={{ color: 'var(--color-info)', mt: 0.5 }}>
                    {formatCurrency(summary.advanceRecovered)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>Outstanding Loan Balance</Typography>
                  <Typography
                    variant="body1"
                    fontWeight="bold"
                    sx={{
                      color: summary.remainingAdvanceBalance > 0 ? '#fb923c' : 'var(--color-text-muted)',
                      mt: 0.5,
                    }}
                  >
                    {formatCurrency(summary.remainingAdvanceBalance)}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Recharts Graphical Visualizations */}
          <Grid item xs={12} lg={7}>
            <Paper sx={{ ...cardSx, p: 3, height: 420 }}>
              <Typography variant="subtitle1" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)', mb: 3 }}>
                YTD Paid vs Est. Remaining Analysis
              </Typography>
              <Box sx={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-strong)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="var(--color-text-secondary)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => formatCurrency(val)}
                    />
                    <ChartTooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border-strong)',
                        borderRadius: 'var(--radius-control)',
                        color: 'var(--color-text-primary)',
                      }}
                      formatter={(value) => formatCurrency(value as number)}
                    />
                    <Legend />
                    <Bar dataKey="Paid" name="YTD Paid / Deducted" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Remaining" name="Est. Remaining / Projected" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={5}>
            <Paper sx={{ ...cardSx, p: 3, height: 420 }}>
              <Typography variant="subtitle1" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)', mb: 3 }}>
                Annual CTC Gross Distribution
              </Typography>
              <Box sx={{ height: 320, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip formatter={(value) => formatCurrency(value as number)} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Custom Legend */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2, mt: 1 }}>
                  {pieData.map((item, idx) => (
                    <Box key={item.name} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: chartColors[idx % chartColors.length] }} />
                      <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                        {item.name} ({formatCurrency(item.value)})
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default FinancialSummary;
