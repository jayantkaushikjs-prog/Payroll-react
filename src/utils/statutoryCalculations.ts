import { getBasicSalaryFromMonthlyCtc, isPfRequiredByWageLimit } from './employeeUtils';

export const computeEmployerPf = (monthlyCtc: string | number, pfDeduction: boolean) => {
  const ctc = Number(monthlyCtc || 0);
  if (!ctc || isNaN(ctc)) return 0;

  const basicSalary = getBasicSalaryFromMonthlyCtc(monthlyCtc);
  const pfApplies = pfDeduction || isPfRequiredByWageLimit(monthlyCtc);
  if (!pfApplies) return 0;

  return Number(Math.min(basicSalary * 0.12, 1800).toFixed(2));
};

export const computeEmployeePf = (monthlyCtc: string | number, pfDeduction: boolean) => {
  return computeEmployerPf(monthlyCtc, pfDeduction);
};

export const computeEmployerEsi = (monthlyCtc: string | number) => {
  const basicSalary = getBasicSalaryFromMonthlyCtc(monthlyCtc);
  if (basicSalary >= 21000) return 0;
  return Number((basicSalary * 0.0325).toFixed(2));
};

export const computeEmployeeEsi = (monthlyCtc: string | number) => {
  const basicSalary = getBasicSalaryFromMonthlyCtc(monthlyCtc);
  if (basicSalary >= 21000) return 0;
  return Number((basicSalary * 0.0075).toFixed(2));
};

export const computeProfTax = (monthlyCtc: string | number) => {
  const ctc = Number(monthlyCtc || 0);
  return (ctc * 12) > 250000 ? 200 : 0;
};
