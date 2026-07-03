export interface Employee {
  id: number;
  employee_code: string;
  name: string;
  email: string;
  personal_email?: string;
  phone: string;
  department: string;
  designation: string;
  joining_date: string;
  monthly_ctc?: number;
  annual_ctc?: number;
  bank_name: string;
  account_number: string;
  ifsc: string;
  tax_regime: string;
  active_status: boolean;
  pf_deduction?: boolean;
  pf_uan?: string | null;
  esi_deduction?: boolean;
  tax_deduction?: boolean;
  relieving_date?: string | null;
  other_inputs?: string | null;
  no_of_days_present?: number;
  deduction_absent?: number;
  appraisal?: number;
  appraisal_effective_date?: string | null;
  leave_encashment?: number;
  late_arrival_deduction?: number;
  damages_recovery?: number;
  bonus_incentives?: number;
  other_deductions?: number;
  remarks?: string | null;
  created_at?: string;
  updated_at?: string;
  has_monthly_input?: boolean; // set by the preview endpoint when employee has overrides for this month
}

export type PreviewTagFilter = 'relieving' | 'on_notice' | 'new' | 'old';

export interface PreviewReview {
  id: number;
  month: string;
  status: 'done' | 'undone';
  finance_remarks?: string | null;
  logs?: Array<{
    action: string;
    from?: string;
    to?: string;
    remarks?: string;
    email?: string;
    created_at: string;
  }>;
  hr_marked_done_at?: string | null;
  hr_marked_undone_at?: string | null;
  finance_remarks_updated_at?: string | null;
}

export const getCurrentMonthValue = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
};

export const monthLabels = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const formatMonthLabel = (month?: number) => month ? monthLabels[month - 1] || '-' : '-';

export const dateToMonthValue = (value?: string | null) => {
  if (!value) return '';
  return value.slice(0, 7);
};

export const monthValueToDate = (month: string) => {
  if (!month) return null;
  const [year, monthNumber] = month.split('-').map(Number);
  if (!year || !monthNumber) return null;
  return new Date(year, monthNumber - 1, 1);
};

export const isNewEmployee = (emp: Employee, month = getCurrentMonthValue()) => {
  if (!emp.joining_date) return false;
  const joiningDate = new Date(emp.joining_date);
  if (Number.isNaN(joiningDate.getTime())) return false;

  const selectedMonth = monthValueToDate(month);
  if (!selectedMonth) return false;

  const selectedMonthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
  selectedMonthEnd.setHours(0, 0, 0, 0);
  joiningDate.setHours(0, 0, 0, 0);

  const oneMonthAfterJoining = new Date(joiningDate);
  oneMonthAfterJoining.setMonth(oneMonthAfterJoining.getMonth() + 1);

  return joiningDate <= selectedMonthEnd && selectedMonthEnd <= oneMonthAfterJoining;
};

export const isRelievingInMonth = (emp: Employee, month: string) =>
  Boolean(month) && dateToMonthValue(emp.relieving_date) === month;

export const isOnNoticeInMonth = (emp: Employee, month: string) => {
  if (!emp.relieving_date || !month) return false;
  const selectedMonth = monthValueToDate(month);
  const relievingMonth = monthValueToDate(dateToMonthValue(emp.relieving_date));
  if (!selectedMonth || !relievingMonth) return false;
  return selectedMonth < relievingMonth;
};

export const isEditedInMonth = (emp: Employee, month: string) => {
  if (!month || dateToMonthValue(emp.updated_at) !== month) return false;
  if (!emp.created_at || !emp.updated_at) return true;

  const createdAt = new Date(emp.created_at).getTime();
  const updatedAt = new Date(emp.updated_at).getTime();
  if (Number.isNaN(createdAt) || Number.isNaN(updatedAt)) return true;

  return Math.abs(updatedAt - createdAt) > 1000;
};

