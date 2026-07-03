import React, { useEffect, useMemo, useState } from 'react';
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
  const [bonus, setBonus] = useState<string>('');
  const [leaveEncashment, setLeaveEncashment] = useState<string>('');
  const [lateArrivals, setLateArrivals] = useState<string>('');
  const [nonPayableDays, setNonPayableDays] = useState<string>('');
  const [damages, setDamages] = useState<string>('');
  const [professionalTaxInput, setProfessionalTaxInput] = useState<string>('');
  const [otherDeductions, setOtherDeductions] = useState<string>('');
  const [appraisal, setAppraisal] = useState<string>('');
  const pfWageLimit = 15000;

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
  const calculateSalary = (ctcValue: number, includePf: boolean, settings: any = {}, extra: any) => {
    const pfEmployerRate = (Number(settings?.employer_contribution_rate) || 12) / 100;
    const pfEmployeeRate = (Number(settings?.employee_contribution_rate) || 12) / 100;
    const esiEmployerRate = (Number(settings?.esi_contribution_rate) || 3.25) / 100;
    const esiEmployeeRate = (Number(settings?.esi_employee_contribution_rate) || 0.75) / 100;
    const professionalTax = Number(settings?.professional_tax !== undefined ? settings.professional_tax : 200);
    const maxPfCap = Number(settings?.max_pf_cap || 1800);
    const esiWageLimit = 21000;

    const ctc = ctcValue + extra.appraisal;

    // Basic and HRA (fixed percentages)
    const basic = Number((ctc * 0.5).toFixed(2));
    const hra = Number((basic * 0.4).toFixed(2));

    // Match payroll generation conditions: PF applies when the employee is a PF member or basic is within the PF wage limit.
    const pfApplicable = includePf || basic <= pfWageLimit;
    const esiApplicable = basic <= esiWageLimit;

    // Employer side (benefits) – calculated only when applicable
    const employerPf = pfApplicable ? Number(Math.min(basic * pfEmployerRate, maxPfCap).toFixed(2)) : 0;
    const employerEsi = esiApplicable ? Number((basic * esiEmployerRate).toFixed(2)) : 0;

    // Employee side (deductions) – calculated only when applicable
    const employeePf = pfApplicable ? Number(Math.min(basic * pfEmployeeRate, maxPfCap).toFixed(2)) : 0;
    const employeeEsi = esiApplicable ? Number((basic * esiEmployeeRate).toFixed(2)) : 0;

    // Gross salary after subtracting employer contributions
    const gross = Number((ctc - employerPf - employerEsi).toFixed(2));

    // Other allowance represents the remaining amount after Basic and HRA
    const othersAllowance = Math.max(0, Number((gross - basic - hra).toFixed(2)));

    const now = new Date();
    const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
    const absentDays = Math.max(0, Number(extra.nonPayableDays || 0));
    const payableDays = Math.max(0, daysInMonth - absentDays);
    const ratio = daysInMonth > 0 ? payableDays / daysInMonth : 1;
    const payableGross = Number((gross * Math.max(0, Math.min(1, ratio))).toFixed(2));
    const payableBasic = Number((basic * Math.max(0, Math.min(1, ratio))).toFixed(2));
    const nonPayableDeduction = Number((gross - payableGross).toFixed(2));

    const employeePfDeduction = pfApplicable ? Number(Math.min(payableBasic * pfEmployeeRate, maxPfCap * Math.max(0, Math.min(1, ratio))).toFixed(2)) : 0;
    const employeeEsiDeduction = esiApplicable ? Number((payableBasic * esiEmployeeRate).toFixed(2)) : 0;

    const lateAbsentDays = extra.lateArrivals < 3 ? 0 : (extra.lateArrivals / 3) * 0.5;
    const lateArrivalDeductionAmount = Number(((gross / daysInMonth) * lateAbsentDays).toFixed(2));

    const ptAmount = extra.professionalTax !== undefined && extra.professionalTax !== '' ? Number(extra.professionalTax) : professionalTax;
    const appliedPt = (ctc * 12) <= 250000 ? 0 : Number(ptAmount.toFixed(2));
    const totalDeductions = Number((employeePfDeduction + employeeEsiDeduction + appliedPt + lateArrivalDeductionAmount + extra.damages + extra.otherDeductions + nonPayableDeduction).toFixed(2));

    const totalEarnings = Number((gross + extra.bonus + extra.leaveEncashment).toFixed(2));
    const net = Number(Math.max(0, totalEarnings - totalDeductions).toFixed(2));

    return {
      basic,
      hra,
      othersAllowance,
      grossSalary: gross,
      bonus: extra.bonus,
      leaveEncashment: extra.leaveEncashment,
      totalEarnings,
      pfContribution: employerPf,
      esiContribution: employerEsi,
      ctc: ctc,
      employeePf: employeePfDeduction,
      employeeEsi: employeeEsiDeduction,
      professionalTax: appliedPt,
      lateArrivalDeductionAmount,
      nonPayableDeduction,
      damages: extra.damages,
      otherDeductions: extra.otherDeductions,
      totalDeductions,
      netSalary: net,
    };
  };

  const calculatorBasicSalary = useMemo(() => {
    const ctc = Number(ctcInput);
    if (!Number.isFinite(ctc) || ctc <= 0) return 0;
    return Number(((ctc + (Number(appraisal) || 0)) * 0.5).toFixed(2));
  }, [ctcInput, appraisal]);

  const pfRequiredByWageLimit = calculatorBasicSalary > 0 && calculatorBasicSalary <= pfWageLimit;

  useEffect(() => {
    if (pfRequiredByWageLimit && !includePf) {
      setIncludePf(true);
    }
  }, [pfRequiredByWageLimit, includePf]);

  const calculated = useMemo(() => {
    let inputCtc = Number(ctcInput);

    if (!Number.isFinite(inputCtc) || inputCtc <= 0) {
      return {
        basic: 0,
        hra: 0,
        othersAllowance: 0,
        grossSalary: 0,
        bonus: 0,
        leaveEncashment: 0,
        totalEarnings: 0,
        pfContribution: 0,
        esiContribution: 0,
        ctc: 0,
        employeePf: 0,
        employeeEsi: 0,
        professionalTax: 0,
        lateArrivalDeductionAmount: 0,
        nonPayableDeduction: 0,
        damages: 0,
        otherDeductions: 0,
        totalDeductions: 0,
        netSalary: 0,
      };
    }

    const monthlyCtc = inputCtc;
    return calculateSalary(monthlyCtc, includePf || pfRequiredByWageLimit, latestSettings, {
      bonus: Number(bonus) || 0,
      leaveEncashment: Number(leaveEncashment) || 0,
      lateArrivals: Number(lateArrivals) || 0,
      nonPayableDays: Number(nonPayableDays) || 0,
      damages: Number(damages) || 0,
      otherDeductions: Number(otherDeductions) || 0,
      appraisal: Number(appraisal) || 0,
      professionalTax: professionalTaxInput === '' ? undefined : Number(professionalTaxInput),
    });
  }, [ctcInput, latestSettings, includePf, pfRequiredByWageLimit, bonus, leaveEncashment, lateArrivals, nonPayableDays, damages, otherDeductions, appraisal, professionalTaxInput]);

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

            <Box sx={{ flex: 1, minWidth: 150 }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>Appraisal</Typography>
              <TextField value={appraisal} onChange={(e) => setAppraisal(e.target.value)} type="number" placeholder="Amt" variant="outlined" size="small" fullWidth />
            </Box>
            <Box sx={{ flex: 1, minWidth: 150 }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>Bonus/Incentive</Typography>
              <TextField value={bonus} onChange={(e) => setBonus(e.target.value)} type="number" placeholder="Amt" variant="outlined" size="small" fullWidth />
            </Box>
            <Box sx={{ flex: 1, minWidth: 150 }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>Leave Encashment</Typography>
              <TextField value={leaveEncashment} onChange={(e) => setLeaveEncashment(e.target.value)} type="number" placeholder="Amt" variant="outlined" size="small" fullWidth />
            </Box>
            <Box sx={{ flex: 1, minWidth: 150 }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>Late Arrivals (count)</Typography>
              <TextField value={lateArrivals} onChange={(e) => setLateArrivals(e.target.value)} type="number" placeholder="Count" variant="outlined" size="small" fullWidth />
            </Box>
            <Box sx={{ flex: 1, minWidth: 150 }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>Non-Payable Days</Typography>
              <TextField value={nonPayableDays} onChange={(e) => setNonPayableDays(e.target.value)} type="number" placeholder="Days" variant="outlined" size="small" fullWidth />
            </Box>
            <Box sx={{ flex: 1, minWidth: 150 }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>Professional Tax</Typography>
              <TextField value={professionalTaxInput} onChange={(e) => setProfessionalTaxInput(e.target.value)} type="number" placeholder="Amt" variant="outlined" size="small" fullWidth />
            </Box>
            <Box sx={{ flex: 1, minWidth: 150 }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>Damages</Typography>
              <TextField value={damages} onChange={(e) => setDamages(e.target.value)} type="number" placeholder="Amt" variant="outlined" size="small" fullWidth />
            </Box>
            <Box sx={{ flex: 1, minWidth: 150 }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>Other Ded.</Typography>
              <TextField value={otherDeductions} onChange={(e) => setOtherDeductions(e.target.value)} type="number" placeholder="Amt" variant="outlined" size="small" fullWidth />
            </Box>

            <Box sx={{ flex: '0 0 auto', display: 'flex', alignItems: 'flex-end', pb: 0.5 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={includePf || pfRequiredByWageLimit}
                    disabled={pfRequiredByWageLimit}
                    onChange={(e) => setIncludePf(pfRequiredByWageLimit || e.target.checked)}
                    color="primary"
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    Include PF
                  </Typography>
                }
                sx={{ m: 0 }}
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
                {dataRow('Gross Salary', calculated.grossSalary)}
                {dataRow('Bonus / Incentives', calculated.bonus || 0)}
                {dataRow('Leave Encashment', calculated.leaveEncashment || 0)}
                {dataRow('Total Earnings (A)', calculated.totalEarnings || 0, true)}

                {sectionRow('Benefits')}
                {dataRow('PF Contribution', calculated.pfContribution)}
                {dataRow('ESI Contribution', calculated.esiContribution)}
                {dataRow('Total Cost To Company (CTC)', calculated.ctc, true)}

                {sectionRow('Deductions')}
                {dataRow('Employee PF Contribution', calculated.employeePf)}
                {dataRow('Employee ESI Contribution', calculated.employeeEsi)}
                {dataRow('Professional Tax', calculated.professionalTax)}
                {dataRow('Non-Payable Days Deduction', calculated.nonPayableDeduction || 0)}
                {dataRow('Late Arrival Deduction', calculated.lateArrivalDeductionAmount || 0)}
                {dataRow('Damages Recovery', calculated.damages || 0)}
                {dataRow('Other Deductions', calculated.otherDeductions || 0)}
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
