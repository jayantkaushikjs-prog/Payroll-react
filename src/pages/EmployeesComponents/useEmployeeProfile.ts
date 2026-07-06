import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { EmployeeService } from "../../services/employee.service";
import { useToast } from "../../context/ToastContext";
import {
  Employee,
  ProfileFormData,
  isPfRequiredByWageLimit,
} from "../../utils/employeeUtils";

const getCurrentFY = () => {
  const currentYear = new Date().getFullYear();
  const isAfterApril = new Date().getMonth() >= 3;
  return {
    defaultStart: isAfterApril ? `${currentYear}-04-01` : `${currentYear - 1}-04-01`,
    defaultEnd: isAfterApril ? `${currentYear + 1}-03-31` : `${currentYear}-03-31`,
  };
};

const EMPTY_PROFILE_FORM: ProfileFormData = {
  employee_code: "",
  name: "",
  email: "",
  personal_email: "",
  phone: "",
  department: "",
  designation: "",
  joining_date: "",
  monthly_ctc: "",
  bank_name: "",
  account_number: "",
  ifsc: "",
  pf_uan: "",
  employer_pf: 0,
  employer_esi: 0,
  tax_regime: "new",
  active_status: true,
  pf_deduction: false,
  tax_deduction: true,
  relieving_date: "",
  other_inputs: "",
  deduction_absent: "",
  appraisal: "",
  appraisal_effective_date: "",
  leave_encashment: "",
  late_arrival_deduction: "",
  damages_recovery: "",
  bonus_incentives: "",
  other_deductions: "",
  remarks: "",
};

