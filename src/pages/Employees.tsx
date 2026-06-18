import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useLocation } from 'react-router-dom';
import { useAuth, Role } from '../context/AuthContext';
import { formatCurrency } from '../constants/currency';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Grid,
  FormControlLabel,
  Switch,
  CircularProgress,
  Divider,
  Autocomplete,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TablePagination,
  Checkbox,
  Chip,
  Menu,
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
import { useToast } from '../context/ToastContext';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  Upload as UploadIcon,
  Visibility as ViewIcon,
  People as PeopleIcon,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';

interface Employee {
  id: number;
  employee_code: string;
  name: string;
  email: string;
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
}

type PreviewTagFilter = 'relieving' | 'on_notice' | 'new' | 'old';

interface PreviewReview {
  id: number;
  month: string;
  status: 'done' | 'undone';
  finance_remarks?: string | null;
  logs?: Array<{
    action: string;
    from?: string;
    to?: string;
    remarks?: string;
    created_at: string;
  }>;
  hr_marked_done_at?: string | null;
  hr_marked_undone_at?: string | null;
}

const getCurrentMonthValue = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
};

const monthLabels = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const formatMonthLabel = (month?: number) => month ? monthLabels[month - 1] || '-' : '-';

const dateToMonthValue = (value?: string | null) => {
  if (!value) return '';
  return value.slice(0, 7);
};

const monthValueToDate = (month: string) => {
  if (!month) return null;
  const [year, monthNumber] = month.split('-').map(Number);
  if (!year || !monthNumber) return null;
  return new Date(year, monthNumber - 1, 1);
};

