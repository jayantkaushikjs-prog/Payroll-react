import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControlLabel,
  Switch,
  Button,
} from '@mui/material';
import { formatCurrency } from '../constants/currency';

const PayrollCalculator: React.FC = () => {
  const [ctcInput, setCtcInput] = useState<string>('');
  const [includePf, setIncludePf] = useState<boolean>(true);

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
    const esiApplicable = basic <= 21000;

    // Employer side (benefits)
    const employerPf = pfApplicable ? Number(Math.min(basic * pfEmployerRate, maxPfCap).toFixed(2)) : 0;
    const employerEsi = esiApplicable ? Number((basic * esiEmployerRate).toFixed(2)) : 0;

    // Employee side (deductions)
    const employeePf = pfApplicable ? Number(Math.min(basic * pfEmployeeRate, maxPfCap).toFixed(2)) : 0;
    const employeeEsi = esiApplicable ? Number((basic * esiEmployeeRate).toFixed(2)) : 0;

    // Gross = CTC - employee PF - employer ESI
    const gross = Number((ctc - employeePf - employerEsi).toFixed(2));

    // Other allowance is whatever remains after basic & HRA
    const othersAllowance = Math.max(0, Number((gross - basic - hra).toFixed(2)));

    const appliedPt = ctc <= 250000 ? 0 : professionalTax;
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
    return calculateSalary(monthlyCtc, includePf, latestSettings);
  }, [ctcInput, latestSettings, includePf]);

  // Section header row spanning all 3 columns
  const sectionRow = (label: string) => (
    <TableRow>
      <TableCell colSpan={3} sx={{ fontWeight: 700, color: 'text.secondary', backgroundColor: 'rgba(255,255,255,0.03)' }}>
        {label}
      </TableCell>
    </TableRow>
  );

  // Data row: component name, monthly value, annual value
  const dataRow = (label: string, monthlyValue: number, bold = false) => (
    <TableRow>
      <TableCell sx={{ fontWeight: bold ? 700 : 400 }}>{label}</TableCell>
      <TableCell align="right" sx={{ fontWeight: bold ? 700 : 400 }}>
        {formatCurrency(monthlyValue)}
      </TableCell>
      <TableCell align="right" sx={{ fontWeight: bold ? 700 : 400 }}>
        {formatCurrency(monthlyValue * 12)}
      </TableCell>
    </TableRow>
  );

  return (
    <Box sx={{ p: 4, maxWidth: '980px', margin: '0 auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" className="gradient-text" sx={{ fontWeight: 800 }}>
          Payroll Calculator
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75 }}>
          Enter the monthly CTC to see the exact breakdown.
        </Typography>
      </Box>

      <Card className="glass-card">
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--color-border)' }}>
            <Box sx={{ flex: 1, minWidth: 200 }}>
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
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', mt: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={includePf}
                    onChange={(e) => setIncludePf(e.target.checked)}
                    color="primary"
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Include PF
                  </Typography>
                }
              />
            </Box>
            </Box>

          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 0, overflow: 'hidden' }}>
            <Table size="medium">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Component</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Monthly (₹)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Annual (₹)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sectionRow('Earnings')}
                {dataRow('Basic Salary', calculated.basic)}
                {dataRow('House Rent Allowance (HRA)', calculated.hra)}
                {dataRow('Others Allowance', calculated.othersAllowance)}
                {dataRow('Gross Salary (A)', calculated.grossSalary, true)}

                {sectionRow('Benefits')}
                {dataRow('PF Contribution', calculated.pfContribution)}
                {dataRow('ESI Contribution', calculated.esiContribution)}
                {dataRow('Total Cost To Company (CTC)', calculated.ctc, true)}

                {sectionRow('Deductions')}
                {dataRow('Employee PF Contribution', calculated.employeePf)}
                {dataRow('Employee ESI Contribution', calculated.employeeEsi)}
                {dataRow('Professional Tax', calculated.professionalTax)}
                {dataRow('Total Deductions (B)', calculated.totalDeductions, true)}

                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Net Salary (A - B)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: 'var(--color-primary)' }}>
                    {formatCurrency(calculated.netSalary)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: 'var(--color-primary)' }}>
                    {formatCurrency(calculated.netSalary * 12)}
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