export const useEmployeeProfile = (employees: Employee[]) => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { defaultStart, defaultEnd } = getCurrentFY();

  // Dialog open state
  const [openProfileDialog, setOpenProfileDialog] = useState(false);
  const [profileDialogTab, setProfileDialogTab] = useState(0);

  // Selected employee id
  const [profileEmpId, setProfileEmpId] = useState<number | "">("");

  // Date range state
  const [profileStartDate, setProfileStartDate] = useState<string>(defaultStart);
  const [profileEndDate, setProfileEndDate] = useState<string>(defaultEnd);
  const [tempStartDate, setTempStartDate] = useState<string>(defaultStart);
  const [tempEndDate, setTempEndDate] = useState<string>(defaultEnd);
  const [activeRangePreset, setActiveRangePreset] = useState<string>("thisfy");
  const [profileTenureAnchorEl, setProfileTenureAnchorEl] = useState<null | HTMLElement>(null);

  // View mode (monthly / annual)
  const [profileViewMode, setProfileViewMode] = useState<"monthly" | "annual">("monthly");

  // Export year range
  const [exportStartYear, setExportStartYear] = useState<number>(new Date().getFullYear() - 1);
  const [exportEndYear, setExportEndYear] = useState<number>(new Date().getFullYear());

  // Form data
  const [profileFormData, setProfileFormData] = useState<ProfileFormData>(EMPTY_PROFILE_FORM);

  // Sync form when employee selection changes
  useEffect(() => {
    if (profileEmpId && employees.length > 0) {
      const emp = employees.find((e: any) => e.id === profileEmpId);
      if (emp) {
        setProfileFormData({
          employee_code: emp.employee_code || "",
          name: emp.name || "",
          email: emp.email || "",
          personal_email: emp.personal_email || "",
          phone: emp.phone || "",
          department: emp.department || "",
          designation: emp.designation || "",
          joining_date: emp.joining_date || "",
          monthly_ctc: emp.monthly_ctc || "",
          bank_name: emp.bank_name || "",
          account_number: emp.account_number || "",
          ifsc: emp.ifsc || "",
          pf_uan: emp.pf_uan || "",
          tax_regime: emp.tax_regime || "new",
          active_status: emp.active_status !== false,
          pf_deduction: emp.pf_deduction !== false,
          employer_pf: (emp as any).employer_pf || 0,
          employer_esi: (emp as any).employer_esi || 0,
          tax_deduction: emp.tax_deduction !== false,
          relieving_date: emp.relieving_date || "",
          other_inputs: emp.other_inputs || "",
          deduction_absent: emp.deduction_absent ? Number(emp.deduction_absent) : "",
          appraisal: emp.appraisal ? Number(emp.appraisal) : "",
          appraisal_effective_date: emp.appraisal_effective_date || "",
          leave_encashment: emp.leave_encashment ? Number(emp.leave_encashment) : "",
          late_arrival_deduction: emp.late_arrival_deduction ? Number(emp.late_arrival_deduction) : "",
          damages_recovery: emp.damages_recovery ? Number(emp.damages_recovery) : "",
          bonus_incentives: emp.bonus_incentives ? Number(emp.bonus_incentives) : "",
          other_deductions: emp.other_deductions ? Number(emp.other_deductions) : "",
          remarks: emp.remarks || "",
        });
      }
    }
  }, [profileEmpId, employees]);

  // Auto-enable PF when required by wage limit
  useEffect(() => {
    if (!profileEmpId) return;
    const emp = employees.find((e: Employee) => e.id === profileEmpId);
    if (isPfRequiredByWageLimit(emp?.monthly_ctc) && !profileFormData.pf_deduction) {
      setProfileFormData((prev) => ({ ...prev, pf_deduction: true }));
    }
  }, [employees, profileEmpId, profileFormData.pf_deduction]);

  // Financial summary query
  const { data: profileSummary, isLoading: isLoadingProfileSummary } = useQuery(
    ["profileFinancialSummary", profileEmpId, profileStartDate, profileEndDate],
    async () => {
      if (!profileEmpId) return null;
      const res = await EmployeeService.getFinancialSummary(
        profileEmpId as number,
        profileStartDate,
        profileEndDate,
      );
      return res;
    },
    {
      enabled: openProfileDialog && !!profileEmpId,
      staleTime: 0,
      refetchOnWindowFocus: true,
      onError: (err: any) => {
        showToast(
          err.response?.data?.message || "Failed to fetch financial summary data",
          "error",
        );
      },
    },
  );

  // Profile update mutation
  const updateProfileMutation = useMutation(
    async ({ id, payload }: { id: number; payload: any }) => {
      const res = await EmployeeService.update(id, payload);
      return res;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["employees"]);
        queryClient.invalidateQueries(["activeSalaries"]);
        queryClient.invalidateQueries(["salaryHistory"]);
        queryClient.invalidateQueries(["profileFinancialSummary"]);
        queryClient.invalidateQueries(["financialSummaryPage"]);
        queryClient.invalidateQueries(["departments"]);
        queryClient.invalidateQueries(["designations"]);
        showToast("Employee profile details saved successfully!", "success");
        setOpenProfileDialog(false);
      },
      onError: (err: any) => {
        showToast(
          err.response?.data?.message || "Failed to update employee details",
          "error",
        );
      },
    },
  );

  // Open dialog for a specific employee
  const handleOpenProfileDialog = (emp: Employee) => {
    setProfileEmpId(emp.id);
    setProfileFormData({
      employee_code: emp.employee_code || "",
      name: emp.name || "",
      email: emp.email || "",
      personal_email: emp.personal_email || "",
      phone: emp.phone || "",
      department: emp.department || "",
      designation: emp.designation || "",
      joining_date: emp.joining_date || "",
      monthly_ctc: emp.monthly_ctc || "",
      bank_name: emp.bank_name || "",
      account_number: emp.account_number || "",
      ifsc: emp.ifsc || "",
      pf_uan: emp.pf_uan || "",
      tax_regime: emp.tax_regime || "new",
      active_status: emp.active_status !== false,
      pf_deduction: emp.pf_deduction !== false,
      tax_deduction: emp.tax_deduction !== false,
      relieving_date: emp.relieving_date || "",
      other_inputs: emp.other_inputs || "",
      deduction_absent: emp.deduction_absent ? Number(emp.deduction_absent) : "",
      appraisal: emp.appraisal ? Number(emp.appraisal) : "",
      appraisal_effective_date: emp.appraisal_effective_date || "",
      leave_encashment: emp.leave_encashment ? Number(emp.leave_encashment) : "",
      late_arrival_deduction: emp.late_arrival_deduction ? Number(emp.late_arrival_deduction) : "",
      damages_recovery: emp.damages_recovery ? Number(emp.damages_recovery) : "",
      bonus_incentives: emp.bonus_incentives ? Number(emp.bonus_incentives) : "",
      other_deductions: emp.other_deductions ? Number(emp.other_deductions) : "",
      remarks: emp.remarks || "",
      employer_pf: (emp as any).employer_pf || 0,
      employer_esi: (emp as any).employer_esi || 0,
    });
    setProfileDialogTab(0);
    setOpenProfileDialog(true);
  };

  // Submit profile form
  const handleProfileFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileEmpId) return;

    const phone = profileFormData.phone.trim();
    if (!phone) {
      showToast("Phone number is required", "error");
      return;
    }
    if (!/^\d{10}$/.test(phone)) {
      showToast("Phone number must be numeric and exactly 10 digits", "error");
      return;
    }

    const uan = profileFormData.pf_uan.trim();
    if (uan && !/^\d{12}$/.test(uan)) {
      showToast("UAN must be exactly 12 digits (numeric only)", "error");
      return;
    }
    const emp = employees.find((e: any) => e.id === profileEmpId);
    const pfRequired = isPfRequiredByWageLimit(emp?.monthly_ctc);
    const pfApplies = profileFormData.pf_deduction || pfRequired;
    if (pfApplies && !uan) {
      showToast("UAN is required when PF is applicable as Basic is below 15000", "error");
      return;
    }

    const payload = {
      ...profileFormData,
      monthly_ctc: Number(profileFormData.monthly_ctc),
      deduction_absent: profileFormData.deduction_absent ? Number(profileFormData.deduction_absent) : 0,
      appraisal: profileFormData.appraisal ? Number(profileFormData.appraisal) : 0,
      leave_encashment: profileFormData.leave_encashment ? Number(profileFormData.leave_encashment) : 0,
      late_arrival_deduction: profileFormData.late_arrival_deduction ? Number(profileFormData.late_arrival_deduction) : 0,
      damages_recovery: profileFormData.damages_recovery ? Number(profileFormData.damages_recovery) : 0,
      bonus_incentives: profileFormData.bonus_incentives ? Number(profileFormData.bonus_incentives) : 0,
      other_deductions: profileFormData.other_deductions ? Number(profileFormData.other_deductions) : 0,
      pf_deduction: profileFormData.pf_deduction || pfRequired,
      pf_uan: uan || undefined,
      relieving_date: profileFormData.relieving_date || null,
      other_inputs: profileFormData.other_inputs || null,
      remarks: profileFormData.remarks || null,
      appraisal_effective_date: profileFormData.appraisal_effective_date || null,
    };

    updateProfileMutation.mutate({ id: Number(profileEmpId), payload });
  };

  // Export financial summary as CSV
  const handleExportFinancials = async () => {
    if (!profileEmpId) return;
    try {
      const res = await EmployeeService.exportFinancials(
        profileEmpId as number,
        profileStartDate,
        profileEndDate,
      );
      const blob = new Blob([res], { type: "text/csv" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      const employeeName = profileFormData.name
        ? profileFormData.name.replace(/\s+/g, "_")
        : "employee";
      link.download = `${employeeName}_financials_${profileStartDate}_to_${profileEndDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(link.href), 100);
      showToast("Financial summary exported successfully", "success");
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to export financial summary", "error");
    }
  };

  // Date helpers
  const toDateInputValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const applyProfileRange = (start: string, end: string, preset: string) => {
    setTempStartDate(start);
    setTempEndDate(end);
    setProfileStartDate(start);
    setProfileEndDate(end);
    setActiveRangePreset(preset);
    setProfileTenureAnchorEl(null);
  };

  return {
    // Dialog state
    openProfileDialog,
    setOpenProfileDialog,
    profileDialogTab,
    setProfileDialogTab,
    // Employee ID
    profileEmpId,
    setProfileEmpId,
    // Form data
    profileFormData,
    setProfileFormData,
    // Date range
    profileStartDate,
    setProfileStartDate,
    profileEndDate,
    setProfileEndDate,
    tempStartDate,
    setTempStartDate,
    tempEndDate,
    setTempEndDate,
    activeRangePreset,
    setActiveRangePreset,
    profileTenureAnchorEl,
    setProfileTenureAnchorEl,
    // View mode
    profileViewMode,
    setProfileViewMode,
    // Export year range
    exportStartYear,
    setExportStartYear,
    exportEndYear,
    setExportEndYear,
    // Query data
    profileSummary,
    isLoadingProfileSummary,
    // Mutations
    updateProfileMutation,
    // Handlers
    handleOpenProfileDialog,
    handleProfileFormSubmit,
    handleExportFinancials,
    toDateInputValue,
    applyProfileRange,
  };
};