const isNewEmployee = (emp: Employee, month = getCurrentMonthValue()) => {
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

const isRelievingInMonth = (emp: Employee, month: string) =>
  Boolean(month) && dateToMonthValue(emp.relieving_date) === month;

const isOnNoticeInMonth = (emp: Employee, month: string) => {
  if (!emp.relieving_date || !month) return false;
  const selectedMonth = monthValueToDate(month);
  const relievingMonth = monthValueToDate(dateToMonthValue(emp.relieving_date));
  if (!selectedMonth || !relievingMonth) return false;
  return selectedMonth < relievingMonth;
};

const isEditedInMonth = (emp: Employee, month: string) => {
  if (!month || dateToMonthValue(emp.updated_at) !== month) return false;
  if (!emp.created_at || !emp.updated_at) return true;

  const createdAt = new Date(emp.created_at).getTime();
  const updatedAt = new Date(emp.updated_at).getTime();
  if (Number.isNaN(createdAt) || Number.isNaN(updatedAt)) return true;

  return Math.abs(updatedAt - createdAt) > 1000;
};

const getPreviewTag = (emp: Employee, month: string): PreviewTagFilter => {
  if (isRelievingInMonth(emp, month)) return 'relieving';
  if (isOnNoticeInMonth(emp, month)) return 'on_notice';
  if (isNewEmployee(emp, month)) return 'new';
  return 'old';
};

const getPreviewTagMeta = (tag: PreviewTagFilter) => {
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

const PreviewRemarks: React.FC<{ remarks?: string | null }> = ({ remarks }) => {
  const [expanded, setExpanded] = useState(false);
  const text = remarks?.trim();
  const previewLimit = 90;

  if (!text) return <>-</>;

  const shouldTruncate = text.length > previewLimit;
  const displayText = expanded || !shouldTruncate ? text : `${text.slice(0, previewLimit).trimEnd()}...`;

  return (
    <Box>
      <Typography component="span" sx={{ color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap' }}>
        {displayText}
      </Typography>
      {shouldTruncate && (
        <Button
          variant="text"
          size="small"
          onClick={() => setExpanded((current) => !current)}
          sx={{
            ml: 0.5,
            minWidth: 'auto',
            p: 0,
            textTransform: 'none',
            fontWeight: 700,
            color: 'var(--color-primary-hover)',
            verticalAlign: 'baseline',
          }}
        >
          {expanded ? 'Read less' : 'Read more'}
        </Button>
      )}
    </Box>
  );
};

interface EmployeesProps {
  previewOnly?: boolean;
}

const Employees: React.FC<EmployeesProps> = ({ previewOnly = false }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [formErrors, setFormErrors] = useState({
    employee_code: '',
    name: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    joining_date: '',
    bank_name: '',
    account_number: '',
    ifsc: '',
    pf_uan: '',
  });

  // Form Fields
  const [formData, setFormData] = useState<{
    employee_code: string;
    name: string;
    email: string;
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
  }>({
    employee_code: '',
    name: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    joining_date: '',
    monthly_ctc: '',
    bank_name: '',
    account_number: '',
    ifsc: '',
    pf_uan: '',
    tax_regime: 'new',
    active_status: true,
    pf_deduction: false,
    tax_deduction: true,
  });

  // HR Console States
  const [currentMainTab, setCurrentMainTab] = useState(0);
  const [currentSubTab, setCurrentSubTab] = useState(0);
  const [previewTagFilters, setPreviewTagFilters] = useState<PreviewTagFilter[]>([]);
  const [previewMonth, setPreviewMonth] = useState(getCurrentMonthValue);
  const [previewLogPage, setPreviewLogPage] = useState(0);
  const [previewLogRowsPerPage, setPreviewLogRowsPerPage] = useState(5);
  const [selectedConsoleEmp, setSelectedConsoleEmp] = useState<Employee | null>(null);
  const [consoleFormData, setConsoleFormData] = useState<{
    employee_code: string;
    name: string;
    no_of_days_present: number;
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
  }>({
    employee_code: '',
    name: '',
    no_of_days_present: 30,
    deduction_absent: '',
    appraisal: '',
    appraisal_effective_date: '',
    leave_encashment: '',
    late_arrival_deduction: '',
    damages_recovery: '',
    bonus_incentives: '',
    other_deductions: '',
    remarks: '',
    joining_date: '',
    relieving_date: '',
    other_inputs: '',
  });

  const isHRorAdmin = user && (user.role === Role.SUPER_ADMIN || user.role === Role.HR);
  const isFinance = user && user.role === Role.FINANCE;
  const canViewPreview = Boolean(isHRorAdmin || isFinance);
  const isAdmin = user && user.role === Role.SUPER_ADMIN;

  // Fetch employees
  const { data: employees = [], isLoading } = useQuery(['employees'], async () => {
    const res = await api.get('/employees');
    return res.data;
  });
  const activeEmployees = employees.filter((emp: Employee) => emp.active_status !== false);

  const { data: previewReview, isLoading: isPreviewReviewLoading } = useQuery(
    ['hrPreviewReview', previewMonth],
    async () => {
      const res = await api.get(`/employees/preview-review?month=${previewMonth}`);
      return res.data as PreviewReview;
    },
    { enabled: canViewPreview && Boolean(previewMonth) }
  );

  const [financeRemarksDraft, setFinanceRemarksDraft] = useState('');

  useEffect(() => {
    setFinanceRemarksDraft(previewReview?.finance_remarks || '');
  }, [previewReview?.finance_remarks]);

  useEffect(() => {
    setPreviewLogPage(0);
  }, [previewMonth, previewReview?.logs?.length]);

  useEffect(() => {
    if (!isFinance || previewReview?.status !== 'done') return;
    const notificationKey = `hr-preview-done-notified-${previewReview.month}-${previewReview.hr_marked_done_at || ''}`;
    if (localStorage.getItem(notificationKey)) return;
    showToast(`HR marked ${previewReview.month} preview as done for Finance review.`, 'success');
    localStorage.setItem(notificationKey, 'true');
  }, [isFinance, previewReview?.status, previewReview?.month, previewReview?.hr_marked_done_at, showToast]);

  // Manage Options States
  const [newDeptName, setNewDeptName] = useState('');
  const [newDesigName, setNewDesigName] = useState('');

  // Fetch departments
  const { data: departments = [] } = useQuery(['departments'], async () => {
    const res = await api.get('/employees/departments');
    return res.data;
  });

  // Fetch designations
  const { data: designations = [] } = useQuery(['designations'], async () => {
    const res = await api.get('/employees/designations');
    return res.data;
  });

  // Mutations for creating departments & designations
  const addDepartmentMutation = useMutation(
    async (name: string) => {
      const res = await api.post('/employees/departments', { name });
      return res.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['departments']);
        showToast('New department added successfully!', 'success');
      },
      onError: (err: any) => {
        showToast(err.response?.data?.message || 'Failed to add department', 'error');
      },
    }
  );

  const deleteDepartmentMutation = useMutation(
    async (id: number) => {
      const res = await api.delete(`/employees/departments/${id}`);
      return res.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['departments']);
        showToast('Department removed successfully!', 'success');
      },
      onError: (err: any) => {
        showToast(err.response?.data?.message || 'Failed to remove department', 'error');
      },
    }
  );

  const addDesignationMutation = useMutation(
    async (name: string) => {
      const res = await api.post('/employees/designations', { name });
      return res.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['designations']);
        showToast('New designation added successfully!', 'success');
      },
      onError: (err: any) => {
        showToast(err.response?.data?.message || 'Failed to add designation', 'error');
      },
    }
  );

  const deleteDesignationMutation = useMutation(
    async (id: number) => {
      const res = await api.delete(`/employees/designations/${id}`);
      return res.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['designations']);
        showToast('Designation removed successfully!', 'success');
      },
      onError: (err: any) => {
        showToast(err.response?.data?.message || 'Failed to remove designation', 'error');
      },
    }
  );

  const allDepartments = departments.map((d: any) => d.name);
  const allDesignations = designations.map((d: any) => d.name);

  const handleAddDept = async () => {
    const trimmed = newDeptName.trim();
    if (!trimmed) return;
    try {
      await addDepartmentMutation.mutateAsync(trimmed);
      setNewDeptName('');
    } catch (e) {}
  };

  const handleAddDesig = async () => {
    const trimmed = newDesigName.trim();
    if (!trimmed) return;
    try {
      await addDesignationMutation.mutateAsync(trimmed);
      setNewDesigName('');
    } catch (e) {}
  };

  // Profile Details Dialog State
  const [openProfileDialog, setOpenProfileDialog] = useState(false);
  const [profileDialogTab, setProfileDialogTab] = useState(0);

  const [profileEmpId, setProfileEmpId] = useState<number | ''>('');
  const currentYear = new Date().getFullYear();
  const defaultProfileStart = new Date().getMonth() >= 3 ? `${currentYear}-04-01` : `${currentYear - 1}-04-01`;
  const defaultProfileEnd = new Date().getMonth() >= 3 ? `${currentYear + 1}-03-31` : `${currentYear}-03-31`;

  const [profileStartDate, setProfileStartDate] = useState<string>(defaultProfileStart);
  const [profileEndDate, setProfileEndDate] = useState<string>(defaultProfileEnd);
  const [profileTenureAnchorEl, setProfileTenureAnchorEl] = useState<null | HTMLElement>(null);
  const [profileViewMode, setProfileViewMode] = useState<'annual' | 'monthly'>('annual');
  const [exportStartYear, setExportStartYear] = useState<number>(new Date().getFullYear() - 1);
  const [exportEndYear, setExportEndYear] = useState<number>(new Date().getFullYear());
  const [profileFormData, setProfileFormData] = useState<{
    employee_code: string;
    name: string;
    email: string;
    phone: string;
    department: string;
    designation: string;
    joining_date: string;
    bank_name: string;
    account_number: string;
    ifsc: string;
    pf_uan: string;
    tax_regime: string;
    active_status: boolean;
    pf_deduction: boolean;
    tax_deduction: boolean;
    relieving_date: string;
    other_inputs: string;
    no_of_days_present: number;
    deduction_absent: string | number;
    appraisal: string | number;
    appraisal_effective_date: string;
    leave_encashment: string | number;
    late_arrival_deduction: string | number;
    damages_recovery: string | number;
    bonus_incentives: string | number;
    other_deductions: string | number;
    remarks: string;
  }>({
    employee_code: '',
    name: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    joining_date: '',
    bank_name: '',
    account_number: '',
    ifsc: '',
    pf_uan: '',
    tax_regime: 'new',
    active_status: true,
    pf_deduction: true,
    tax_deduction: true,
    relieving_date: '',
    other_inputs: '',
    no_of_days_present: 30,
    deduction_absent: '',
    appraisal: '',
    appraisal_effective_date: '',
    leave_encashment: '',
    late_arrival_deduction: '',
    damages_recovery: '',
    bonus_incentives: '',
    other_deductions: '',
    remarks: '',
  });

  // Query for Detailed Employee Financial Summary
  const { data: profileSummary, isLoading: isLoadingProfileSummary } = useQuery(
    ['profileFinancialSummary', profileEmpId, profileStartDate, profileEndDate],
    async () => {
      if (!profileEmpId) return null;
      const res = await api.get(`/employees/${profileEmpId}/financial-summary?startDate=${profileStartDate}&endDate=${profileEndDate}`);
      return res.data;
    },
    {
      enabled: openProfileDialog && !!profileEmpId,
      onError: (err: any) => {
        showToast(err.response?.data?.message || 'Failed to fetch financial summary data', 'error');
      },
    }
  );

  // Synchronize console form data when the selected employee changes
  useEffect(() => {
    if (selectedConsoleEmp) {
      setConsoleFormData({
        employee_code: selectedConsoleEmp.employee_code || '',
        name: selectedConsoleEmp.name || '',
        no_of_days_present: selectedConsoleEmp.no_of_days_present !== undefined ? selectedConsoleEmp.no_of_days_present : 30,
        deduction_absent: selectedConsoleEmp.deduction_absent ? Number(selectedConsoleEmp.deduction_absent) : '',
        appraisal: selectedConsoleEmp.appraisal ? Number(selectedConsoleEmp.appraisal) : '',
        appraisal_effective_date: selectedConsoleEmp.appraisal_effective_date || '',
        leave_encashment: selectedConsoleEmp.leave_encashment ? Number(selectedConsoleEmp.leave_encashment) : '',
        late_arrival_deduction: selectedConsoleEmp.late_arrival_deduction ? Number(selectedConsoleEmp.late_arrival_deduction) : '',
        damages_recovery: selectedConsoleEmp.damages_recovery ? Number(selectedConsoleEmp.damages_recovery) : '',
        bonus_incentives: selectedConsoleEmp.bonus_incentives ? Number(selectedConsoleEmp.bonus_incentives) : '',
        other_deductions: selectedConsoleEmp.other_deductions ? Number(selectedConsoleEmp.other_deductions) : '',
        remarks: selectedConsoleEmp.remarks || '',
        joining_date: selectedConsoleEmp.joining_date || '',
        relieving_date: selectedConsoleEmp.relieving_date || '',
        other_inputs: selectedConsoleEmp.other_inputs || '',
      });
    }
  }, [selectedConsoleEmp]);

  // Keep selected console employee reference in sync with updated list
  useEffect(() => {
    if (selectedConsoleEmp && employees.length > 0) {
      const latest = employees.find((e: Employee) => e.id === selectedConsoleEmp.id);
      if (latest && JSON.stringify(latest) !== JSON.stringify(selectedConsoleEmp)) {
        setSelectedConsoleEmp(latest);
      }
    }
  }, [employees, selectedConsoleEmp]);

  // HR Console update mutation
  const saveConsoleMutation = useMutation(
    async ({ id, data }: { id: number; data: any }) => {
      const res = await api.put(`/employees/${id}`, data);
      return res.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['employees']);
        showToast('HR global inputs saved successfully!', 'success');
        setSelectedConsoleEmp(null);
      },
      onError: (err: any) => {
        showToast(err.response?.data?.message || 'Failed to update HR inputs', 'error');
      },
    }
  );

  // Effect to load employee details when profileEmpId is selected
  useEffect(() => {
    if (profileEmpId && employees.length > 0) {
      const emp = employees.find((e: any) => e.id === profileEmpId);
      if (emp) {
        setProfileFormData({
          employee_code: emp.employee_code || '',
          name: emp.name || '',
          email: emp.email || '',
          phone: emp.phone || '',
          department: emp.department || '',
          designation: emp.designation || '',
          joining_date: emp.joining_date || '',
          bank_name: emp.bank_name || '',
          account_number: emp.account_number || '',
          ifsc: emp.ifsc || '',
          pf_uan: emp.pf_uan || '',
          tax_regime: emp.tax_regime || 'new',
          active_status: emp.active_status !== false,
          pf_deduction: emp.pf_deduction !== false,
          tax_deduction: emp.tax_deduction !== false,
          relieving_date: emp.relieving_date || '',
          other_inputs: emp.other_inputs || '',
          no_of_days_present: emp.no_of_days_present !== undefined ? emp.no_of_days_present : 30,
          deduction_absent: emp.deduction_absent ? Number(emp.deduction_absent) : '',
          appraisal: emp.appraisal ? Number(emp.appraisal) : '',
          appraisal_effective_date: emp.appraisal_effective_date || '',
          leave_encashment: emp.leave_encashment ? Number(emp.leave_encashment) : '',
          late_arrival_deduction: emp.late_arrival_deduction ? Number(emp.late_arrival_deduction) : '',
          damages_recovery: emp.damages_recovery ? Number(emp.damages_recovery) : '',
          bonus_incentives: emp.bonus_incentives ? Number(emp.bonus_incentives) : '',
          other_deductions: emp.other_deductions ? Number(emp.other_deductions) : '',
          remarks: emp.remarks || '',
        });
      }
    }
  }, [profileEmpId, employees]);

  // Profile update mutation
  const updateProfileMutation = useMutation(
    async ({ id, payload }: { id: number; payload: any }) => {
      const res = await api.put(`/employees/${id}`, payload);
      return res.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['employees']);
        showToast('Employee profile details saved successfully!', 'success');
        setOpenProfileDialog(false);
      },
      onError: (err: any) => {
        showToast(err.response?.data?.message || 'Failed to update employee details', 'error');
      },
    }
  );

  const handleProfileFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileEmpId) return;
    
    const payload = {
      ...profileFormData,
      pf_uan: profileFormData.pf_uan.trim() || undefined,
      relieving_date: profileFormData.relieving_date || null,
      other_inputs: profileFormData.other_inputs || null,
      remarks: profileFormData.remarks || null,
      appraisal_effective_date: profileFormData.appraisal_effective_date || null,
    };

    updateProfileMutation.mutate({
      id: Number(profileEmpId),
      payload,
    });
  };

  const handleSaveConsoleData = () => {
    if (!selectedConsoleEmp) return;

    const daysPresent = Number(consoleFormData.no_of_days_present);
    if (isNaN(daysPresent) || daysPresent < 0 || daysPresent > 31) {
      showToast('Days present must be a valid number between 0 and 31', 'error');
      return;
    }

    const payload = {
      joining_date: consoleFormData.joining_date,
      relieving_date: consoleFormData.relieving_date || null,
      other_inputs: consoleFormData.other_inputs || null,
      no_of_days_present: daysPresent,
      deduction_absent: Number(consoleFormData.deduction_absent) || 0,
      appraisal: Number(consoleFormData.appraisal) || 0,
      appraisal_effective_date: consoleFormData.appraisal_effective_date || null,
      leave_encashment: Number(consoleFormData.leave_encashment) || 0,
      late_arrival_deduction: Number(consoleFormData.late_arrival_deduction) || 0,
      damages_recovery: Number(consoleFormData.damages_recovery) || 0,
      bonus_incentives: Number(consoleFormData.bonus_incentives) || 0,
      other_deductions: Number(consoleFormData.other_deductions) || 0,
      remarks: consoleFormData.remarks || null,
    };

    saveConsoleMutation.mutate({
      id: selectedConsoleEmp.id,
      data: payload,
    });
  };



  const handleMutationError = (err: any, fallbackMessage: string) => {
    const backendMessage = err.response?.data?.message;
    const errors = {
      employee_code: '',
      name: '',
      email: '',
      phone: '',
      department: '',
      designation: '',
      joining_date: '',
      bank_name: '',
      account_number: '',
      ifsc: '',
      pf_uan: '',
    };

    if (Array.isArray(backendMessage)) {
      backendMessage.forEach((msg: string) => {
        const lowerMsg = msg.toLowerCase();
        if (lowerMsg.includes('employee code') || lowerMsg.includes('code')) {
          errors.employee_code = msg;
        } else if (lowerMsg.includes('name')) {
          errors.name = msg;
        } else if (lowerMsg.includes('email')) {
          errors.email = msg;
        } else if (lowerMsg.includes('phone')) {
          errors.phone = msg;
        } else if (lowerMsg.includes('department')) {
          errors.department = msg;
        } else if (lowerMsg.includes('designation')) {
          errors.designation = msg;
        } else if (lowerMsg.includes('joining')) {
          errors.joining_date = msg;
        } else if (lowerMsg.includes('bank')) {
          errors.bank_name = msg;
        } else if (lowerMsg.includes('account')) {
          errors.account_number = msg;
        } else if (lowerMsg.includes('ifsc')) {
          errors.ifsc = msg;
        }
      });
      setFormErrors(errors);
      showToast('Please correct the highlighted validation errors.', 'error');
    } else {
      showToast(backendMessage || fallbackMessage, 'error');
    }
  };

  // Create employee mutation
  const createMutation = useMutation(
    async (newEmp: typeof formData) => {
      const res = await api.post('/employees', newEmp);
      return res.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['employees']);
        showToast('Employee registered successfully!', 'success');
        setOpenDialog(false);
      },
      onError: (err: any) => {
        handleMutationError(err, 'Failed to register employee');
      },
    }
  );

  // Update employee mutation
  const updateMutation = useMutation(
    async ({ id, data }: { id: number; data: Partial<Employee> }) => {
      const res = await api.put(`/employees/${id}`, data);
      return res.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['employees']);
        showToast('Employee profile updated!', 'success');
        setOpenDialog(false);
      },
      onError: (err: any) => {
        handleMutationError(err, 'Failed to update employee');
      },
    }
  );

  // Delete employee mutation
  const deleteMutation = useMutation(
    async (id: number) => {
      await api.delete(`/employees/${id}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['employees']);
        showToast('Employee record removed.', 'success');
      },
      onError: (err: any) => {
        showToast(err.response?.data?.message || 'Failed to delete employee', 'error');
      },
    }
  );

  const handleOpenAddDialog = () => {
    setSelectedEmp(null);
    setFormErrors({
      employee_code: '',
      name: '',
      email: '',
      phone: '',
      department: '',
      designation: '',
      joining_date: '',
      bank_name: '',
      account_number: '',
      ifsc: '',
      pf_uan: '',
    });
    setFormData({
      employee_code: `EMP${String(employees.length + 1).padStart(3, '0')}`,
      name: '',
      email: '',
      phone: '',
      department: '',
      designation: '',
      joining_date: new Date().toISOString().split('T')[0],
      monthly_ctc: '',
      bank_name: '',
      account_number: '',
      ifsc: '',
      pf_uan: '',
      tax_regime: 'new',
      active_status: true,
      pf_deduction: false,
      tax_deduction: true,
    });
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (emp: Employee) => {
    setSelectedEmp(emp);
    setFormErrors({
      employee_code: '',
      name: '',
      email: '',
      phone: '',
      department: '',
      designation: '',
      joining_date: '',
      bank_name: '',
      account_number: '',
      ifsc: '',
      pf_uan: '',
    });
    setFormData({
      employee_code: emp.employee_code,
      name: emp.name,
      email: emp.email,
      phone: emp.phone || '',
      department: emp.department,
      designation: emp.designation,
      joining_date: emp.joining_date,
      monthly_ctc: emp.monthly_ctc ? Number(emp.monthly_ctc) : '',
      bank_name: emp.bank_name,
      account_number: emp.account_number,
      ifsc: emp.ifsc,
      pf_uan: emp.pf_uan || '',
      tax_regime: emp.tax_regime || 'new',
      active_status: emp.active_status,
      pf_deduction: emp.pf_deduction !== false,
      tax_deduction: emp.tax_deduction !== false,
    });
    setOpenDialog(true);
  };

  const handleOpenProfileDialog = (emp: Employee) => {
    setProfileEmpId(emp.id);
    setProfileFormData({
      employee_code: emp.employee_code || '',
      name: emp.name || '',
      email: emp.email || '',
      phone: emp.phone || '',
      department: emp.department || '',
      designation: emp.designation || '',
      joining_date: emp.joining_date || '',
      bank_name: emp.bank_name || '',
      account_number: emp.account_number || '',
      ifsc: emp.ifsc || '',
      pf_uan: emp.pf_uan || '',
      tax_regime: emp.tax_regime || 'new',
      active_status: emp.active_status !== false,
      pf_deduction: emp.pf_deduction !== false,
      tax_deduction: emp.tax_deduction !== false,
      relieving_date: emp.relieving_date || '',
      other_inputs: emp.other_inputs || '',
      no_of_days_present: emp.no_of_days_present !== undefined ? emp.no_of_days_present : 30,
      deduction_absent: emp.deduction_absent ? Number(emp.deduction_absent) : '',
      appraisal: emp.appraisal ? Number(emp.appraisal) : '',
      appraisal_effective_date: emp.appraisal_effective_date || '',
      leave_encashment: emp.leave_encashment ? Number(emp.leave_encashment) : '',
      late_arrival_deduction: emp.late_arrival_deduction ? Number(emp.late_arrival_deduction) : '',
      damages_recovery: emp.damages_recovery ? Number(emp.damages_recovery) : '',
      bonus_incentives: emp.bonus_incentives ? Number(emp.bonus_incentives) : '',
      other_deductions: emp.other_deductions ? Number(emp.other_deductions) : '',
      remarks: emp.remarks || '',
    });
    setOpenProfileDialog(true);
  };

  // Effect to handle deep linking from global search (Layout)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const openProfileId = params.get('openProfile');
    const requestedTab = params.get('tab');
    if (requestedTab === 'directory') {
      setCurrentMainTab(0);
      setCurrentSubTab(0);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (openProfileId && employees.length > 0) {
      const emp = employees.find((e: any) => e.id === Number(openProfileId));
      if (emp) {
        setCurrentMainTab(0);
        handleOpenProfileDialog(emp);
        // Clear query parameter to avoid opening it repeatedly
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [employees, location.search]);

  useEffect(() => {
    const openDirectory = () => {
      setCurrentMainTab(0);
      setCurrentSubTab(0);
    };

    window.addEventListener('openEmployeeDirectory', openDirectory);
    return () => window.removeEventListener('openEmployeeDirectory', openDirectory);
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = {
      employee_code: '',
      name: '',
      email: '',
      phone: '',
      department: '',
      designation: '',
      joining_date: '',
      bank_name: '',
      account_number: '',
      ifsc: '',
      pf_uan: '',
    };
    let isValid = true;

    // Employee Code
    if (!formData.employee_code || formData.employee_code.trim().length < 3 || formData.employee_code.trim().length > 20) {
      nextErrors.employee_code = 'Employee code must be between 3 and 20 characters';
      isValid = false;
    }

    // Name
    if (!formData.name || formData.name.trim().length < 2 || formData.name.trim().length > 100) {
      nextErrors.name = 'Name must be between 2 and 100 characters';
      isValid = false;
    }

    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email.trim())) {
      nextErrors.email = 'Invalid email address format';
      isValid = false;
    }

    // Phone (optional)
    if (formData.phone && !/^\d{10}$/.test(formData.phone.trim())) {
      nextErrors.phone = 'Phone number must be numeric and exactly 10 digits';
      isValid = false;
    }

    // Department
    if (!formData.department) {
      nextErrors.department = 'Department is required';
      isValid = false;
    }

    // Designation
    if (!formData.designation) {
      nextErrors.designation = 'Designation is required';
      isValid = false;
    }

    // Joining Date
    if (!formData.joining_date) {
      nextErrors.joining_date = 'Joining date is required';
      isValid = false;
    }

    // Bank Name
    if (!formData.bank_name || formData.bank_name.trim().length < 2 || formData.bank_name.trim().length > 100) {
      nextErrors.bank_name = 'Bank name must be between 2 and 100 characters';
      isValid = false;
    }

    // Account Number
    if (!formData.account_number || !/^\d{9,18}$/.test(formData.account_number.trim())) {
      nextErrors.account_number = 'Account number must be numeric and between 9 and 18 digits';
      isValid = false;
    }

    // IFSC Code
    const ifscRegex = /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/;
    if (!formData.ifsc || !ifscRegex.test(formData.ifsc.trim())) {
      nextErrors.ifsc = 'Invalid IFSC code format (e.g. CHAS0001234)';
      isValid = false;
    }

    if (formData.pf_uan && (formData.pf_uan.trim().length < 5 || formData.pf_uan.trim().length > 50)) {
      nextErrors.pf_uan = 'PF No. / UAN must be between 5 and 50 characters';
      isValid = false;
    }

    setFormErrors(nextErrors);

    if (!isValid) {
      showToast('Please correct the highlighted validation errors.', 'error');
      return;
    }

    const payload: any = {
      ...formData,
      monthly_ctc: Number(formData.monthly_ctc) || 0,
      annual_ctc: (Number(formData.monthly_ctc) || 0) * 12,
    };
    if (formData.pf_uan.trim()) {
      payload.pf_uan = formData.pf_uan.trim();
    } else {
      delete payload.pf_uan;
    }

    if (selectedEmp) {
      updateMutation.mutate({ id: selectedEmp.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleExportCsv = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await api.get('/employees/csv', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `employee-master_${today}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(link.href), 100);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to export employees', 'error');
    }
  };

  const handleExportFinancials = async () => {
    if (!profileEmpId) return;
    try {
      const res = await api.get(`/employees/${profileEmpId}/export-financials?startDate=${profileStartDate}&endDate=${profileEndDate}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const employeeName = profileFormData.name ? profileFormData.name.replace(/\s+/g, '_') : 'employee';
      link.download = `${employeeName}_financials_${profileStartDate}_to_${profileEndDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(link.href), 100);
      showToast('Financial summary exported successfully', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to export financial summary', 'error');
    }
  };

  const handleDownloadSampleCsv = () => {
    const headers = [
      'Employee Code',
      'Name',
      'Email',
      'Phone',
      'Department',
      'Designation',
      'Joining Date',
      'Bank Name',
      'Account Number',
      'IFSC',
      'Tax Regime',
      'Active Status',
    ];
    const sampleRows = [
      ['EMP001', 'John Doe', 'john.doe@example.com', '9876543210', 'Engineering', 'Software Engineer', '2026-01-15', 'HDFC Bank', '50100234567891', 'HDFC0000123', 'new', 'Active'],
      ['EMP002', 'Jane Smith', 'jane.smith@example.com', '9876543211', 'Human Resources', 'HR Manager', '2026-02-01', 'ICICI Bank', '000401234567', 'ICIC0000004', 'old', 'Active']
    ];
    const csvContent = [headers.join(','), ...sampleRows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'sample_employee_import.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
  };

  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      try {
        const res = await api.post('/employees/import', { csvContent: text });
        const { imported, errors } = res.data;
        queryClient.invalidateQueries(['employees']);
        queryClient.invalidateQueries(['dashboardData']);
        if (errors && errors.length > 0) {
          showToast(`Imported ${imported} employees. There were ${errors.length} warnings/errors (see console details).`, 'error');
          console.warn('Import CSV warnings/errors:', errors);
        } else {
          showToast(`Successfully imported ${imported} employees!`, 'success');
        }
      } catch (err: any) {
        showToast(err.response?.data?.message || 'Failed to import CSV file.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredEmployees = employees.filter((emp: Employee) =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hasHrPreviewInput = (emp: Employee) =>
    Number(emp.no_of_days_present ?? 30) !== 30 ||
    Number(emp.deduction_absent || 0) > 0 ||
    Number(emp.appraisal || 0) > 0 ||
    Number(emp.leave_encashment || 0) > 0 ||
    Number(emp.late_arrival_deduction || 0) > 0 ||
    Number(emp.damages_recovery || 0) > 0 ||
    Number(emp.bonus_incentives || 0) > 0 ||
    Number(emp.other_deductions || 0) > 0 ||
    Boolean(emp.remarks?.trim()) ||
    Boolean(emp.relieving_date) ||
    Boolean(emp.other_inputs?.trim());

  const previewEmployees = activeEmployees
    .filter((emp: Employee) => hasHrPreviewInput(emp) || isEditedInMonth(emp, previewMonth))
    .filter((emp: Employee) => {
      if (previewTagFilters.length === 0) return true;
      return previewTagFilters.includes(getPreviewTag(emp, previewMonth));
    })
    .filter((emp: Employee) => {
      if (!previewMonth) return true;
      return isEditedInMonth(emp, previewMonth) || isRelievingInMonth(emp, previewMonth) || isOnNoticeInMonth(emp, previewMonth);
    });

  const togglePreviewTagFilter = (filter: PreviewTagFilter) => {
    setPreviewTagFilters((current) =>
      current.includes(filter)
        ? current.filter((item) => item !== filter)
        : [...current, filter]
    );
  };

  const updatePreviewStatusMutation = useMutation(
    async (status: 'done' | 'undone') => {
      const res = await api.put('/employees/preview-review/status', { month: previewMonth, status });
      return res.data as PreviewReview;
    },
    {
      onSuccess: (_, status) => {
        queryClient.invalidateQueries(['hrPreviewReview', previewMonth]);
        showToast(status === 'done' ? 'Preview sheet marked as done. Finance has been notified.' : 'Preview sheet marked as undone.', 'success');
      },
      onError: (err: any) => {
        showToast(err.response?.data?.message || 'Failed to update preview status', 'error');
      },
    }
  );

  const updateFinanceRemarksMutation = useMutation(
    async () => {
      const res = await api.put('/employees/preview-review/finance-remarks', {
        month: previewMonth,
        finance_remarks: financeRemarksDraft,
      });
      return res.data as PreviewReview;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['hrPreviewReview', previewMonth]);
        showToast('Finance remarks saved.', 'success');
      },
      onError: (err: any) => {
        showToast(err.response?.data?.message || 'Failed to save finance remarks', 'error');
      },
    }
  );

  const previewValue = (value?: string | number | null) => {
    if (value === null || value === undefined || value === '') return '-';
    return String(value);
  };
  const previewAmount = (value?: number) => Number(value || 0) > 0 ? Number(value).toLocaleString('en-IN') : '-';
  const previewLogs = [...(previewReview?.logs || [])].reverse();
  const paginatedPreviewLogs = previewLogs.slice(
    previewLogPage * previewLogRowsPerPage,
    previewLogPage * previewLogRowsPerPage + previewLogRowsPerPage,
  );
  const previewLogText = (log: NonNullable<PreviewReview['logs']>[number]) => {
    if (log.action === 'status_changed') {
      return `Status changed from ${log.from || '-'} to ${log.to || '-'}`;
    }
    if (log.action === 'finance_remarks_updated') {
      return `Finance remarks updated${log.remarks ? `: ${log.remarks}` : ''}`;
    }
    return log.action.replace(/_/g, ' ');
  };

  const departmentOptions = withCurrentOption(allDepartments, formData.department);
  const designationOptions = withCurrentOption(allDesignations, formData.designation);

  const profileDeptOptions = withCurrentOption(allDepartments, profileFormData.department);
  const profileDesigOptions = withCurrentOption(allDesignations, profileFormData.designation);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)' }}>
            Employees
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mt: 0.5 }}>
            Manage employee directory profiles, bank configuration, and annual financial summaries.
          </Typography>
        </Box>
      </Box>

      {canViewPreview && !previewOnly && (
        <Box sx={{ borderBottom: 1, borderColor: 'var(--color-border)', mb: 3 }}>
          <Tabs
            value={currentMainTab}
            onChange={(_, newValue) => setCurrentMainTab(newValue)}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontFamily: 'Outfit',
                fontSize: '0.95rem',
                color: 'var(--color-text-secondary)',
                '&.Mui-selected': {
                  color: 'var(--color-primary-hover)',
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: 'var(--color-primary)',
              },
            }}
          >
            {isHRorAdmin && <Tab label="Employee Directory" />}
            {/* <Tab label="HR Global Console" /> */}
            <Tab label="Preview" />
            {isHRorAdmin && <Tab label="Manage Options" />}
          </Tabs>
        </Box>
      )}

      {(!previewOnly && ((!isHRorAdmin && !isFinance) || (isHRorAdmin && currentMainTab === 0))) ? (
        <>
          {/* Employee Directory View */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 3 }}>
            <input
              type="file"
              accept=".csv"
              id="import-csv-file-input"
              style={{ display: 'none' }}
              onChange={handleImportCsv}
            />
            {isHRorAdmin && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownloadSampleCsv}
                  sx={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    textTransform: 'none',
                    borderRadius: 'var(--radius-control)',
                    '&:hover': {
                      borderColor: 'var(--color-border-strong)',
                      bgcolor: 'var(--color-surface-subtle)',
                      color: 'var(--color-text-primary)',
                    },
                  }}
                >
                  Sample CSV
                </Button>
                <label htmlFor="import-csv-file-input">
                  <Button
                    component="span"
                    variant="outlined"
                    startIcon={<UploadIcon />}
                    sx={{
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-secondary)',
                      textTransform: 'none',
                      borderRadius: 'var(--radius-control)',
                      cursor: 'pointer',
                      '&:hover': {
                        borderColor: 'var(--color-border-strong)',
                        bgcolor: 'var(--color-surface-subtle)',
                        color: 'var(--color-text-primary)',
                      },
                    }}
                  >
                    Import CSV
                  </Button>
                </label>
              </>
            )}
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportCsv}
              sx={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
                textTransform: 'none',
                borderRadius: 'var(--radius-control)',
                '&:hover': {
                  borderColor: 'var(--color-border-strong)',
                  bgcolor: 'var(--color-surface-subtle)',
                  color: 'var(--color-text-primary)',
                },
              }}
            >
              Export CSV
            </Button>
            {isHRorAdmin && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenAddDialog}
                sx={{
                  background: 'var(--color-primary)',
                  boxShadow: '0 8px 18px rgba(99, 102, 241, 0.22)',
                  borderRadius: 'var(--radius-control)',
                  textTransform: 'none',
                }}
              >
                Add Employee
              </Button>
            )}
          </Box>

          {/* Filter and Table */}
          <Paper
            sx={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-card)',
              overflow: 'hidden',
              p: 3,
            }}
          >
            <TextField
              placeholder="Search by name, employee code, or department..."
              fullWidth
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(0);
              }}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'var(--color-text-muted)', mr: 1 }} />,
              }}
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  color: 'var(--color-text-primary)',
                  borderRadius: 'var(--radius-control)',
                  '& fieldset': { borderColor: 'var(--color-border)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--color-primary)' },
                },
              }}
            />

            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={40} sx={{ color: 'var(--color-primary)' }} />
              </Box>
            ) : filteredEmployees.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No employees found matching the search criteria.
              </Box>
            ) : (
              <>
                <TableContainer>
                <Table sx={{ minWidth: 650 }}>
                  <TableHead sx={{ bgcolor: 'var(--color-surface-subtle)' }}>
                    <TableRow>
                      <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Code</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Name</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Email</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Department</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Designation</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Status</TableCell>
                      <TableCell align="right" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredEmployees.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((emp: Employee) => (
                      <TableRow
                        key={emp.id}
                        onClick={() => handleOpenProfileDialog(emp)}
                        sx={{
                          '&:last-child td, &:last-child th': { border: 0 },
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'var(--color-row-hover)' },
                          transition: 'background-color 140ms ease',
                        }}
                      >
                        <TableCell component="th" scope="row" sx={{ color: 'var(--color-text-primary)' }}>{emp.employee_code}</TableCell>
                        <TableCell sx={{ color: 'var(--color-text-primary)' }}>{emp.name}</TableCell>
                        <TableCell sx={{ color: 'var(--color-text-primary)' }}>{emp.email}</TableCell>
                        <TableCell sx={{ color: 'var(--color-text-primary)' }}>{emp.department}</TableCell>
                        <TableCell sx={{ color: 'var(--color-text-primary)' }}>{emp.designation}</TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              display: 'inline-block',
                              px: 1.5,
                              py: 0.5,
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              bgcolor: emp.active_status ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                              color: emp.active_status ? 'var(--color-success)' : 'var(--color-error)',
                            }}
                          >
                            {emp.active_status ? 'Active' : 'Inactive'}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="View Profile & Financials">
                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenProfileDialog(emp);
                              }}
                              sx={{ color: 'var(--color-text-secondary)', '&:hover': { color: 'var(--color-primary)' }, mr: 0.5 }}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Details">
                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditDialog(emp);
                              }}
                              sx={{ color: 'var(--color-text-secondary)', '&:hover': { color: 'var(--color-primary)' } }}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          {isHRorAdmin && (
                            <Tooltip title="Delete Employee">
                              <IconButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(emp.id);
                                }}
                                sx={{ color: 'var(--color-text-secondary)', '&:hover': { color: 'var(--color-error)' } }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[10, 25, 50]}
                component="div"
                count={filteredEmployees.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                sx={{
                  color: 'var(--color-text-primary)',
                  borderTop: '1px solid var(--color-border)',
                  '& .MuiTablePagination-actions': {
                    color: 'var(--color-text-primary)',
                  },
                  '& .MuiTablePagination-select': {
                    color: 'var(--color-text-primary)',
                  },
                }}
              />
            </>
          )}
          </Paper>
        </>
      ) : previewOnly || currentMainTab === 1 || isFinance ? (
      //   /* HR Global Console View */
      //   <Box className="animate-fade-in">
      //     <Paper
      //       sx={{
      //         background: 'var(--color-surface)',
      //         border: '1px solid var(--color-border)',
      //         borderRadius: 'var(--radius-card)',
      //         p: 4,
      //         mb: 4,
      //       }}
      //     >
      //       <Typography variant="h6" fontFamily="Outfit" fontWeight={600} sx={{ color: 'var(--color-text-primary)', mb: 1 }}>
      //         Employee Search & Selector
      //       </Typography>
      //       <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mb: 3 }}>
      //         Select an employee to modify their operational, salary, lifecycle, and leave adjustments globally.
      //       </Typography>
      //       <Autocomplete
      //         options={activeEmployees}
      //         getOptionLabel={(emp) => `${emp.employee_code} - ${emp.name}`}
      //         value={selectedConsoleEmp}
      //         onChange={(_, newValue) => setSelectedConsoleEmp(newValue)}
      //         renderInput={(params) => (
      //           <TextField
      //             {...params}
      //             label="Select Employee"
      //             placeholder="Search by code or name..."
      //             sx={inputStyles}
      //           />
      //         )}
      //         ListboxProps={{ sx: dropdownListStyles }}
      //       />
      //     </Paper>

      //     {!selectedConsoleEmp ? (
      //       <Paper
      //         sx={{
      //           p: 6,
      //           textAlign: 'center',
      //           border: '1px dashed var(--color-border)',
      //           background: 'var(--color-surface)',
      //           borderRadius: 'var(--radius-card)',
      //           color: 'var(--color-text-secondary)',
      //         }}
      //       >
      //         <PeopleIcon sx={{ fontSize: 56, color: 'var(--color-text-muted)', mb: 2 }} />
      //         <Typography variant="h6" fontFamily="Outfit" fontWeight={600} gutterBottom sx={{ color: 'var(--color-text-primary)' }}>
      //           No Employee Selected
      //         </Typography>
      //         <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', maxW: '400px', mx: 'auto' }}>
      //           Search for an employee using the selector above to manage their global inputs, including attendance, deductions, appraisals, relieving dates, and exceptions.
      //         </Typography>
      //       </Paper>
      //     ) : (
      //       <Paper
      //         sx={{
      //           background: 'var(--color-surface)',
      //           border: '1px solid var(--color-border)',
      //           borderRadius: 'var(--radius-card)',
      //           p: 4,
      //         }}
      //       >
      //         <Box sx={{ borderBottom: 1, borderColor: 'var(--color-border)', mb: 4 }}>
      //           <Tabs
      //             value={currentSubTab}
      //             onChange={(_, newValue) => setCurrentSubTab(newValue)}
      //             sx={{
      //               '& .MuiTab-root': {
      //                 textTransform: 'none',
      //                 fontWeight: 700,
      //                 fontFamily: 'Outfit',
      //                 fontSize: '1rem',
      //                 color: 'var(--color-text-secondary)',
      //                 pb: 1.5,
      //                 '&.Mui-selected': {
      //                   color: 'var(--color-primary-hover)',
      //                 },
      //               },
      //               '& .MuiTabs-indicator': {
      //                 backgroundColor: 'var(--color-primary)',
      //                 height: 3,
      //                 borderRadius: '3px 3px 0 0',
      //               },
      //             }}
      //           >
      //             <Tab label="1st Tab: Attendance & Monthly Operations" />
      //             <Tab label="2nd Tab: Lifecycle & Joinings/Relieving" />
      //           </Tabs>
      //         </Box>

      //         {currentSubTab === 0 ? (
      //           /* Sub Tab 1: Operational Adjustments */
      //           <Box className="animate-fade-in">
      //             <Grid container spacing={3.5}>
      //               <Grid item xs={12} md={6}>
      //                 <TextField
      //                   label="Employee Code"
      //                   fullWidth
      //                   disabled
      //                   value={consoleFormData.employee_code}
      //                   sx={inputStyles}
      //                 />
      //               </Grid>
      //               <Grid item xs={12} md={6}>
      //                 <TextField
      //                   label="Employee Name"
      //                   fullWidth
      //                   disabled
      //                   value={consoleFormData.name}
      //                   sx={inputStyles}
      //                 />
      //               </Grid>
      //               <Grid item xs={12} md={6}>
      //                 <TextField
      //                   label="No Of day Present"
      //                   type="number"
      //                   fullWidth
      //                   value={consoleFormData.no_of_days_present}
      //                   onChange={(e) =>
      //                     setConsoleFormData({ ...consoleFormData, no_of_days_present: Number(e.target.value) })
      //                   }
      //                   sx={inputStyles}
      //                   inputProps={{ min: 0, max: 31 }}
      //                 />
      //               </Grid>
      //               <Grid item xs={12} md={6}>
      //                 <TextField
      //                   label="Deduction (Absent)"
      //                   type="number"
      //                   fullWidth
      //                   value={consoleFormData.deduction_absent === 0 ? '' : consoleFormData.deduction_absent}
      //                   onChange={(e) =>
      //                     setConsoleFormData({ ...consoleFormData, deduction_absent: parseFloat(e.target.value) || 0 })
      //                   }
      //                   sx={inputStyles}
      //                   inputProps={{ min: 0 }}
      //                 />
      //               </Grid>
      //               <Grid item xs={12} md={6}>
      //                 <TextField
      //                   label="Appraisal"
      //                   type="number"
      //                   fullWidth
      //                   value={consoleFormData.appraisal === 0 ? '' : consoleFormData.appraisal}
      //                   onChange={(e) =>
      //                     setConsoleFormData({ ...consoleFormData, appraisal: parseFloat(e.target.value) || 0 })
      //                   }
      //                   sx={inputStyles}
      //                   inputProps={{ min: 0 }}
      //                 />
      //               </Grid>
      //               <Grid item xs={12} md={6}>
      //                 <TextField
      //                   label="Appraisal Effective Date"
      //                   type="date"
      //                   fullWidth
      //                   value={consoleFormData.appraisal_effective_date}
      //                   onChange={(e) =>
      //                     setConsoleFormData({ ...consoleFormData, appraisal_effective_date: e.target.value })
      //                   }
      //                   sx={inputStyles}
      //                   InputLabelProps={{ shrink: true }}
      //                 />
      //               </Grid>
      //               <Grid item xs={12} md={6}>
      //                 <TextField
      //                   label="Leave Encashment"
      //                   type="number"
      //                   fullWidth
      //                   value={consoleFormData.leave_encashment === 0 ? '' : consoleFormData.leave_encashment}
      //                   onChange={(e) =>
      //                     setConsoleFormData({ ...consoleFormData, leave_encashment: parseFloat(e.target.value) || 0 })
      //                   }
      //                   sx={inputStyles}
      //                   inputProps={{ min: 0 }}
      //                 />
      //               </Grid>
      //               <Grid item xs={12} md={6}>
      //                 <TextField
      //                   label="Late Arrival Deduction (depends on days, not on numbers)"
      //                   type="number"
      //                   fullWidth
      //                   value={consoleFormData.late_arrival_deduction === 0 ? '' : consoleFormData.late_arrival_deduction}
      //                   onChange={(e) =>
      //                     setConsoleFormData({ ...consoleFormData, late_arrival_deduction: parseFloat(e.target.value) || 0 })
      //                   }
      //                   sx={inputStyles}
      //                   inputProps={{ min: 0 }}
      //                 />
      //               </Grid>
      //               <Grid item xs={12} md={6}>
      //                 <TextField
      //                   label="Damages Recovery"
      //                   type="number"
      //                   fullWidth
      //                   value={consoleFormData.damages_recovery === 0 ? '' : consoleFormData.damages_recovery}
      //                   onChange={(e) =>
      //                     setConsoleFormData({ ...consoleFormData, damages_recovery: parseFloat(e.target.value) || 0 })
      //                   }
      //                   sx={inputStyles}
      //                   inputProps={{ min: 0 }}
      //                 />
      //               </Grid>
      //               <Grid item xs={12} md={6}>
      //                 <TextField
      //                   label="Bonus / Incentives"
      //                   type="number"
      //                   fullWidth
      //                   value={consoleFormData.bonus_incentives === 0 ? '' : consoleFormData.bonus_incentives}
      //                   onChange={(e) =>
      //                     setConsoleFormData({ ...consoleFormData, bonus_incentives: parseFloat(e.target.value) || 0 })
      //                   }
      //                   sx={inputStyles}
      //                   inputProps={{ min: 0 }}
      //                 />
      //               </Grid>
      //               <Grid item xs={12} md={6}>
      //                 <TextField
      //                   label="Other Deductions"
      //                   type="number"
      //                   fullWidth
      //                   value={consoleFormData.other_deductions === 0 ? '' : consoleFormData.other_deductions}
      //                   onChange={(e) =>
      //                     setConsoleFormData({ ...consoleFormData, other_deductions: parseFloat(e.target.value) || 0 })
      //                   }
      //                   sx={inputStyles}
      //                   inputProps={{ min: 0 }}
      //                 />
      //               </Grid>
      //               <Grid item xs={12}>
      //                 <TextField
      //                   label="Remarks"
      //                   fullWidth
      //                   multiline
      //                   minRows={2}
      //                   maxRows={10}
      //                   value={consoleFormData.remarks}
      //                   onChange={(e) => setConsoleFormData({ ...consoleFormData, remarks: e.target.value })}
      //                   sx={inputStyles}
      //                 />
      //               </Grid>
      //             </Grid>
      //           </Box>
      //         ) : (
      //           /* Sub Tab 2: Lifecycle Adjustments */
      //           <Box className="animate-fade-in">
      //             <Grid container spacing={3.5}>
      //               <Grid item xs={12} md={6}>
      //                 <TextField
      //                   label="Joinings (Joining Date)"
      //                   type="date"
      //                   fullWidth
      //                   InputLabelProps={{ shrink: true }}
      //                   value={consoleFormData.joining_date}
      //                   onChange={(e) => setConsoleFormData({ ...consoleFormData, joining_date: e.target.value })}
      //                   sx={inputStyles}
      //                 />
      //               </Grid>
      //               <Grid item xs={12} md={6}>
      //                 <TextField
      //                   label="Relieving (Relieving Date)"
      //                   type="date"
      //                   fullWidth
      //                   InputLabelProps={{ shrink: true }}
      //                   value={consoleFormData.relieving_date || ''}
      //                   onChange={(e) => setConsoleFormData({ ...consoleFormData, relieving_date: e.target.value })}
      //                   sx={inputStyles}
      //                 />
      //               </Grid>
      //               <Grid item xs={12}>
      //                 <TextField
      //                   label="Other Inputs (Maternity, Career Break, Extra Info, etc.)"
      //                   fullWidth
      //                   multiline
      //                   rows={5}
      //                   placeholder="Enter extra information, exceptions, career breaks, etc."
      //                   value={consoleFormData.other_inputs}
      //                   onChange={(e) => setConsoleFormData({ ...consoleFormData, other_inputs: e.target.value })}
      //                   sx={inputStyles}
      //                 />
      //               </Grid>
      //             </Grid>
      //           </Box>
      //         )}

      //         <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 5 }}>
      //           <Button
      //             variant="contained"
      //             onClick={handleSaveConsoleData}
      //             disabled={saveConsoleMutation.isLoading}
      //             sx={{
      //               background: 'var(--color-primary)',
      //               boxShadow: '0 8px 18px rgba(99, 102, 241, 0.22)',
      //               borderRadius: 'var(--radius-control)',
      //               px: 5,
      //               py: 1.4,
      //               fontWeight: 700,
      //               textTransform: 'none',
      //               transition: 'all 160ms ease',
      //               '&:hover': {
      //                 background: 'var(--color-primary-hover)',
      //                 boxShadow: '0 12px 24px rgba(99, 102, 241, 0.28)',
      //                 transform: 'translateY(-1px)',
      //               },
      //               '&:active': {
      //                 transform: 'translateY(1px)',
      //               },
      //             }}
      //           >
      //             {saveConsoleMutation.isLoading ? 'Saving...' : 'Save Inputs Globally'}
      //           </Button>
      //         </Box>
      //       </Paper>
      //     )}
      //   </Box>
      // ) : currentMainTab === 2 ? (
        /* HR Inputs Preview View */
        <Paper
          className="animate-fade-in"
          sx={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-card)',
            overflow: 'hidden',
            p: 3,
          }}
        >
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" fontFamily="Outfit" fontWeight={600} sx={{ color: 'var(--color-text-primary)' }}>
              Edited Employee Inputs Preview
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mt: 0.5 }}>
              Employees with non-default HR operation or lifecycle inputs appear here.
            </Typography>
          </Box>

          <Paper
            elevation={0}
            sx={{
              mb: 3,
              p: 2,
              bgcolor: 'var(--color-surface-subtle)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-control)',
            }}
          >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>
                  HR Preview Status
                </Typography>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mt: 0.25 }}>
                  {isPreviewReviewLoading
                    ? 'Loading review status...'
                    : previewReview?.status === 'done'
                      ? `Marked done${previewReview.hr_marked_done_at ? ` on ${new Date(previewReview.hr_marked_done_at).toLocaleString()}` : ''}.`
                      : 'Marked undone. Finance should wait for HR completion.'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip
                  label={previewReview?.status === 'done' ? 'Done' : 'Undone'}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    color: previewReview?.status === 'done' ? 'var(--color-success)' : 'var(--color-warning)',
                    bgcolor: previewReview?.status === 'done' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                    border: `1px solid ${previewReview?.status === 'done' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                  }}
                />
                {isHRorAdmin && (
                  <Button
                    variant="contained"
                    disabled={updatePreviewStatusMutation.isLoading}
                    onClick={() => updatePreviewStatusMutation.mutate(previewReview?.status === 'done' ? 'undone' : 'done')}
                    sx={{
                      background: previewReview?.status === 'done' ? 'var(--color-warning)' : 'var(--color-primary)',
                      borderRadius: 'var(--radius-control)',
                      textTransform: 'none',
                    }}
                  >
                    {previewReview?.status === 'done' ? 'Mark Undone' : 'Mark Done'}
                  </Button>
                )}
              </Box>
            </Box>

            {isFinance && previewReview?.status === 'done' && (
              <Box sx={{ mb: 2, p: 1.5, borderRadius: 'var(--radius-control)', bgcolor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.22)', color: 'var(--color-success)', fontSize: '0.875rem', fontWeight: 600 }}>
                HR has marked this preview sheet as done. Please review and add remarks if corrections are needed.
              </Box>
            )}

            <Grid container spacing={2} alignItems="flex-start">
              <Grid item xs={12} md={9}>
                <TextField
                  label="Finance Remarks"
                  placeholder="Comment any mistake or correction needed in this sheet..."
                  fullWidth
                  multiline
                  minRows={2}
                  maxRows={6}
                  value={financeRemarksDraft}
                  onChange={(e) => setFinanceRemarksDraft(e.target.value)}
                  disabled={!isFinance && !isAdmin}
                  sx={inputStyles}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  disabled={(!isFinance && !isAdmin) || updateFinanceRemarksMutation.isLoading}
                  onClick={() => updateFinanceRemarksMutation.mutate()}
                  sx={{
                    mt: { xs: 0, md: 1 },
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                    borderRadius: 'var(--radius-control)',
                    textTransform: 'none',
                  }}
                >
                  Save Remarks
                </Button>
              </Grid>
            </Grid>

            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid var(--color-border)' }}>
              <Typography variant="subtitle2" sx={{ color: 'var(--color-text-primary)', fontWeight: 700, mb: 1 }}>
                Sheet Activity Logs
              </Typography>
              {previewLogs.length > 0 ? (
                <Box>
                  <Box sx={{ display: 'grid', gap: 1 }}>
                    {paginatedPreviewLogs.map((log, index) => (
                      <Box
                        key={`${log.created_at}-${previewLogPage}-${index}`}
                        sx={{
                          p: 1.25,
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-control)',
                          bgcolor: 'var(--color-surface)',
                        }}
                      >
                        <Typography variant="body2" sx={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
                          {previewLogText(log)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>
                          {new Date(log.created_at).toLocaleString()}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  <TablePagination
                    component="div"
                    count={previewLogs.length}
                    page={previewLogPage}
                    rowsPerPage={previewLogRowsPerPage}
                    rowsPerPageOptions={[5, 10, 25]}
                    onPageChange={(_, nextPage) => setPreviewLogPage(nextPage)}
                    onRowsPerPageChange={(event) => {
                      setPreviewLogRowsPerPage(parseInt(event.target.value, 10));
                      setPreviewLogPage(0);
                    }}
                    sx={{
                      color: 'var(--color-text-primary)',
                      borderTop: '1px solid var(--color-border)',
                      mt: 1,
                      '& .MuiTablePagination-actions': {
                        color: 'var(--color-text-primary)',
                      },
                      '& .MuiTablePagination-select': {
                        color: 'var(--color-text-primary)',
                      },
                    }}
                  />
                </Box>
              ) : (
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                  No activity logs yet.
                </Typography>
              )}
            </Box>
          </Paper>

          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 2,
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 3,
              p: 2,
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-control)',
              bgcolor: 'var(--color-surface-subtle)',
            }}
          >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={previewTagFilters.length === 0}
                    onChange={() => setPreviewTagFilters([])}
                    sx={{ color: 'var(--color-text-muted)', '&.Mui-checked': { color: 'var(--color-primary)' } }}
                  />
                }
                label="All"
                sx={{ color: 'var(--color-text-primary)', '& .MuiFormControlLabel-label': { fontSize: '0.9rem' } }}
              />
                <FormControlLabel
                control={
                  <Checkbox
                    checked={previewTagFilters.includes('new')}
                    onChange={() => togglePreviewTagFilter('new')}
                    sx={{ color: 'var(--color-text-muted)', '&.Mui-checked': { color: 'var(--color-primary)' } }}
                  />
                }
                label="New"
                sx={{ color: 'var(--color-text-primary)', '& .MuiFormControlLabel-label': { fontSize: '0.9rem' } }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={previewTagFilters.includes('old')}
                    onChange={() => togglePreviewTagFilter('old')}
                    sx={{ color: 'var(--color-text-muted)', '&.Mui-checked': { color: 'var(--color-primary)' } }}
                  />
                }
                label="Old"
                sx={{ color: 'var(--color-text-primary)', '& .MuiFormControlLabel-label': { fontSize: '0.9rem' } }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={previewTagFilters.includes('on_notice')}
                    onChange={() => togglePreviewTagFilter('on_notice')}
                    sx={{ color: 'var(--color-text-muted)', '&.Mui-checked': { color: 'var(--color-primary)' } }}
                  />
                }
                label="On Notice"
                sx={{ color: 'var(--color-text-primary)', '& .MuiFormControlLabel-label': { fontSize: '0.9rem' } }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={previewTagFilters.includes('relieving')}
                    onChange={() => togglePreviewTagFilter('relieving')}
                    sx={{ color: 'var(--color-text-muted)', '&.Mui-checked': { color: 'var(--color-primary)' } }}
                  />
                }
                label="Relieving"
                sx={{ color: 'var(--color-text-primary)', '& .MuiFormControlLabel-label': { fontSize: '0.9rem' } }}
              />
            
            </Box>
            <TextField
              type="month"
              label="Filter by edit/relieving month"
              value={previewMonth}
              onChange={(e) => setPreviewMonth(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={{ ...inputStyles, minWidth: 190 }}
            />
          </Box>

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={40} sx={{ color: 'var(--color-primary)' }} />
            </Box>
          ) : previewEmployees.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No edited employee inputs found.
            </Box>
          ) : (
            <TableContainer>
              <Table sx={{ minWidth: 1500 }}>
                <TableHead sx={{ bgcolor: 'var(--color-surface-subtle)' }}>
                  
                  <TableRow>
                    {[
                      'Employee Code',
                      'Employee Name',
                      'Tags',
                      'No Of day Present',
                      'Deduction (Absent)',
                      'Appraisal',
                      'Bonus / Incentives',
                      'Leave Encashment',
                      'Late Arrival Deduction (depends on days, not on numbers)',
                      'Damages Recovery',
                      'Other Deductions',
                      'Remarks',
                    ].map((header) => (
                      <TableCell key={header} sx={{ color: 'var(--color-text-secondary)', fontWeight: 600, verticalAlign: 'top' }}>
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewEmployees.map((emp: Employee) => (
                    <TableRow
                      key={emp.id}
                      hover
                      sx={{
                        '&:last-child td, &:last-child th': { border: 0 },
                        '&:hover': { bgcolor: 'var(--color-row-hover)' },
                      }}
                    >
                      <TableCell sx={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{emp.employee_code}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)' }}>{emp.name}</TableCell>
                      <TableCell sx={{ minWidth: 140 }}>
                        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                          {(() => {
                            const tag = getPreviewTag(emp, previewMonth);
                            const meta = getPreviewTagMeta(tag);
                            return (
                            <Chip
                              key={tag}
                              label={meta.label}
                              size="small"
                              sx={{
                                height: 24,
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                textTransform: 'capitalize',
                                color: meta.color,
                                bgcolor: meta.bgcolor,
                                border: `1px solid ${meta.border}`,
                              }}
                            />
                            );
                          })()}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)' }}>{previewValue(emp.no_of_days_present ?? 30)}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)' }}>{previewAmount(emp.deduction_absent)}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)' }}>{previewAmount(emp.appraisal)}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)' }}>{previewAmount(emp.bonus_incentives)}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)' }}>{previewAmount(emp.leave_encashment)}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)' }}>{previewAmount(emp.late_arrival_deduction)}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)' }}>{previewAmount(emp.damages_recovery)}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)' }}>{previewAmount(emp.other_deductions)}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-primary)', minWidth: 260 }}>
                        <PreviewRemarks remarks={emp.remarks} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      ) : (
        /* Manage Options View */
        <Grid
          container
          spacing={3}
          className="animate-fade-in"
          sx={{
            '& .manage-options-title': { fontSize: '17px' },
            '& .manage-options-copy': { fontSize: '11px' },
            '& .manage-options-name': { fontSize: '13px' },
            '& .MuiInputBase-input': { fontSize: '13px' },
            '& .MuiButton-root': { fontSize: '11px' },
          }}
        >
          {/* Department management column */}
          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-card)',
                p: 4,
              }}
            >
              <Typography className="manage-options-title" variant="h6" fontFamily="Outfit" fontWeight={600} sx={{ color: 'var(--color-text-primary)', mb: 1 }}>
                Manage Departments
              </Typography>
              <Typography className="manage-options-copy" variant="body2" sx={{ color: 'var(--color-text-secondary)', mb: 3 }}>
                Add new departments or remove existing ones. Removed departments will no longer appear in employee forms.
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <TextField
                  placeholder="New department name..."
                  fullWidth
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  sx={inputStyles}
                />
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddDept}
                  sx={{
                    background: 'var(--color-primary)',
                    borderRadius: 'var(--radius-control)',
                    textTransform: 'none',
                    px: 3,
                  }}
                >
                  Add
                </Button>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: '400px', overflowY: 'auto' }}>
                {departments.map((dept: any) => (
                  <Box
                    key={dept.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 2,
                      borderRadius: 'var(--radius-control)',
                      border: '1px solid var(--color-border)',
                      bgcolor: 'var(--color-surface-subtle)',
                    }}
                  >
                    <Typography className="manage-options-name" sx={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
                      {dept.name}
                    </Typography>
                    <IconButton
                      onClick={() => deleteDepartmentMutation.mutate(dept.id)}
                      sx={{ color: 'var(--color-text-secondary)', '&:hover': { color: 'var(--color-error)' } }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}
                {departments.length === 0 && (
                  <Typography className="manage-options-name" sx={{ color: 'var(--color-text-muted)', py: 2, textAlign: 'center' }}>
                    No departments added yet.
                  </Typography>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Designation management column */}
          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-card)',
                p: 4,
              }}
            >
              <Typography className="manage-options-title" variant="h6" fontFamily="Outfit" fontWeight={600} sx={{ color: 'var(--color-text-primary)', mb: 1 }}>
                Manage Designations
              </Typography>
              <Typography className="manage-options-copy" variant="body2" sx={{ color: 'var(--color-text-secondary)', mb: 3 }}>
                Add new designations or remove existing ones. Removed designations will no longer appear in employee forms.
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <TextField
                  placeholder="New designation name..."
                  fullWidth
                  value={newDesigName}
                  onChange={(e) => setNewDesigName(e.target.value)}
                  sx={inputStyles}
                />
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddDesig}
                  sx={{
                    background: 'var(--color-primary)',
                    borderRadius: 'var(--radius-control)',
                    textTransform: 'none',
                    px: 3,
                  }}
                >
                  Add
                </Button>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: '400px', overflowY: 'auto' }}>
                {designations.map((desig: any) => (
                  <Box
                    key={desig.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 2,
                      borderRadius: 'var(--radius-control)',
                      border: '1px solid var(--color-border)',
                      bgcolor: 'var(--color-surface-subtle)',
                    }}
                  >
                    <Typography className="manage-options-name" sx={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
                      {desig.name}
                    </Typography>
                    <IconButton
                      onClick={() => deleteDesignationMutation.mutate(desig.id)}
                      sx={{ color: 'var(--color-text-secondary)', '&:hover': { color: 'var(--color-error)' } }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}
                {designations.length === 0 && (
                  <Typography className="manage-options-name" sx={{ color: 'var(--color-text-muted)', py: 2, textAlign: 'center' }}>
                    No designations added yet.
                  </Typography>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Detailed Employee Profile Dialog */}
      <Dialog
        open={openProfileDialog}
        onClose={() => setOpenProfileDialog(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-card)',
            boxShadow: 'var(--shadow-card)',
          },
        }}
      >
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)' }}>
            Employee Profile & Financial Summary
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="outlined"
              onClick={(event) => setProfileTenureAnchorEl(event.currentTarget)}
              sx={{
                height: 38,
                borderRadius: 'var(--radius-control)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
                textTransform: 'none',
                fontWeight: 700,
                '&:hover': {
                  borderColor: 'var(--color-primary)',
                  bgcolor: 'var(--color-surface-subtle)',
                },
              }}
            >
              Custom
            </Button>
            <Menu
              anchorEl={profileTenureAnchorEl}
              open={Boolean(profileTenureAnchorEl)}
              onClose={() => setProfileTenureAnchorEl(null)}
              PaperProps={{
                sx: {
                  mt: 1,
                  p: 2,
                  width: 330,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-card)',
                },
              }}
            >
              <Box sx={{ display: 'grid', gap: 2 }}>
                <TextField
                  type="date"
                  label="Start Date"
                  value={profileStartDate}
                  onChange={(e) => setProfileStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  sx={inputStyles}
                />
                <TextField
                  type="date"
                  label="End Date"
                  value={profileEndDate}
                  onChange={(e) => setProfileEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  sx={inputStyles}
                />
              </Box>
            </Menu>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          {!profileEmpId ? (
            <Box sx={{ py: 4, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              No employee selected.
            </Box>
          ) : (
            <Grid container spacing={3.5}>
              {/* Left Column: Editable HR & Bank Details */}
              <Grid item xs={12} lg={5}>
                <Paper sx={{ p: 3, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', background: 'var(--color-surface-subtle)' }}>
                  <Typography variant="subtitle1" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)', mb: 1 }}>
                    HR Profile Details
                  </Typography>
                  
                  <Box sx={{ borderBottom: 1, borderColor: 'var(--color-border)', mb: 2.5 }}>
                    <Tabs
                      value={profileDialogTab}
                      onChange={(_, newValue) => setProfileDialogTab(newValue)}
                      sx={{
                        '& .MuiTab-root': {
                          textTransform: 'none',
                          fontWeight: 600,
                          fontFamily: 'Outfit',
                          fontSize: '0.875rem',
                          color: 'var(--color-text-secondary)',
                          minWidth: 'auto',
                          px: 2,
                          pb: 1,
                          '&.Mui-selected': {
                            color: 'var(--color-primary-hover)',
                          },
                        },
                        '& .MuiTabs-indicator': {
                          backgroundColor: 'var(--color-primary)',
                        },
                      }}
                    >
                      <Tab label="Profile & Financials" />
                      <Tab label="Additional Details" />
                    </Tabs>
                  </Box>

                  <form onSubmit={handleProfileFormSubmit}>
                    {profileDialogTab === 0 ? (
                      /* Tab 1: Profile & Financials */
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Employee Code"
                            fullWidth
                            required
                            disabled={!isHRorAdmin}
                            value={profileFormData.employee_code}
                            onChange={(e) => setProfileFormData({ ...profileFormData, employee_code: e.target.value })}
                            sx={inputStyles}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Full Name"
                            fullWidth
                            required
                            disabled={!isHRorAdmin}
                            value={profileFormData.name}
                            onChange={(e) => setProfileFormData({ ...profileFormData, name: e.target.value })}
                            sx={inputStyles}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Email Address"
                            fullWidth
                            required
                            type="email"
                            disabled={!isHRorAdmin}
                            value={profileFormData.email}
                            onChange={(e) => setProfileFormData({ ...profileFormData, email: e.target.value })}
                            sx={inputStyles}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Phone Number"
                            fullWidth
                            disabled={!isHRorAdmin}
                            value={profileFormData.phone}
                            onChange={(e) => setProfileFormData({ ...profileFormData, phone: e.target.value })}
                            sx={inputStyles}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Autocomplete
                            options={profileDeptOptions}
                            value={profileFormData.department || null}
                            disabled={!isHRorAdmin}
                            onChange={(_, value) => {
                              setProfileFormData({ ...profileFormData, department: value || '' });
                            }}
                            renderInput={(params) => (
                              <TextField {...params} label="Department" required sx={inputStyles} />
                            )}
                            ListboxProps={{ sx: dropdownListStyles }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Autocomplete
                            options={profileDesigOptions}
                            value={profileFormData.designation || null}
                            disabled={!isHRorAdmin}
                            onChange={(_, value) => {
                              setProfileFormData({ ...profileFormData, designation: value || '' });
                            }}
                            renderInput={(params) => (
                              <TextField {...params} label="Designation" required sx={inputStyles} />
                            )}
                            ListboxProps={{ sx: dropdownListStyles }}
                          />
                        </Grid>
                        
                        {/* Tracker Fields */}
                        <Grid item xs={6}>
                          <TextField
                            label="No Of day Present"
                            type="number"
                            fullWidth
                            disabled={!isHRorAdmin}
                            value={profileFormData.no_of_days_present}
                            onChange={(e) => setProfileFormData({ ...profileFormData, no_of_days_present: Number(e.target.value) })}
                            sx={inputStyles}
                            inputProps={{ min: 0, max: 31 }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            label="Deduction (Absent)"
                            type="number"
                            fullWidth
                            disabled={!isHRorAdmin}
                            value={profileFormData.deduction_absent === 0 ? '' : profileFormData.deduction_absent}
                            onChange={(e) => setProfileFormData({ ...profileFormData, deduction_absent: parseFloat(e.target.value) || 0 })}
                            sx={inputStyles}
                            inputProps={{ min: 0 }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            label="Appraisal"
                            type="number"
                            fullWidth
                            disabled={!isHRorAdmin}
                            value={profileFormData.appraisal === 0 ? '' : profileFormData.appraisal}
                            onChange={(e) => setProfileFormData({ ...profileFormData, appraisal: parseFloat(e.target.value) || 0 })}
                            sx={inputStyles}
                            inputProps={{ min: 0 }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            label="Appraisal Effective Date"
                            type="date"
                            fullWidth
                            disabled={!isHRorAdmin}
                            value={profileFormData.appraisal_effective_date}
                            onChange={(e) => setProfileFormData({ ...profileFormData, appraisal_effective_date: e.target.value })}
                            sx={inputStyles}
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            label="Leave Encashment"
                            type="number"
                            fullWidth
                            disabled={!isHRorAdmin}
                            value={profileFormData.leave_encashment === 0 ? '' : profileFormData.leave_encashment}
                            onChange={(e) => setProfileFormData({ ...profileFormData, leave_encashment: parseFloat(e.target.value) || 0 })}
                            sx={inputStyles}
                            inputProps={{ min: 0 }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            label="Late Arrival Ded."
                            type="number"
                            fullWidth
                            disabled={!isHRorAdmin}
                            value={profileFormData.late_arrival_deduction === 0 ? '' : profileFormData.late_arrival_deduction}
                            onChange={(e) => setProfileFormData({ ...profileFormData, late_arrival_deduction: parseFloat(e.target.value) || 0 })}
                            sx={inputStyles}
                            inputProps={{ min: 0 }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            label="Damages Recovery"
                            type="number"
                            fullWidth
                            disabled={!isHRorAdmin}
                            value={profileFormData.damages_recovery === 0 ? '' : profileFormData.damages_recovery}
                            onChange={(e) => setProfileFormData({ ...profileFormData, damages_recovery: parseFloat(e.target.value) || 0 })}
                            sx={inputStyles}
                            inputProps={{ min: 0 }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            label="Bonus / Incentives"
                            type="number"
                            fullWidth
                            disabled={!isHRorAdmin}
                            value={profileFormData.bonus_incentives === 0 ? '' : profileFormData.bonus_incentives}
                            onChange={(e) => setProfileFormData({ ...profileFormData, bonus_incentives: parseFloat(e.target.value) || 0 })}
                            sx={inputStyles}
                            inputProps={{ min: 0 }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            label="Other Deductions"
                            type="number"
                            fullWidth
                            disabled={!isHRorAdmin}
                            value={profileFormData.other_deductions === 0 ? '' : profileFormData.other_deductions}
                            onChange={(e) => setProfileFormData({ ...profileFormData, other_deductions: parseFloat(e.target.value) || 0 })}
                            sx={inputStyles}
                            inputProps={{ min: 0 }}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            label="Remarks"
                            fullWidth
                            multiline
                            minRows={2}
                            maxRows={10}
                            disabled={!isHRorAdmin}
                            value={profileFormData.remarks}
                            onChange={(e) => setProfileFormData({ ...profileFormData, remarks: e.target.value })}
                            sx={inputStyles}
                          />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={profileFormData.active_status}
                                disabled={!isHRorAdmin}
                                onChange={(e) => setProfileFormData({ ...profileFormData, active_status: e.target.checked })}
                                sx={{
                                  '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--color-primary)' },
                                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: 'var(--color-primary)' },
                                }}
                              />
                            }
                            label="Active"
                            sx={{ color: 'var(--color-text-secondary)', '& .MuiFormControlLabel-label': { fontSize: '0.8rem' } }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={profileFormData.pf_deduction}
                                disabled={!isHRorAdmin}
                                onChange={(e) => setProfileFormData({ ...profileFormData, pf_deduction: e.target.checked })}
                                sx={{
                                  '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--color-primary)' },
                                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: 'var(--color-primary)' },
                                }}
                              />
                            }
                            label="PF"
                            sx={{ color: 'var(--color-text-secondary)', '& .MuiFormControlLabel-label': { fontSize: '0.8rem' } }}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            label="PF No. / UAN"
                            fullWidth
                            disabled={!isHRorAdmin}
                            value={profileFormData.pf_uan}
                            onChange={(e) => setProfileFormData({ ...profileFormData, pf_uan: e.target.value })}
                            sx={inputStyles}
                          />
                        </Grid>
                      </Grid>
                    ) : (
                      /* Tab 2: Additional Details */
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Joining Date"
                            type="date"
                            fullWidth
                            required
                            disabled={!isHRorAdmin}
                            InputLabelProps={{ shrink: true }}
                            value={profileFormData.joining_date}
                            onChange={(e) => setProfileFormData({ ...profileFormData, joining_date: e.target.value })}
                            sx={inputStyles}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Relieving Date"
                            type="date"
                            fullWidth
                            disabled={!isHRorAdmin}
                            InputLabelProps={{ shrink: true }}
                            value={profileFormData.relieving_date}
                            onChange={(e) => setProfileFormData({ ...profileFormData, relieving_date: e.target.value })}
                            sx={inputStyles}
                          />
                        </Grid>

                        
                        <Grid item xs={12} sx={{ mt: 1 }}>
                          <Typography variant="caption" sx={{ color: 'var(--color-primary-hover)', fontWeight: 600 }}>
                            BANK ACCOUNT DETAILS
                          </Typography>
                          <Divider sx={{ borderColor: 'var(--color-border)', mt: 0.5, mb: 1.5 }} />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            label="Bank Name"
                            fullWidth
                            required
                            disabled={!isHRorAdmin}
                            value={profileFormData.bank_name}
                            onChange={(e) => setProfileFormData({ ...profileFormData, bank_name: e.target.value })}
                            sx={inputStyles}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            label="Account Number"
                            fullWidth
                            required
                            disabled={!isHRorAdmin}
                            value={profileFormData.account_number}
                            onChange={(e) => setProfileFormData({ ...profileFormData, account_number: e.target.value })}
                            sx={inputStyles}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            label="IFSC Code"
                            fullWidth
                            required
                            disabled={!isHRorAdmin}
                            value={profileFormData.ifsc}
                            onChange={(e) => setProfileFormData({ ...profileFormData, ifsc: e.target.value })}
                            sx={inputStyles}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            label="Other Inputs (Maternity, Career Break, Extra Info, etc.)"
                            fullWidth
                            multiline
                            rows={3}
                            disabled={!isHRorAdmin}
                            placeholder="Enter extra lifecycle details, maternity leave dates, career break periods..."
                            value={profileFormData.other_inputs}
                            onChange={(e) => setProfileFormData({ ...profileFormData, other_inputs: e.target.value })}
                            sx={inputStyles}
                          />
                        </Grid>
                      </Grid>
                    )}

                    {isHRorAdmin && (
                      <Box sx={{ mt: 3 }}>
                        <Button
                          type="submit"
                          variant="contained"
                          fullWidth
                          disabled={updateProfileMutation.isLoading}
                          sx={{
                            background: 'var(--color-primary)',
                            borderRadius: 'var(--radius-control)',
                            py: 1.2,
                            textTransform: 'none',
                            fontWeight: 600,
                          }}
                        >
                          {updateProfileMutation.isLoading ? 'Saving...' : 'Save Profile Changes'}
                        </Button>
                      </Box>
                    )}
                  </form>
                </Paper>
              </Grid>

              {/* Right Column: Financial Summary & Graphical Charts */}
              <Grid item xs={12} lg={7}>
                {isLoadingProfileSummary ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress size={40} sx={{ color: 'var(--color-primary)' }} />
                  </Box>
                ) : !profileSummary ? (
                  <Paper sx={{ p: 4, textAlign: 'center', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', background: 'var(--color-surface)' }}>
                    <Typography sx={{ color: 'var(--color-text-secondary)' }}>No summary details available for this year.</Typography>
                  </Paper>
                ) : (
                  <Box>
                    {/* View Mode Switcher Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Typography variant="subtitle1" fontWeight="bold" sx={{ color: 'var(--color-text-primary)', fontFamily: 'Outfit' }}>
                        Financial Summary
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, bgcolor: 'var(--color-surface-subtle)', p: 0.5, borderRadius: 'var(--radius-control)', border: '1px solid var(--color-border)' }}>
                        <Button
                          size="small"
                          onClick={() => setProfileViewMode('annual')}
                          sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 2,
                            py: 0.4,
                            borderRadius: 'calc(var(--radius-control) - 2px)',
                            color: profileViewMode === 'annual' ? '#fff' : 'var(--color-text-secondary)',
                            background: profileViewMode === 'annual' ? 'var(--color-primary)' : 'transparent',
                            '&:hover': {
                              background: profileViewMode === 'annual' ? 'var(--color-primary-hover)' : 'rgba(255,255,255,0.04)',
                            }
                          }}
                        >
                          Annual
                        </Button>
                        <Button
                          size="small"
                          onClick={() => setProfileViewMode('monthly')}
                          sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 2,
                            py: 0.4,
                            borderRadius: 'calc(var(--radius-control) - 2px)',
                            color: profileViewMode === 'monthly' ? '#fff' : 'var(--color-text-secondary)',
                            background: profileViewMode === 'monthly' ? 'var(--color-primary)' : 'transparent',
                            '&:hover': {
                              background: profileViewMode === 'monthly' ? 'var(--color-primary-hover)' : 'rgba(255,255,255,0.04)',
                            }
                          }}
                        >
                          Monthly
                        </Button>
                      </Box>
                    </Box>

                     {/* Export Tenure Data Section */}
                     <Box
                       sx={{
                         p: 2,
                         mb: 3,
                         background: 'rgba(255, 255, 255, 0.02)',
                         border: '1px solid var(--color-border)',
                         borderRadius: 'var(--radius-control)',
                         display: 'flex',
                         flexWrap: 'wrap',
                         alignItems: 'center',
                         justifyContent: 'space-between',
                         gap: 2,
                       }}
                     >
                       <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                         <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                           Export Tenure:
                         </Typography>
                         <FormControl size="small" sx={{ minWidth: 100 }}>
                           <Select
                             value={exportStartYear}
                             onChange={(e) => setExportStartYear(Number(e.target.value))}
                             sx={{
                               color: 'var(--color-text-primary)',
                               height: '34px',
                               borderRadius: 'var(--radius-control)',
                               '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-border)' },
                             }}
                           >
                             {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                               <MenuItem key={y} value={y}>{y}</MenuItem>
                             ))}
                           </Select>
                         </FormControl>
                         <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                           to
                         </Typography>
                         <FormControl size="small" sx={{ minWidth: 100 }}>
                           <Select
                             value={exportEndYear}
                             onChange={(e) => setExportEndYear(Number(e.target.value))}
                             sx={{
                               color: 'var(--color-text-primary)',
                               height: '34px',
                               borderRadius: 'var(--radius-control)',
                               '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-border)' },
                             }}
                           >
                             {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                               <MenuItem key={y} value={y}>{y}</MenuItem>
                             ))}
                           </Select>
                         </FormControl>
                       </Box>
                       <Button
                         variant="contained"
                         size="small"
                         onClick={handleExportFinancials}
                         startIcon={<DownloadIcon />}
                         sx={{
                           textTransform: 'none',
                           fontWeight: 600,
                           height: '34px',
                           borderRadius: 'var(--radius-control)',
                           background: 'var(--color-primary)',
                           '&:hover': { background: 'var(--color-primary-hover)' },
                         }}
                       >
                         Export CSV
                       </Button>
                     </Box>

                    <Grid container spacing={3}>
                      {/* Top Stats */}
                      <Grid item xs={12} sm={6}>
                        <Paper sx={{ p: 2.5, background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-control)' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" sx={{ color: 'var(--color-success)', fontWeight: 600 }}>
                              {profileViewMode === 'annual' ? 'TOTAL AMOUNT PAID (YTD)' : 'AVG MONTHLY NET PAID (YTD)'}
                            </Typography>
                            <Tooltip title={`Breakdown: Net Salary Paid YTD (${formatCurrency(profileSummary.amountPaid)}) with parallel deductions of PF (${formatCurrency(profileSummary.pfDeducted)}) and Tax (${formatCurrency(profileSummary.taxDeducted)})`} arrow>
                              <IconButton size="small" sx={{ p: 0.2, color: 'var(--color-success)' }}>
                                <HelpOutlineIcon sx={{ fontSize: '1rem' }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                          <Typography variant="h4" sx={{ color: 'var(--color-success)', fontWeight: 'bold', fontFamily: 'Outfit', mt: 1 }}>
                            {profileViewMode === 'annual'
                              ? formatCurrency(profileSummary.amountPaid)
                              : formatCurrency(Number((profileSummary.amountPaid / (profileSummary.paidMonthsCount || 1)).toFixed(2)))}
                          </Typography>
                        </Paper>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Paper sx={{ p: 2.5, background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 'var(--radius-control)' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" sx={{ color: 'var(--color-primary-hover)', fontWeight: 600 }}>
                              {profileViewMode === 'annual' ? 'ESTIMATED TO BE PAID (REMAINING)' : 'ESTIMATED MONTHLY PAYOUT'}
                            </Typography>
                            <Tooltip title={`Breakdown: Estimated remaining Net Salary (${formatCurrency(profileSummary.amountToBePaid)}) with projected remaining deductions of PF (${formatCurrency(profileSummary.expectedPFRemaining)}) and Tax (${formatCurrency(profileSummary.expectedTaxRemaining)})`} arrow>
                              <IconButton size="small" sx={{ p: 0.2, color: 'var(--color-primary-hover)' }}>
                                <HelpOutlineIcon sx={{ fontSize: '1rem' }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                          <Typography variant="h4" sx={{ color: 'var(--color-primary-hover)', fontWeight: 'bold', fontFamily: 'Outfit', mt: 1 }}>
                            {profileViewMode === 'annual'
                              ? formatCurrency(profileSummary.amountToBePaid)
                              : formatCurrency(Number((profileSummary.amountToBePaid / (profileSummary.remainingMonthsCount || 12)).toFixed(2)))}
                          </Typography>
                        </Paper>
                      </Grid>

                      {/* PF & Tax Summaries */}
                      <Grid item xs={12} sm={6}>
                        <Paper sx={{ p: 2.5, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-control)', background: 'var(--color-surface-subtle)' }}>
                          <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>PROVIDENT FUND (PF)</Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5 }}>
                            <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                              {profileViewMode === 'annual' ? 'PF Deducted (YTD):' : 'Avg. PF / Month (Paid):'}
                            </Typography>
                            <Typography variant="body2" fontWeight="bold" sx={{ color: 'var(--color-text-primary)' }}>
                              {profileViewMode === 'annual'
                                ? formatCurrency(profileSummary.pfDeducted)
                                : formatCurrency(Number((profileSummary.pfDeducted / (profileSummary.paidMonthsCount || 1)).toFixed(2)))}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                            <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                              {profileViewMode === 'annual' ? 'Est. PF Remaining:' : 'Est. PF / Month (Rem):'}
                            </Typography>
                            <Typography variant="body2" fontWeight="bold" sx={{ color: 'var(--color-text-primary)' }}>
                              {profileViewMode === 'annual'
                                ? formatCurrency(profileSummary.expectedPFRemaining)
                                : formatCurrency(Number((profileSummary.expectedPFRemaining / (profileSummary.remainingMonthsCount || 12)).toFixed(2)))}
                            </Typography>
                          </Box>
                        </Paper>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Paper sx={{ p: 2.5, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-control)', background: 'var(--color-surface-subtle)' }}>
                          <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>INCOME TAX (TDS)</Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5 }}>
                            <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                              {profileViewMode === 'annual' ? 'Tax Deducted (YTD):' : 'Avg. TDS / Month (Paid):'}
                            </Typography>
                            <Typography variant="body2" fontWeight="bold" sx={{ color: 'var(--color-text-primary)' }}>
                              {profileViewMode === 'annual'
                                ? formatCurrency(profileSummary.taxDeducted)
                                : formatCurrency(Number((profileSummary.taxDeducted / (profileSummary.paidMonthsCount || 1)).toFixed(2)))}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                            <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                              {profileViewMode === 'annual' ? 'Est. Tax Remaining:' : 'Est. TDS / Month (Rem):'}
                            </Typography>
                            <Typography variant="body2" fontWeight="bold" sx={{ color: 'var(--color-text-primary)' }}>
                              {profileViewMode === 'annual'
                                ? formatCurrency(profileSummary.expectedTaxRemaining)
                                : formatCurrency(Number((profileSummary.expectedTaxRemaining / (profileSummary.remainingMonthsCount || 12)).toFixed(2)))}
                            </Typography>
                          </Box>
                        </Paper>
                      </Grid>

                      {/* Active Salary Structure Breakdown */}
                      {profileSummary.structure ? (
                        <Grid item xs={12}>
                          <Paper sx={{ p: 2.5, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-control)', background: 'var(--color-surface-subtle)' }}>
                            <Typography variant="caption" sx={{ color: 'var(--color-primary-hover)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              ACTIVE SALARY BREAKDOWN ({profileViewMode === 'annual' ? 'ANNUAL VIEW' : 'MONTHLY VIEW'})
                            </Typography>
                            
                            <Grid container spacing={2} sx={{ mt: 1.5 }}>
                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>CTC</Typography>
                                <Typography variant="body2" fontWeight="bold" sx={{ color: 'var(--color-primary-hover)', mt: 0.5 }}>
                                  {profileViewMode === 'annual'
                                    ? formatCurrency(profileSummary.structure.ctc * 12)
                                    : formatCurrency(profileSummary.structure.ctc)}
                                </Typography>
                              </Grid>

                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>Gross Salary</Typography>
                                <Typography variant="body2" fontWeight="bold" sx={{ color: 'var(--color-text-primary)', mt: 0.5 }}>
                                  {profileViewMode === 'annual'
                                    ? formatCurrency(profileSummary.structure.gross_salary * 12)
                                    : formatCurrency(profileSummary.structure.gross_salary)}
                                </Typography>
                              </Grid>

                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>Basic Salary</Typography>
                                <Typography variant="body2" fontWeight="bold" sx={{ color: 'var(--color-text-primary)', mt: 0.5 }}>
                                  {profileViewMode === 'annual'
                                    ? formatCurrency(profileSummary.structure.basic_salary * 12)
                                    : formatCurrency(profileSummary.structure.basic_salary)}
                                </Typography>
                              </Grid>

                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>HRA</Typography>
                                <Typography variant="body2" fontWeight="bold" sx={{ color: 'var(--color-text-primary)', mt: 0.5 }}>
                                  {profileViewMode === 'annual'
                                    ? formatCurrency(profileSummary.structure.hra * 12)
                                    : formatCurrency(profileSummary.structure.hra)}
                                </Typography>
                              </Grid>

                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>Employer PF</Typography>
                                <Typography variant="body2" fontWeight="bold" sx={{ color: 'var(--color-text-primary)', mt: 0.5 }}>
                                  {profileViewMode === 'annual'
                                    ? formatCurrency((profileSummary.structure.ctc - profileSummary.structure.gross_salary) * 12)
                                    : formatCurrency(profileSummary.structure.ctc - profileSummary.structure.gross_salary)}
                                </Typography>
                              </Grid>

                              {profileSummary.structure.special_allowance > 0 && (
                                <Grid item xs={6} sm={3}>
                                  <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>Special Allowance</Typography>
                                  <Typography variant="body2" fontWeight="bold" sx={{ color: 'var(--color-text-primary)', mt: 0.5 }}>
                                    {profileViewMode === 'annual'
                                      ? formatCurrency(profileSummary.structure.special_allowance * 12)
                                      : formatCurrency(profileSummary.structure.special_allowance)}
                                  </Typography>
                                </Grid>
                              )}

                              {profileSummary.structure.other_allowance > 0 && (
                                <Grid item xs={6} sm={3}>
                                  <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>Other Allowance</Typography>
                                  <Typography variant="body2" fontWeight="bold" sx={{ color: 'var(--color-text-primary)', mt: 0.5 }}>
                                    {profileViewMode === 'annual'
                                      ? formatCurrency(profileSummary.structure.other_allowance * 12)
                                      : formatCurrency(profileSummary.structure.other_allowance)}
                                  </Typography>
                                </Grid>
                              )}
                            </Grid>
                          </Paper>
                        </Grid>
                      ) : null}

                    {/* Advances loan summary */}
                    <Grid item xs={12}>
                      <Paper sx={{ p: 2.5, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-control)', background: 'var(--color-surface-subtle)' }}>
                        <Typography variant="caption" sx={{ color: 'var(--color-primary-hover)', fontWeight: 600 }}>SALARY ADVANCES OVERVIEW</Typography>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                          <Grid item xs={4}>
                            <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>Total Taken</Typography>
                            <Typography variant="body2" fontWeight="bold" sx={{ color: 'var(--color-text-primary)', mt: 0.5 }}>{formatCurrency(profileSummary.totalAdvancesTaken)}</Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>Total Repaid (YTD)</Typography>
                            <Typography variant="body2" fontWeight="bold" sx={{ color: 'var(--color-success)', mt: 0.5 }}>{formatCurrency(profileSummary.totalAdvancesRepaid)}</Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>Outstanding Loan</Typography>
                            <Typography variant="body2" fontWeight="bold" sx={{ color: profileSummary.remainingAdvanceBalance > 0 ? '#fb923c' : 'var(--color-text-muted)', mt: 0.5 }}>
                              {formatCurrency(profileSummary.remainingAdvanceBalance)}
                            </Typography>
                          </Grid>
                        </Grid>
                        {profileSummary.advanceDetails?.length > 0 && (
                          <TableContainer sx={{ mt: 2, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-control)' }}>
                            <Table size="small">
                              <TableHead sx={{ bgcolor: 'var(--color-surface)' }}>
                                <TableRow>
                                  {['Date', 'Amount', 'Type', 'Installment', 'Months', 'Start', 'Recovered', 'Remaining'].map((header) => (
                                    <TableCell key={header} sx={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', fontWeight: 700 }}>
                                      {header}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {profileSummary.advanceDetails.map((advance: any) => {
                                  const months = advance.installment_amount
                                    ? Math.ceil(Number(advance.amount) / Number(advance.installment_amount))
                                    : '-';
                                  return (
                                    <TableRow key={advance.id}>
                                      <TableCell sx={{ color: 'var(--color-text-primary)', fontSize: '0.78rem' }}>{advance.date}</TableCell>
                                      <TableCell sx={{ color: 'var(--color-text-primary)', fontSize: '0.78rem' }}>{formatCurrency(advance.amount)}</TableCell>
                                      <TableCell sx={{ color: 'var(--color-text-primary)', fontSize: '0.78rem', textTransform: 'capitalize' }}>
                                        {advance.recovery_type?.replace('_', ' ')}
                                      </TableCell>
                                      <TableCell sx={{ color: 'var(--color-text-primary)', fontSize: '0.78rem' }}>
                                        {advance.installment_amount ? formatCurrency(advance.installment_amount) : '-'}
                                      </TableCell>
                                      <TableCell sx={{ color: 'var(--color-text-primary)', fontSize: '0.78rem' }}>{months}</TableCell>
                                      <TableCell sx={{ color: 'var(--color-text-primary)', fontSize: '0.78rem' }}>
                                        {formatMonthLabel(advance.start_month)} {advance.start_year}
                                      </TableCell>
                                      <TableCell sx={{ color: 'var(--color-success)', fontSize: '0.78rem', fontWeight: 600 }}>
                                        {formatCurrency(advance.total_recovered)}
                                      </TableCell>
                                      <TableCell sx={{ color: advance.remaining_amount > 0 ? '#fb923c' : 'var(--color-text-muted)', fontSize: '0.78rem', fontWeight: 600 }}>
                                        {formatCurrency(advance.remaining_amount)}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}
                      </Paper>
                    </Grid>

                    {/* Chart 1: Bar Chart of Paid vs Remaining */}
                    <Grid item xs={12}>
                      <Paper sx={{ p: 2.5, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', background: 'var(--color-surface)', height: 320 }}>
                        <Typography variant="body2" fontWeight="bold" sx={{ color: 'var(--color-text-primary)', mb: 2 }}>
                          Paid vs Projected Remaining Analysis
                        </Typography>
                        <Box sx={{ height: 240 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={[
                                { name: 'Net Salary', Paid: profileSummary.amountPaid, Remaining: profileSummary.amountToBePaid },
                                { name: 'PF', Paid: profileSummary.pfDeducted, Remaining: profileSummary.expectedPFRemaining },
                                { name: 'Tax', Paid: profileSummary.taxDeducted, Remaining: profileSummary.expectedTaxRemaining },
                              ]}
                              margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-strong)" vertical={false} />
                              <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={11} tickLine={false} />
                              <YAxis stroke="var(--color-text-secondary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => formatCurrency(val)} />
                              <ChartTooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-control)', color: 'var(--color-text-primary)' }} formatter={(value) => formatCurrency(value as number)} />
                              <Legend />
                              <Bar dataKey="Paid" name="YTD Paid/Deducted" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="Remaining" name="Est. Remaining" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <Button onClick={() => setOpenProfileDialog(false)} variant="outlined" sx={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)', textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit/Add Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-card)',
            boxShadow: 'var(--shadow-card)',
          },
        }}
      >
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', pb: selectedEmp ? 1 : 2 }}>
          {selectedEmp ? 'Edit Employee Details' : 'Register New Employee'}
        </DialogTitle>
        <form onSubmit={handleFormSubmit}>
          <DialogContent sx={{ py: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Employee Code"
                    fullWidth
                    required
                    value={formData.employee_code}
                    onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                    error={!!formErrors.employee_code}
                    helperText={formErrors.employee_code}
                    sx={inputStyles}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Full Name"
                    fullWidth
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    error={!!formErrors.name}
                    helperText={formErrors.name}
                    sx={inputStyles}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Email Address"
                    fullWidth
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    error={!!formErrors.email}
                    helperText={formErrors.email}
                    sx={inputStyles}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Phone Number"
                    fullWidth
                    value={formData.phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, phone: val });
                    }}
                    error={!!formErrors.phone}
                    helperText={formErrors.phone || 'Exactly 10 digits'}
                    inputProps={{ maxLength: 10, inputMode: 'numeric', pattern: '[0-9]*' }}
                    sx={inputStyles}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    options={departmentOptions}
                    value={formData.department || null}
                    onChange={(_, value) => {
                      setFormData({ ...formData, department: value || '' });
                      setFormErrors({ ...formErrors, department: value ? '' : 'Department is required' });
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Department"
                        fullWidth
                        required
                        error={!!formErrors.department}
                        helperText={formErrors.department}
                        sx={inputStyles}
                      />
                    )}
                    ListboxProps={{ sx: dropdownListStyles }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    options={designationOptions}
                    value={formData.designation || null}
                    onChange={(_, value) => {
                      setFormData({ ...formData, designation: value || '' });
                      setFormErrors({ ...formErrors, designation: value ? '' : 'Designation is required' });
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Designation"
                        fullWidth
                        required
                        error={!!formErrors.designation}
                        helperText={formErrors.designation}
                        sx={inputStyles}
                      />
                    )}
                    ListboxProps={{ sx: dropdownListStyles }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Joining Date"
                    type="date"
                    fullWidth
                    required
                    value={formData.joining_date}
                    onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    error={!!formErrors.joining_date}
                    helperText={formErrors.joining_date}
                    sx={inputStyles}
                  />
                </Grid>

                {/* CTC Section */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ color: 'var(--color-primary-hover)', fontWeight: 600, mt: 1 }}>
                    CTC DETAILS
                  </Typography>
                  <Divider sx={{ borderColor: 'var(--color-border)', mt: 1 }} />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Monthly CTC"
                    type="number"
                    fullWidth
                    value={formData.monthly_ctc}
                    onChange={(e) => {
                      const monthly = e.target.value;
                      setFormData({ ...formData, monthly_ctc: monthly });
                    }}
                    inputProps={{ min: 0 }}
                    sx={inputStyles}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Annual CTC"
                    type="number"
                    fullWidth
                    value={formData.monthly_ctc ? String(Number(formData.monthly_ctc) * 12) : ''}
                    InputProps={{ readOnly: true }}
                    disabled
                    helperText="Auto-calculated (Monthly × 12)"
                    inputProps={{ min: 0 }}
                    sx={inputStyles}
                  />
                </Grid>
                {!!selectedEmp && (
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.active_status}
                          onChange={(e) => setFormData({ ...formData, active_status: e.target.checked })}
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--color-primary)' },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: 'var(--color-primary)' },
                          }}
                        />
                      }
                      label="Active Status"
                      sx={{ mt: 1.5, color: 'var(--color-text-secondary)' }}
                    />
                  </Grid>
                )}
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
	                      <Switch
	                        checked={formData.pf_deduction}
	                        onChange={(e) => setFormData({ ...formData, pf_deduction: e.target.checked })}
	                        sx={{
	                          '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--color-primary)' },
	                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: 'var(--color-primary)' },
                        }}
                      />
                    }
                    label="PF Deduction"
                    sx={{ mt: 1.5, color: 'var(--color-text-secondary)' }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="PF No. / UAN"
                    fullWidth
                    value={formData.pf_uan}
                    onChange={(e) => setFormData({ ...formData, pf_uan: e.target.value })}
                    error={!!formErrors.pf_uan}
                    helperText={formErrors.pf_uan}
                    sx={inputStyles}
                  />
                </Grid>

                {/* Bank Details Sub-header */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ color: 'var(--color-primary-hover)', fontWeight: 600, mt: 1 }}>
                    BANK ACCOUNT INFORMATION
                  </Typography>
                  <Divider sx={{ borderColor: 'var(--color-border)', mt: 1 }} />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Bank Name"
                    fullWidth
                    required
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    error={!!formErrors.bank_name}
                    helperText={formErrors.bank_name}
                    sx={inputStyles}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Account Number"
                    fullWidth
                    required
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    error={!!formErrors.account_number}
                    helperText={formErrors.account_number}
                    sx={inputStyles}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="IFSC Code"
                    fullWidth
                    required
                    value={formData.ifsc}
                    onChange={(e) => setFormData({ ...formData, ifsc: e.target.value })}
                    error={!!formErrors.ifsc}
                    helperText={formErrors.ifsc}
                    sx={inputStyles}
                  />
                </Grid>
              </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <Button onClick={() => setOpenDialog(false)} sx={{ color: 'var(--color-text-secondary)', textTransform: 'none' }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                background: 'var(--color-primary)',
                borderRadius: 'var(--radius-control)',
                px: 3,
                textTransform: 'none',
              }}
            >
              {selectedEmp ? 'Save Changes' : 'Register Employee'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>


    </Box>
  );
};

// Styling for text fields inside dialogs
const inputStyles = {
  '& .MuiOutlinedInput-root': {
    color: 'var(--color-text-primary)',
    borderRadius: 'var(--radius-control)',
    '& fieldset': { borderColor: 'var(--color-border)' },
    '&.Mui-focused fieldset': { borderColor: 'var(--color-primary)' },
    '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
      '-webkit-appearance': 'none',
      margin: 0,
    },
    '& input[type=number]': {
      '-moz-appearance': 'textfield',
    },
  },
  '& .MuiInputLabel-root': { color: 'var(--color-text-secondary)' },
  '& .MuiInputLabel-root.Mui-focused': { color: 'var(--color-primary-hover)' },
};

const dropdownListStyles = {
  bgcolor: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  '& .MuiAutocomplete-option.Mui-focused': {
    bgcolor: 'rgba(99, 102, 241, 0.18)',
  },
  '& .MuiAutocomplete-option[aria-selected="true"]': {
    bgcolor: 'rgba(99, 102, 241, 0.24)',
  },
};

const withCurrentOption = (options: readonly string[], currentValue: string) => {
  if (!currentValue || options.includes(currentValue)) {
    return [...options];
  }

  return [currentValue, ...options];
};

export default Employees;
