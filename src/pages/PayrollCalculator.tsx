import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  Switch,
  Divider,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { formatCurrency } from '../constants/currency';

const PayrollCalculator: React.FC = () => {
  // Mode toggle: monthly vs annual input/display
  const [viewMode, setViewMode] = useState<'monthly' | 'annual'>('monthly');

  // Input states
  const [salaryAmount, setSalaryAmount] = useState<string>(''); // empty by default
  const [pfApplicable, setPfApplicable] = useState<boolean>(true);

  // Validation states
  const [salaryError, setSalaryError] = useState<string>('');

  // Calculated variables (Monthly values)
  const [calculated, setCalculated] = useState({
    ctc: 0,
    gross: 0,
    basic: 0,
    basicAfterDeductions: 0,
    grossPlusBasic: 0,
    hra: 0,
    otherAllowances: 0,
    employeePF: 0,
    employerPF: 0,
    employeeESI: 0,
    employerESI: 0,
    annualTax: 0,
    monthlyTDS: 0,
    totalDeductions: 0,
    netMonthly: 0,
    netAnnual: 0,
  });

  // Calculate tax under New Regime FY 2025-26
  const calculateAnnualTax = (annualGross: number): number => {
    const standardDeduction = 75000;
    const taxableIncome = Math.max(0, annualGross - standardDeduction);

    // New Regime slabs FY 2025-26
    const slabs = [
      { from: 0, to: 400000, rate: 0 },
      { from: 400000, to: 800000, rate: 0.05 },
      { from: 800000, to: 1200000, rate: 0.10 },
      { from: 1200000, to: 1600000, rate: 0.15 },
      { from: 1600000, to: 2000000, rate: 0.20 },
      { from: 2000000, to: 2400000, rate: 0.25 },
      { from: 2400000, to: Infinity, rate: 0.30 },
    ];

    let baseTax = 0;
    for (const slab of slabs) {
      if (taxableIncome > slab.from) {
        const taxableInSlab = Math.min(taxableIncome, slab.to) - slab.from;
        baseTax += taxableInSlab * slab.rate;
      }
    }

    // Section 87A Rebate with Marginal Relief at 12L threshold
    let rebate = 0;
    const rebateThreshold = 1200000;
    if (taxableIncome <= rebateThreshold) {
      rebate = baseTax;
    } else {
      // Marginal relief: check if base tax is greater than excess taxable income over 12L
      const excessIncomeOver12L = taxableIncome - rebateThreshold;
      if (baseTax > excessIncomeOver12L) {
        rebate = baseTax - excessIncomeOver12L;
      }
    }

    const taxAfterRebate = Math.max(0, baseTax - rebate);
    const cess = taxAfterRebate * 0.04;
    return Number((taxAfterRebate + cess).toFixed(2));
  };

  // Recalculate on input changes
  useEffect(() => {
    let sErr = '';

    if (salaryAmount === '') {
      sErr = 'Salary amount is required';
    } else {
      const val = parseFloat(salaryAmount);
      if (isNaN(val) || val <= 0) {
        sErr = 'Salary amount must be a positive number';
      }
    }

    setSalaryError(sErr);

    if (sErr || salaryAmount === '') {
      setCalculated({
        ctc: 0,
        gross: 0,
        basic: 0,
        basicAfterDeductions: 0,
        grossPlusBasic: 0,
        hra: 0,
        otherAllowances: 0,
        employeePF: 0,
        employerPF: 0,
        employeeESI: 0,
        employerESI: 0,
        annualTax: 0,
        monthlyTDS: 0,
        totalDeductions: 0,
        netMonthly: 0,
        netAnnual: 0,
      });
      return;
    }

    const amountVal = parseFloat(salaryAmount);
    const ctc = Number((viewMode === 'annual' ? amountVal / 12 : amountVal).toFixed(2));
    const basic = Number((ctc * 0.50).toFixed(2));
    const hra = Number((basic * 0.40).toFixed(2));
    const pfApplies = basic <= 15000 || pfApplicable;
    const esiApplies = basic < 21000;

    const employeePF = pfApplies ? Number(Math.min(basic * 0.12, 1800).toFixed(2)) : 0;
    const employerPF = pfApplies ? Number(Math.min(basic * 0.12, 1800).toFixed(2)) : 0;
    const employeeESI = esiApplies ? Number((basic * 0.0075).toFixed(2)) : 0;
    const employerESI = esiApplies ? Number((basic * 0.0325).toFixed(2)) : 0;

    const remainingCtc = Number((ctc - basic).toFixed(2));
    const gross = Number((remainingCtc - employerPF - employerESI).toFixed(2));
    const otherAllowances = Number((basic - hra).toFixed(2));

    // Tax is calculated on taxable CTC under the selected frequency.
    const annualCtc = ctc * 12;
    const annualTax = calculateAnnualTax(annualCtc);
    const monthlyTDS = Number((annualTax / 12).toFixed(2));

    const totalDeductions = Number((employeePF + employeeESI + monthlyTDS).toFixed(2));
    const basicAfterDeductions = Number((basic - totalDeductions).toFixed(2));
    const grossPlusBasic = Number((gross + basic).toFixed(2));
    const netMonthly = Number((gross + basicAfterDeductions).toFixed(2));
    const netAnnual = Number((netMonthly * 12).toFixed(2));

    setCalculated({
      ctc,
      gross,
      basic,
      basicAfterDeductions,
      grossPlusBasic,
      hra,
      otherAllowances,
      employeePF,
      employerPF,
      employeeESI,
      employerESI,
      annualTax,
      monthlyTDS,
      totalDeductions,
      netMonthly,
      netAnnual,
    });
  }, [salaryAmount, pfApplicable, viewMode]);

  return (
    <Box sx={{ p: 4, maxWidth: '1400px', margin: '0 auto' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" className="gradient-text" sx={{ fontWeight: 800 }}>
          Indian Payroll Simulator & Calculator
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Left Form: Inputs */}
        <Grid item xs={12} md={5}>
          <Card className="glass-card" sx={{ height: '100%' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                Calculation Parameters
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary', fontWeight: 600 }}>
                    1. Select Frequency
                  </Typography>
                  <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={(_, value) => value && setViewMode(value)}
                    fullWidth
                    sx={{ background: 'var(--color-bg-paper)', border: '1px solid var(--color-border)', mb: 1 }}
                  >
                    <ToggleButton value="monthly">Monthly</ToggleButton>
                    <ToggleButton value="annual">Annually</ToggleButton>
                  </ToggleButtonGroup>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={`2. CTC Amount (${viewMode === 'annual' ? 'Annualized' : 'Monthly'})`}
                    type="number"
                    value={salaryAmount}
                    onChange={(e) => setSalaryAmount(e.target.value)}
                    error={!!salaryError}
                    helperText={salaryError}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>PF Member / Enrolled</Typography>
                    <Switch
                      checked={pfApplicable}
                      onChange={(e) => setPfApplicable(e.target.checked)}
                      color="primary"
                    />
                  </Box>
                </Grid>

              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Panel: Output & Breakdowns */}
        <Grid item xs={12} md={7}>
          <Card className="glass-card" sx={{ height: '100%' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
                Salary Breakdown & Summary
              </Typography>

              {/* Net Salary Highlight */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  mb: 4,
                  background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)',
                  border: '1px solid rgba(14, 165, 233, 0.2)',
                  borderRadius: 2,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Box>
                  <Typography variant="subtitle2" sx={{ opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {viewMode === 'annual' ? 'Net Annual Take-Home' : 'Net Monthly Take-Home'}
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, mt: 0.5, color: '#38bdf8' }}>
                    {formatCurrency(viewMode === 'annual' ? calculated.netAnnual : calculated.netMonthly)}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>
                    TDS: {formatCurrency(viewMode === 'annual' ? calculated.annualTax : calculated.monthlyTDS)}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.7, mt: 0.5 }}>
                    PF: {formatCurrency(viewMode === 'annual' ? calculated.employeePF * 12 : calculated.employeePF)}
                  </Typography>
                </Box>
              </Paper>

              <TableContainer component={Box}>
                <Table size="medium">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Salary Component</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Monthly</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Annual</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {/* Earning / Gross side */}
                    <TableRow sx={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                      <TableCell sx={{ fontWeight: 600 }}>CTC (Cost to Company)</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(calculated.ctc)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(calculated.ctc * 12)}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, pl: 3 }}>Gross from Remaining 50% After Employer Benefits</TableCell>
                      <TableCell align="right">{formatCurrency(calculated.gross)}</TableCell>
                      <TableCell align="right">{formatCurrency(calculated.gross * 12)}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell sx={{ pl: 5, color: 'text.secondary' }}>Basic Salary (50% of CTC)</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary' }}>{formatCurrency(calculated.basic)}</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary' }}>{formatCurrency(calculated.basic * 12)}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell sx={{ pl: 5, color: 'text.secondary' }}>House Rent Allowance (HRA - 40%)</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary' }}>{formatCurrency(calculated.hra)}</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary' }}>{formatCurrency(calculated.hra * 12)}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell sx={{ pl: 5, color: 'text.secondary' }}>Other Allowances (Basic - HRA)</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary' }}>{formatCurrency(calculated.otherAllowances)}</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary' }}>{formatCurrency(calculated.otherAllowances * 12)}</TableCell>
                    </TableRow>

                    {/* Statutory Deductions */}
                    <TableRow sx={{ background: 'rgba(239, 68, 68, 0.02)' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Deductions & Statutory Contributions</TableCell>
                      <TableCell align="right" />
                      <TableCell align="right" />
                    </TableRow>

                    <TableRow>
                      <TableCell sx={{ pl: 3 }}>Employee PF Contribution (12% of Basic, capped at ₹1,800)</TableCell>
                      <TableCell align="right" sx={{ color: '#ef4444' }}>-{formatCurrency(calculated.employeePF)}</TableCell>
                      <TableCell align="right" sx={{ color: '#ef4444' }}>-{formatCurrency(calculated.employeePF * 12)}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell sx={{ pl: 3 }}>Employee ESI Contribution (0.75% of Basic)</TableCell>
                      <TableCell align="right" sx={{ color: '#ef4444' }}>-{formatCurrency(calculated.employeeESI)}</TableCell>
                      <TableCell align="right" sx={{ color: '#ef4444' }}>-{formatCurrency(calculated.employeeESI * 12)}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell sx={{ pl: 3 }}>Income Tax / TDS (New Regime FY 2025-26)</TableCell>
                      <TableCell align="right" sx={{ color: '#ef4444' }}>-{formatCurrency(calculated.monthlyTDS)}</TableCell>
                      <TableCell align="right" sx={{ color: '#ef4444' }}>-{formatCurrency(calculated.annualTax)}</TableCell>
                    </TableRow>

                    {/* Employer Share */}
                    <TableRow sx={{ background: 'rgba(59, 130, 246, 0.02)' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Employer Benefits Deducted from Remaining 50% CTC</TableCell>
                      <TableCell align="right" />
                      <TableCell align="right" />
                    </TableRow>

                    <TableRow>
                      <TableCell sx={{ pl: 3 }}>Employer PF Contribution (12% of Basic, capped at ₹1,800)</TableCell>
                      <TableCell align="right">{formatCurrency(calculated.employerPF)}</TableCell>
                      <TableCell align="right">{formatCurrency(calculated.employerPF * 12)}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell sx={{ pl: 3 }}>Employer ESI Contribution (3.25% of Basic)</TableCell>
                      <TableCell align="right">{formatCurrency(calculated.employerESI)}</TableCell>
                      <TableCell align="right">{formatCurrency(calculated.employerESI * 12)}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell sx={{ pl: 3 }}>Basic Left After Employee Deductions</TableCell>
                      <TableCell align="right">{formatCurrency(calculated.basicAfterDeductions)}</TableCell>
                      <TableCell align="right">{formatCurrency(calculated.basicAfterDeductions * 12)}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell sx={{ pl: 3 }}>Gross + Basic Before Employee Deductions</TableCell>
                      <TableCell align="right">{formatCurrency(calculated.grossPlusBasic)}</TableCell>
                      <TableCell align="right">{formatCurrency(calculated.grossPlusBasic * 12)}</TableCell>
                    </TableRow>

                    {/* Net Total Summary */}
                    <TableRow sx={{ background: 'rgba(16, 185, 129, 0.04)' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Net Take-Home Salary (Gross + Basic Left)</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#10b981' }}>{formatCurrency(calculated.netMonthly)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#10b981' }}>{formatCurrency(calculated.netAnnual)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PayrollCalculator;
