import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
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
  const [salaryType, setSalaryType] = useState<'CTC' | 'Gross'>('CTC');
  const [salaryAmount, setSalaryAmount] = useState<string>(''); // empty by default
  const [basicPercent, setBasicPercent] = useState<string>(''); // empty by default
  const [pfApplicable, setPfApplicable] = useState<boolean>(true);
  const [pfMethod, setPfMethod] = useState<'actual' | 'ceiling'>('ceiling');
  const [pfCap, setPfCap] = useState<'none' | 'employee' | 'both'>('both');

  // Validation states
  const [salaryError, setSalaryError] = useState<string>('');
  const [basicPercentError, setBasicPercentError] = useState<string>('');

  // Calculated variables (Monthly values)
  const [calculated, setCalculated] = useState({
    ctc: 0,
    gross: 0,
    basic: 0,
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
    let bErr = '';

    if (salaryAmount === '') {
      sErr = 'Salary amount is required';
    } else {
      const val = parseFloat(salaryAmount);
      if (isNaN(val) || val <= 0) {
        sErr = 'Salary amount must be a positive number';
      }
    }

    if (basicPercent === '') {
      bErr = 'Basic salary percentage is required';
    } else {
      const val = parseFloat(basicPercent);
      if (isNaN(val) || val < 10 || val > 100) {
        bErr = 'Percentage must be between 10% and 100%';
      }
    }

    setSalaryError(sErr);
    setBasicPercentError(bErr);

    if (sErr || bErr || salaryAmount === '' || basicPercent === '') {
      setCalculated({
        ctc: 0,
        gross: 0,
        basic: 0,
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
    const basicPct = parseFloat(basicPercent);
    const monthlyInputAmount = viewMode === 'annual' ? amountVal / 12 : amountVal;

    let targetGross = 0;

    // Helper to compute employer components given a hypothetical gross
    const computeEmployerComponents = (hypotheticalGross: number) => {
      const basic = hypotheticalGross * (basicPct / 100);
      let pfWage = basic;
      if (pfMethod === 'ceiling') {
        pfWage = Math.min(basic, 15000);
      }

      let employerPF = 0;
      if (pfApplicable) {
        employerPF = pfWage * 0.12;
        if (pfCap === 'both') {
          employerPF = Math.min(employerPF, 1800);
        }
      }

      let employerESI = 0;
      if (hypotheticalGross <= 21000) {
        employerESI = hypotheticalGross * 0.0325;
      }

      return { employerPF, employerESI };
    };

    if (salaryType === 'Gross') {
      targetGross = monthlyInputAmount;
    } else {
      // CTC Mode: use Bisection method to solve for monthly Gross Salary
      let low = 0;
      let high = monthlyInputAmount;
      let solvedGross = monthlyInputAmount;

      for (let i = 0; i < 80; i++) {
        solvedGross = (low + high) / 2;
        const { employerPF, employerESI } = computeEmployerComponents(solvedGross);
        const calculatedCTC = solvedGross + employerPF + employerESI;

        if (Math.abs(calculatedCTC - monthlyInputAmount) < 0.0001) {
          break;
        }

        if (calculatedCTC > monthlyInputAmount) {
          high = solvedGross;
        } else {
          low = solvedGross;
        }
      }
      targetGross = solvedGross;
    }

    // 2. Perform final monthly breakdown using solved Gross
    const gross = Number(targetGross.toFixed(2));
    const basic = Number((gross * (basicPct / 100)).toFixed(2));
    const hra = Number((basic * 0.40).toFixed(2));
    const otherAllowances = Number((gross - basic - hra).toFixed(2));

    // PF Wage
    let pfWage = basic;
    if (pfMethod === 'ceiling') {
      pfWage = Math.min(basic, 15000);
    }

    // Employee PF
    let employeePF = 0;
    if (pfApplicable) {
      employeePF = pfWage * 0.12;
      if (pfCap === 'employee' || pfCap === 'both') {
        employeePF = Math.min(employeePF, 1800);
      }
    }
    employeePF = Number(employeePF.toFixed(2));

    // Employer PF
    let employerPF = 0;
    if (pfApplicable) {
      employerPF = pfWage * 0.12;
      if (pfCap === 'both') {
        employerPF = Math.min(employerPF, 1800);
      }
    }
    employerPF = Number(employerPF.toFixed(2));

    // ESI (if gross <= 21,000)
    let employeeESI = 0;
    let employerESI = 0;
    if (gross <= 21000) {
      employeeESI = Number((gross * 0.0075).toFixed(2));
      employerESI = Number((gross * 0.0325).toFixed(2));
    }

    // Tax (calculated on projected annual gross)
    const annualGross = gross * 12;
    const annualTax = calculateAnnualTax(annualGross);
    const monthlyTDS = Number((annualTax / 12).toFixed(2));

    const totalDeductions = Number((employeePF + employeeESI + monthlyTDS).toFixed(2));
    const netMonthly = Number((gross - totalDeductions).toFixed(2));
    const netAnnual = Number((netMonthly * 12).toFixed(2));

    // Derive CTC
    const ctc = Number((gross + employerPF + employerESI).toFixed(2));

    setCalculated({
      ctc,
      gross,
      basic,
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
  }, [salaryType, salaryAmount, basicPercent, pfApplicable, pfMethod, pfCap, viewMode]);

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
                    1. Salary Structure Base (Type)
                  </Typography>
                  <ToggleButtonGroup
                    value={salaryType}
                    exclusive
                    onChange={(_, value) => value && setSalaryType(value)}
                    fullWidth
                    sx={{ background: 'var(--color-bg-paper)', border: '1px solid var(--color-border)', mb: 1 }}
                  >
                    <ToggleButton value="CTC">Cost To Company (CTC)</ToggleButton>
                    <ToggleButton value="Gross">Gross Salary</ToggleButton>
                  </ToggleButtonGroup>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary', fontWeight: 600 }}>
                    2. Select Frequency
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
                    label={`3. Salary Amount (${viewMode === 'annual' ? 'Annualized' : 'Monthly'})`}
                    type="number"
                    value={salaryAmount}
                    onChange={(e) => setSalaryAmount(e.target.value)}
                    error={!!salaryError}
                    helperText={salaryError}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Basic Salary Percentage of Gross"
                    type="number"
                    value={basicPercent}
                    onChange={(e) => setBasicPercent(e.target.value)}
                    error={!!basicPercentError}
                    helperText={basicPercentError}
                    InputProps={{ inputProps: { min: 10, max: 100 } }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>Provident Fund (PF) Applicable</Typography>
                    <Switch
                      checked={pfApplicable}
                      onChange={(e) => setPfApplicable(e.target.checked)}
                      color="primary"
                    />
                  </Box>
                </Grid>

                {pfApplicable && (
                  <>
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>PF Calculation Basis</InputLabel>
                        <Select
                          value={pfMethod}
                          label="PF Calculation Basis"
                          onChange={(e) => setPfMethod(e.target.value as 'actual' | 'ceiling')}
                        >
                          <MenuItem value="actual">Actual Basic Salary (12% of Basic)</MenuItem>
                          <MenuItem value="ceiling">Statutory Wage Ceiling (12% capped at ₹15k wage)</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>PF Cap Method</InputLabel>
                        <Select
                          value={pfCap}
                          label="PF Cap Method"
                          onChange={(e) => setPfCap(e.target.value as 'none' | 'employee' | 'both')}
                        >
                          <MenuItem value="none">No Cap (Pure 12% of selected base)</MenuItem>
                          <MenuItem value="employee">Cap Employee PF at ₹1,800/month</MenuItem>
                          <MenuItem value="both">Cap Employee & Employer PF at ₹1,800/month</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </>
                )}
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
                      <TableCell sx={{ fontWeight: 600, pl: 3 }}>Gross Salary</TableCell>
                      <TableCell align="right">{formatCurrency(calculated.gross)}</TableCell>
                      <TableCell align="right">{formatCurrency(calculated.gross * 12)}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell sx={{ pl: 5, color: 'text.secondary' }}>Basic Salary ({basicPercent}%)</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary' }}>{formatCurrency(calculated.basic)}</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary' }}>{formatCurrency(calculated.basic * 12)}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell sx={{ pl: 5, color: 'text.secondary' }}>House Rent Allowance (HRA - 40%)</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary' }}>{formatCurrency(calculated.hra)}</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary' }}>{formatCurrency(calculated.hra * 12)}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell sx={{ pl: 5, color: 'text.secondary' }}>Other Allowances</TableCell>
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
                      <TableCell sx={{ pl: 3 }}>Employee PF Contribution (12%)</TableCell>
                      <TableCell align="right" sx={{ color: '#ef4444' }}>-{formatCurrency(calculated.employeePF)}</TableCell>
                      <TableCell align="right" sx={{ color: '#ef4444' }}>-{formatCurrency(calculated.employeePF * 12)}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell sx={{ pl: 3 }}>Employee ESI Contribution (0.75%)</TableCell>
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
                      <TableCell sx={{ fontWeight: 600 }}>Employer Share (Outside Gross / Part of CTC)</TableCell>
                      <TableCell align="right" />
                      <TableCell align="right" />
                    </TableRow>

                    <TableRow>
                      <TableCell sx={{ pl: 3 }}>Employer PF Contribution</TableCell>
                      <TableCell align="right">{formatCurrency(calculated.employerPF)}</TableCell>
                      <TableCell align="right">{formatCurrency(calculated.employerPF * 12)}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell sx={{ pl: 3 }}>Employer ESI Contribution</TableCell>
                      <TableCell align="right">{formatCurrency(calculated.employerESI)}</TableCell>
                      <TableCell align="right">{formatCurrency(calculated.employerESI * 12)}</TableCell>
                    </TableRow>

                    {/* Net Total Summary */}
                    <TableRow sx={{ background: 'rgba(16, 185, 129, 0.04)' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Net Take-Home Salary</TableCell>
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