export const getPreviewTag = (emp: Employee, month: string): PreviewTagFilter => {
  if (isRelievingInMonth(emp, month)) return 'relieving';
  if (isOnNoticeInMonth(emp, month)) return 'on_notice';
  if (isNewEmployee(emp, month)) return 'new';
  return 'old';
};

export const getPreviewTagMeta = (tag: PreviewTagFilter) => {
  const meta = {
    new: {
      label: 'New',
      color: 'var(--color-success)',
      bgcolor: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.28)',
    },
    old: {
      label: 'Old',
      color: 'var(--color-primary-hover)',
      bgcolor: 'rgba(59, 130, 246, 0.12)',
      border: 'rgba(59, 130, 246, 0.28)',
    },
    on_notice: {
      label: 'On Notice',
      color: 'var(--color-warning)',
      bgcolor: 'rgba(251, 191, 36, 0.14)',
      border: 'rgba(251, 191, 36, 0.3)',
    },
    relieving: {
      label: 'Relieving',
      color: 'var(--color-error)',
      bgcolor: 'rgba(239, 68, 68, 0.12)',
      border: 'rgba(239, 68, 68, 0.28)',
    },
  };
  return meta[tag];
};

export const PF_WAGE_LIMIT = 15000;
export const getBasicSalaryFromMonthlyCtc = (monthlyCtc?: string | number | null) => (Number(monthlyCtc) || 0) * 0.5;
export const isPfRequiredByWageLimit = (monthlyCtc?: string | number | null) => {
  const ctc = Number(monthlyCtc) || 0;
  return ctc > 0 && ctc <= PF_WAGE_LIMIT;
};

export const getDefaultDaysPresent = (emp: Employee, previewY: number, previewM: number) => {
  const totalDays = new Date(Date.UTC(previewY, previewM, 0)).getUTCDate();
  let nonPayableDays = 0;
  
  const monthStart = new Date(Date.UTC(previewY, previewM - 1, 1));
  const monthEnd = new Date(Date.UTC(previewY, previewM, 0));

  if (emp.joining_date) {
    const [y, m, d] = String(emp.joining_date).split('T')[0].split('-').map(Number);
    const joiningDate = new Date(Date.UTC(y, m - 1, d));
    
    if (joiningDate > monthEnd) {
      return 0;
    }
    if (joiningDate.getUTCFullYear() === previewY && joiningDate.getUTCMonth() + 1 === previewM) {
      nonPayableDays += Math.max(0, joiningDate.getUTCDate() - 1);
    }
  }

  if (emp.relieving_date) {
    const [y, m, d] = String(emp.relieving_date).split('T')[0].split('-').map(Number);
    const relievingDate = new Date(Date.UTC(y, m - 1, d));
    
    if (relievingDate < monthStart) {
      return 0;
    }
    if (relievingDate.getUTCFullYear() === previewY && relievingDate.getUTCMonth() + 1 === previewM) {
      nonPayableDays += Math.max(0, totalDays - relievingDate.getUTCDate());
    }
  }

  return Math.max(0, totalDays - nonPayableDays);
};

export interface BaseEmployeeFormData {
  employee_code: string;
  name: string;
  email: string;
  personal_email: string;
  phone: string;
  department: string;
  designation: string;
  joining_date: string;
  monthly_ctc: string | number;
  bank_name: string;
  account_number: string;
  ifsc: string;
  pf_uan: string;
  tax_regime: string;
  active_status: boolean;
  pf_deduction: boolean;
  tax_deduction: boolean;
}

export interface ConsoleFormData {
  employee_code: string;
  name: string;
  deduction_absent: string | number;
  appraisal: string | number;
  appraisal_effective_date: string;
  leave_encashment: string | number;
  late_arrival_deduction: string | number;
  damages_recovery: string | number;
  bonus_incentives: string | number;
  other_deductions: string | number;
  remarks: string;
  joining_date: string;
  relieving_date: string;
  other_inputs: string;
}

export interface ProfileFormData extends BaseEmployeeFormData, ConsoleFormData {}
