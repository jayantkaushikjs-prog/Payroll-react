import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  FormControlLabel,
  Switch,
  Button,
} from '@mui/material';
import { formatCurrency } from '../constants/currency';

const PayrollCalculator: React.FC = () => {
  const [ctcInput, setCtcInput] = useState<string>('');
  const [viewPeriod, setViewPeriod] = useState<'monthly' | 'annually'>('monthly');
  const [includePf, setIncludePf] = useState<boolean>(true);
  const [calcTrigger, setCalcTrigger] = useState<number>(0);

  // Fetch all PF Settings for dynamic rates
  const { data: pfList = [] } = useQuery(['pfSettings'], async () => {
    const res = await api.get('/pf');
    return res.data;
  });

  const latestSettings = pfList.length > 0
    ? pfList.reduce((latest: any, curr: any) =>
        curr.effective_date > latest.effective_date ? curr : latest
      , pfList[0])
    : null;

  /**
   * Compute payroll components based on CTC.
   * @param ctc - Cost To Company (monthly) amount.
   * @param includePf - Whether PF should be considered.
   * @param settings - PF/ESI configuration; defaults to empty object.
   * @returns An object containing all calculated salary components.
   */
  const calculateSalary = (ctc: number, includePf: boolean, settings: any = {}) => {
    const pfEmployerRate = (Number(settings?.employer_contribution_rate) || 12) / 100;
    const pfEmployeeRate = (Number(settings?.employee_contribution_rate) || 12) / 100;
    const esiEmployerRate = (Number(settings?.esi_contribution_rate) || 3.25) / 100;
    const esiEmployeeRate = (Number(settings?.esi_employee_contribution_rate) || 0.75) / 100;
    const professionalTax = Number(settings?.professional_tax !== undefined ? settings.professional_tax : 200);
    const maxPfCap = Number(settings?.max_pf_cap || 1800);

    // Basic and HRA (fixed percentages)
    const basic = Number((ctc * 0.5).toFixed(2));
    const hra = Number((basic * 0.4).toFixed(2));

    const pfApplicable = includePf;
    const esiApplicable = basic < 21000;

    // Employer side (benefits)
    const employerPf = pfApplicable ? Number(Math.min(basic * pfEmployerRate, maxPfCap).toFixed(2)) : 0;
    const employerEsi = esiApplicable ? Number((basic * esiEmployerRate).toFixed(2)) : 0;

    // Employee side (deductions)
    const employeePf = pfApplicable ? Number(Math.min(basic * pfEmployeeRate, maxPfCap).toFixed(2)) : 0;
    const employeeEsi = esiApplicable ? Number((basic * esiEmployeeRate).toFixed(2)) : 0;

    // Gross = CTC - employee PF - employer ESI
    // Gross Salary = CTC minus employee PF and employer ESI (benefits)
    const gross = Number((ctc - employeePf - employerEsi).toFixed(2));

    // Other allowance is whatever remains after basic & HRA
    const othersAllowance = Math.max(0, Number((gross - basic - hra).toFixed(2)));

    const appliedPt = gross > 15000 ? professionalTax : 0;
    const totalDeductions = Number((employeePf + employeeEsi + appliedPt).toFixed(2));
    const net = Number((gross - totalDeductions).toFixed(2));

    return {
      basic,
      hra,
      othersAllowance,
      grossSalary: gross,
      pfContribution: employerPf,
      esiContribution: employerEsi,
      ctc: ctc,
      employeePf,
      employeeEsi,
      professionalTax: appliedPt,
      totalDeductions,
      netSalary: net,
    };
  };


  const calculated = useMemo(() => {
    let inputCtc = Number(ctcInput);
    
    if (!Number.isFinite(inputCtc) || inputCtc <= 0) {
      return {
        basic: 0,
        hra: 0,
        othersAllowance: 0,
        grossSalary: 0,
        pfContribution: 0,
        esiContribution: 0,
        ctc: 0,
        employeePf: 0,
        employeeEsi: 0,
        professionalTax: 0,
        totalDeductions: 0,
        netSalary: 0,
      };
    }

    const monthlyCtc = inputCtc;

    // Use the helper to compute all payroll components
    return calculateSalary(monthlyCtc, includePf, latestSettings);
  }, [ctcInput, viewPeriod, latestSettings, includePf, calcTrigger]);

  // Helper function to convert values based on view period
  const formatForView = (value: number) => {
    if (viewPeriod === 'annually') {
      return value * 12;
    }
    return value;
  };

  const handlePeriodChange = (
    event: React.MouseEvent<HTMLElement>,
    newPeriod: 'monthly' | 'annually',
  ) => {
    if (newPeriod !== null) {
      setViewPeriod(newPeriod);
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: '980px', margin: '0 auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" className="gradient-text" sx={{ fontWeight: 800 }}>
          Payroll Calculator
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75 }}>
          Enter the CTC and choose the period to see the exact breakdown.
        </Typography>
      </Box>

      <Card className="glass-card">
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--color-border)' }}>
            <Box>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>View Period</Typography>
              <ToggleButtonGroup
                value={viewPeriod}
                exclusive
                onChange={handlePeriodChange}
                size="small"
                sx={{
                  backgroundColor: 'var(--color-surface)',
                  '& .MuiToggleButton-root': {
                    color: 'var(--color-text-secondary)',
                    borderColor: 'var(--color-border)',
                    '&.Mui-selected': {
                      backgroundColor: 'var(--color-primary)',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'var(--color-primary-hover)',
                      }
                    }
                  }
                }}
              >
                <ToggleButton value="monthly">Monthly</ToggleButton>
                <ToggleButton value="annually">Annually</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
                Monthly CTC
              </Typography>
              <TextField
                value={ctcInput}
                onChange={(e) => setCtcInput(e.target.value)}
                type="number"
                placeholder="Enter CTC"
                variant="outlined"
                size="small"
                fullWidth
                inputProps={{ min: 0 }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'var(--color-surface)',
                  }
                }}
              />
              <Box sx={{ mt: 2, textAlign: 'right' }}>
                <Button variant="contained" color="primary" onClick={() => setCalcTrigger(prev => prev + 1)}>
                  Generate Payroll
                </Button>
              </Box>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>Include PF?</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={includePf}
                    onChange={(e) => setIncludePf(e.target.checked)}
                    color="primary"
                  />
                }
                label={includePf ? "Yes" : "No"}
              />
            </Box>
          </Box>
          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 0, overflow: 'hidden' }}>
            <Table size="medium">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Component</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={2} sx={{ fontWeight: 700, color: 'text.secondary', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                    Earnings
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Basic Salary</TableCell>
                  <TableCell align="right">{formatCurrency(formatForView(calculated.basic))}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>House Rent Allowance (HRA)</TableCell>
                  <TableCell align="right">{formatCurrency(formatForView(calculated.hra))}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Others Allowance</TableCell>
                  <TableCell align="right">{formatCurrency(formatForView(calculated.othersAllowance))}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Gross Salary (A)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {formatCurrency(formatForView(calculated.grossSalary))}
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell colSpan={2} sx={{ fontWeight: 700, color: 'text.secondary', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                    Benefits
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>PF Contribution</TableCell>
                  <TableCell align="right">{formatCurrency(formatForView(calculated.pfContribution))}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>ESI Contribution</TableCell>
                  <TableCell align="right">{formatCurrency(formatForView(calculated.esiContribution))}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Total Cost To Company (CTC)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(formatForView(calculated.ctc))}</TableCell>
                </TableRow>

                <TableRow>
                  <TableCell colSpan={2} sx={{ fontWeight: 700, color: 'text.secondary', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                    Deductions
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Employee PF Contribution</TableCell>
                  <TableCell align="right">{formatCurrency(formatForView(calculated.employeePf))}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Employee ESI Contribution</TableCell>
                  <TableCell align="right">{formatCurrency(formatForView(calculated.employeeEsi))}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Professional Tax</TableCell>
                  <TableCell align="right">{formatCurrency(formatForView(calculated.professionalTax))}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Total Deductions (B)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(formatForView(calculated.totalDeductions))}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Net Salary (A - B)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: 'var(--color-primary)' }}>
                    {formatCurrency(formatForView(calculated.netSalary))}
                  </TableCell>
                </TableRow>

              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PayrollCalculator;
