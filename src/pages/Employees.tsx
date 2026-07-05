import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { useAuth, Role } from "../context/AuthContext";
import { formatCurrency, formatCurrencyCrores } from "../constants/currency";
import {
  Box,
  Button,
  Typography,
  Tabs,
  Tab,
} from "@mui/material";

import { useToast } from "../context/ToastContext";
import {
  Add as AddIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
} from "@mui/icons-material";

import { EmployeeService } from "../services/employee.service";
import {
  Employee,
  getBasicSalaryFromMonthlyCtc,
  isPfRequiredByWageLimit,
  BaseEmployeeFormData,
} from "../utils/employeeUtils";
import { EmployeeDirectory } from "./EmployeesComponents/EmployeeDirectory";
import { ManageOptions } from "./EmployeesComponents/ManageOptions";
import { useEmployeeProfile } from "./EmployeesComponents/useEmployeeProfile";
import { ArchiveDialog, StatusChangeDialog } from "./EmployeesComponents/ConfirmationDialogs";
import { AddEditEmployeeDialog } from "./EmployeesComponents/AddEditEmployeeDialog";
import { EmployeeProfileDialog } from "./EmployeesComponents/EmployeeProfileDialog";
import { ImportPreviewDialog } from "./EmployeesComponents/ImportPreviewDialog";

interface EmployeesProps {
  previewOnly?: boolean;
}

const Employees: React.FC<EmployeesProps> = ({ previewOnly = false }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);
  const [openImportPreview, setOpenImportPreview] = useState(false);
  const [previewRows, setPreviewRows] = useState<any[]>([]);

  const [importing, setImporting] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [employeeToArchive, setEmployeeToArchive] = useState<Employee | null>(
    null,
  );
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [employeeToChangeStatus, setEmployeeToChangeStatus] =
    useState<Employee | null>(null);
  const [formErrors, setFormErrors] = useState({
    employee_code: "",
    name: "",
    email: "",
    personal_email: "",
    phone: "",
    department: "",
    designation: "",
    joining_date: "",
    bank_name: "",
    account_number: "",
    ifsc: "",
    pf_uan: "",
  });

  // Form Fields
  const [formData, setFormData] = useState<BaseEmployeeFormData>({
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
  });

  // HR Console States
  const [currentMainTab, setCurrentMainTab] = useState(0);


  const isHRorAdmin =
    user && (user.role === Role.SUPER_ADMIN || user.role === Role.HR);
  const isFinance = user && user.role === Role.FINANCE;
  const canViewPreview = Boolean(isHRorAdmin || isFinance);


  // Fetch employees
  const { data: employees = [], isLoading } = useQuery(
    ["employees"],
    async () => {
      const res = await EmployeeService.getAll();
      return res;
    },
  );


  // Manage Options States
  const [newDeptName, setNewDeptName] = useState("");
  const [newDesigName, setNewDesigName] = useState("");

  // Fetch departments
  const { data: departments = [] } = useQuery(["departments"], async () => {
    const res = await EmployeeService.getDepartments();
    return res;
  });

  // Fetch designations
  const { data: designations = [] } = useQuery(["designations"], async () => {
    const res = await EmployeeService.getDesignations();
    return res;
  });

  const deleteEmployeeMutation = useMutation(
    async (id: number) => {
      const res = await EmployeeService.delete(id);
      return res;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["employees"]);
        showToast("Employee archived successfully!", "success");
      },
      onError: (err: any) => {
        showToast(
          err.response?.data?.message || "Failed to archive employee",
          "error",
        );
      },
    },
  );

  // Mutations for creating departments & designations
  const addDepartmentMutation = useMutation(
    async (name: string) => {
      const res = await EmployeeService.addDepartment(name);
      return res;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["departments"]);
        showToast("New department added successfully!", "success");
      },
      onError: (err: any) => {
        showToast(
          err.response?.data?.message || "Failed to add department",
          "error",
        );
      },
    },
  );

  const deleteDepartmentMutation = useMutation(
    async (id: number) => {
      const res = await EmployeeService.deleteDepartment(id);
      return res;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["departments"]);
        showToast("Department removed successfully!", "success");
      },
      onError: (err: any) => {
        showToast(
          err.response?.data?.message || "Failed to remove department",
          "error",
        );
      },
    },
  );

  const addDesignationMutation = useMutation(
    async (name: string) => {
      const res = await EmployeeService.addDesignation(name);
      return res;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["designations"]);
        showToast("New designation added successfully!", "success");
      },
      onError: (err: any) => {
        showToast(
          err.response?.data?.message || "Failed to add designation",
          "error",
        );
      },
    },
  );

  const deleteDesignationMutation = useMutation(
    async (id: number) => {
      const res = await EmployeeService.deleteDesignation(id);
      return res;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["designations"]);
        showToast("Designation removed successfully!", "success");
      },
      onError: (err: any) => {
        showToast(
          err.response?.data?.message || "Failed to remove designation",
          "error",
        );
      },
    },
  );

  const allDepartments = departments.map((d: any) => d.name);
  const allDesignations = designations.map((d: any) => d.name);

  const handleAddDept = async () => {
    const trimmed = newDeptName.trim();
    if (!trimmed) return;
    try {
      await addDepartmentMutation.mutateAsync(trimmed);
      setNewDeptName("");
    } catch (e) { }
  };

  const handleAddDesig = async () => {
    const trimmed = newDesigName.trim();
    if (!trimmed) return;
    try {
      await addDesignationMutation.mutateAsync(trimmed);
      setNewDesigName("");
    } catch (e) { }
  };

  // Ã¢â€ â‚¬Ã¢â€ â‚¬ Profile dialog state, query & handlers (extracted to hook) Ã¢â€ â‚¬Ã¢â€ â‚¬
  const {
    openProfileDialog, setOpenProfileDialog,
    profileDialogTab, setProfileDialogTab,
    profileEmpId, setProfileEmpId,
    profileFormData, setProfileFormData,
    profileStartDate, setProfileStartDate,
    profileEndDate, setProfileEndDate,
    tempStartDate, setTempStartDate,
    tempEndDate, setTempEndDate,
    activeRangePreset, setActiveRangePreset,
    profileTenureAnchorEl, setProfileTenureAnchorEl,
    profileViewMode, setProfileViewMode,
    exportStartYear, setExportStartYear,
    exportEndYear, setExportEndYear,
    profileSummary,
    isLoadingProfileSummary,
    updateProfileMutation,
    handleOpenProfileDialog,
    handleProfileFormSubmit,
    handleExportFinancials,
    toDateInputValue,
    applyProfileRange,
  } = useEmployeeProfile(employees);



  // Profile sync effect is handled by useEmployeeProfile hook

  const computeEmployerPf = (monthlyCtc: string | number, pfDeduction: boolean) => {
    const ctc = Number(monthlyCtc || 0);
    if (!ctc || isNaN(ctc)) return 0;

    const basicSalary = getBasicSalaryFromMonthlyCtc(monthlyCtc);
    const pfApplies = pfDeduction || isPfRequiredByWageLimit(monthlyCtc);
    if (!pfApplies) return 0;

    return Number(Math.min(basicSalary * 0.12, 1800).toFixed(2));
  };

  const computeEmployerEsi = (monthlyCtc: string | number) => {
    const basicSalary = getBasicSalaryFromMonthlyCtc(monthlyCtc);
    if (basicSalary >= 21000) return 0;
    return Number((basicSalary * 0.0325).toFixed(2));
  };

  useEffect(() => {
    if (
      isPfRequiredByWageLimit(formData.monthly_ctc) &&
      !formData.pf_deduction
    ) {
      setFormData((prev) => ({ ...prev, pf_deduction: true }));
    }
  }, [formData.monthly_ctc, formData.pf_deduction]);

  // Profile PF effect & updateProfileMutation handled by useEmployeeProfile hook

  // handleProfileFormSubmit is provided by useEmployeeProfile hook

  const handleMutationError = (err: any, fallbackMessage: string) => {
    const backendMessage = err.response?.data?.message;
    const errors = {
      employee_code: "",
      name: "",
      email: "",
      personal_email: "",
      phone: "",
      department: "",
      designation: "",
      joining_date: "",
      bank_name: "",
      account_number: "",
      ifsc: "",
      pf_uan: "",
    };

    if (Array.isArray(backendMessage)) {
      backendMessage.forEach((msg: string) => {
        const lowerMsg = msg.toLowerCase();
        if (lowerMsg.includes("employee code") || lowerMsg.includes("code")) {
          errors.employee_code = msg;
        } else if (lowerMsg.includes("name")) {
          errors.name = msg;
        } else if (lowerMsg.includes("email")) {
          errors.email = msg;
        } else if (lowerMsg.includes("phone")) {
          errors.phone = msg;
        } else if (lowerMsg.includes("department")) {
          errors.department = msg;
        } else if (lowerMsg.includes("designation")) {
          errors.designation = msg;
        } else if (lowerMsg.includes("joining")) {
          errors.joining_date = msg;
        } else if (lowerMsg.includes("bank")) {
          errors.bank_name = msg;
        } else if (lowerMsg.includes("account")) {
          errors.account_number = msg;
        } else if (lowerMsg.includes("ifsc")) {
          errors.ifsc = msg;
        }
      });
      setFormErrors(errors);
      showToast("Please correct the highlighted validation errors.", "error");
    } else {
      showToast(backendMessage || fallbackMessage, "error");
    }
  };

  // Create employee mutation
  const createMutation = useMutation(
    async (newEmp: typeof formData) => {
      const res = await EmployeeService.create(newEmp);
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
        showToast("Employee registered successfully!", "success");
        setOpenDialog(false);
      },
      onError: (err: any) => {
        handleMutationError(err, "Failed to register employee");
      },
    },
  );

  // Update employee mutation
  const updateMutation = useMutation(
    async ({ id, data }: { id: number; data: Partial<Employee> }) => {
      const res = await EmployeeService.update(id, data);
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
        showToast("Employee profile updated!", "success");
        setOpenDialog(false);
      },
      onError: (err: any) => {
        handleMutationError(err, "Failed to update employee");
      },
    },
  );
  const handleOpenAddDialog = () => {
    setSelectedEmp(null);
    setFormErrors({
      employee_code: "",
      name: "",
      email: "",
      personal_email: "",
      phone: "",
      department: "",
      designation: "",
      joining_date: "",
      bank_name: "",
      account_number: "",
      ifsc: "",
      pf_uan: "",
    });
    setFormData({
      employee_code: "",
      name: "",
      email: "",
      personal_email: "",
      phone: "",
      department: "",
      designation: "",
      joining_date: new Date().toISOString().split("T")[0],
      monthly_ctc: "",
      bank_name: "",
      account_number: "",
      ifsc: "",
      pf_uan: "",
      tax_regime: "new",
      active_status: true,
      pf_deduction: false,
      tax_deduction: true,
    });
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (emp: Employee) => {
    setSelectedEmp(emp);
    setFormErrors({
      employee_code: "",
      name: "",
      email: "",
      personal_email: "",
      phone: "",
      department: "",
      designation: "",
      joining_date: "",
      bank_name: "",
      account_number: "",
      ifsc: "",
      pf_uan: "",
    });
    setFormData({
      employee_code: emp.employee_code,
      name: emp.name,
      email: emp.email,
      personal_email: emp.personal_email || "",
      phone: emp.phone || "",
      department: emp.department,
      designation: emp.designation,
      joining_date: emp.joining_date,
      monthly_ctc: emp.monthly_ctc ? Number(emp.monthly_ctc) : "",
      bank_name: emp.bank_name,
      account_number: emp.account_number,
      ifsc: emp.ifsc,
      pf_uan: emp.pf_uan || "",
      tax_regime: emp.tax_regime || "new",
      active_status: emp.active_status,
      pf_deduction: emp.pf_deduction !== false,
      tax_deduction: emp.tax_deduction !== false,
    });
    setOpenDialog(true);
  };

  // handleOpenProfileDialog is provided by useEmployeeProfile hook

  const handleGenerateCode = async () => {
    try {
      const res = await EmployeeService.getNextCode();
      setFormData((prev) => ({ ...prev, employee_code: res.code }));
      setFormErrors((prev) => ({ ...prev, employee_code: "" }));
      showToast("Employee code generated!", "success");
    } catch (err: any) {
      showToast("Failed to generate employee code.", "error");
    }
  };

  const handleGenerateCodeForProfile = async () => {
    try {
      const res = await EmployeeService.getNextCode();
      setProfileFormData((prev) => ({ ...prev, employee_code: res.code }));
      showToast("Employee code generated!", "success");
    } catch (err: any) {
      showToast("Failed to generate employee code.", "error");
    }
  };

  // Effect to handle deep linking from global search (Layout)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const openProfileId = params.get("openProfile");
    const requestedTab = params.get("tab");
    if (requestedTab === "directory") {
      setCurrentMainTab(0);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (openProfileId && employees.length > 0) {
      const emp = employees.find((e: any) => e.id === Number(openProfileId));
      if (emp) {
        setCurrentMainTab(0);
        handleOpenProfileDialog(emp);
        // Clear query parameter to avoid opening it repeatedly
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      }
    }
  }, [employees, location.search]);

  useEffect(() => {
    const openDirectory = () => {
      setCurrentMainTab(0);
    };

    window.addEventListener("openEmployeeDirectory", openDirectory);
    return () =>
      window.removeEventListener("openEmployeeDirectory", openDirectory);
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = {
      employee_code: "",
      name: "",
      email: "",
      personal_email: "",
      phone: "",
      department: "",
      designation: "",
      joining_date: "",
      bank_name: "",
      account_number: "",
      ifsc: "",
      pf_uan: "",
    };
    let isValid = true;

    // Employee Code
    if (
      !formData.employee_code ||
      formData.employee_code.trim().length < 3 ||
      formData.employee_code.trim().length > 20
    ) {
      nextErrors.employee_code =
        "Employee code must be between 3 and 20 characters";
      isValid = false;
    }

    // Name
    if (
      !formData.name ||
      formData.name.trim().length < 2 ||
      formData.name.trim().length > 100
    ) {
      nextErrors.name = "Name must be between 2 and 100 characters";
      isValid = false;
    }

    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email.trim())) {
      nextErrors.email = "Invalid email address format";
      isValid = false;
    }

    if (
      !formData.personal_email ||
      !emailRegex.test(formData.personal_email.trim())
    ) {
      nextErrors.personal_email = "Invalid personal email address format";
      isValid = false;
    }

    // Phone (optional)
    if (formData.phone && !/^\d{10}$/.test(formData.phone.trim())) {
      nextErrors.phone = "Phone number must be numeric and exactly 10 digits";
      isValid = false;
    }

    // Department
    if (!formData.department) {
      nextErrors.department = "Department is required";
      isValid = false;
    }

    // Designation
    if (!formData.designation) {
      nextErrors.designation = "Designation is required";
      isValid = false;
    }

    // Joining Date
    if (!formData.joining_date) {
      nextErrors.joining_date = "Joining date is required";
      isValid = false;
    }

    // Bank Name
    if (
      !formData.bank_name ||
      formData.bank_name.trim().length < 2 ||
      formData.bank_name.trim().length > 100
    ) {
      nextErrors.bank_name = "Bank name must be between 2 and 100 characters";
      isValid = false;
    }

    // Account Number
    if (
      !formData.account_number ||
      !/^\d{9,18}$/.test(formData.account_number.trim())
    ) {
      nextErrors.account_number =
        "Account number must be numeric and between 9 and 18 digits";
      isValid = false;
    }

    // IFSC Code
    const ifscRegex = /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/;
    if (!formData.ifsc || !ifscRegex.test(formData.ifsc.trim())) {
      nextErrors.ifsc = "Invalid IFSC code format (e.g. CHAS0001234)";
      isValid = false;
    }

    if (formData.pf_uan && !/^\d{12}$/.test(formData.pf_uan.trim())) {
      nextErrors.pf_uan = "UAN must be exactly 12 digits";
      isValid = false;
    } else {
      const pfApplies =
        formData.pf_deduction || isPfRequiredByWageLimit(formData.monthly_ctc);
      if (pfApplies && !formData.pf_uan.trim()) {
        nextErrors.pf_uan = "UAN is required when PF is applicable";
        isValid = false;
      }
    }

    setFormErrors(nextErrors);

    if (!isValid) {
      showToast("Please correct the highlighted validation errors.", "error");
      return;
    }

    const payload: any = {
      ...formData,
      monthly_ctc: Number(formData.monthly_ctc) || 0,
      annual_ctc: (Number(formData.monthly_ctc) || 0) * 12,
      pf_deduction:
        formData.pf_deduction || isPfRequiredByWageLimit(formData.monthly_ctc),
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

  const handleExportCsv = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await EmployeeService.downloadCsv();
      const blob = new Blob([res], { type: "text/csv" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `employee-master_${today}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(link.href), 100);
    } catch (err: any) {
      showToast(
        err.response?.data?.message || "Failed to export employees",
        "error",
      );
    }
  };

  // handleExportFinancials is provided by useEmployeeProfile hook

  const handleDownloadSampleCsv = () => {
    const headers = [
      "Employee Code",
      "Name",
      "Official Email",
      "Personal Email",
      "Phone",
      "Department",
      "Designation",
      "Joining Date",
      "Bank Name",
      "Account Number",
      "IFSC",
      "Tax Regime",
      "Active Status",
    ];
    const sampleRows = [
      [
        "EMP001",
        "John Doe",
        "",
        "",
        "",
        "Engineering",
        "Software Engineer",
        "15-01-2026",
        "",
        "",
        "",
        "new",
        "Active",
      ],
    ];
    const csvContent = [
      headers.join(","),
      ...sampleRows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "sample_employee_import.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) return [];

    const parseLine = (line: string) => {
      const result = [];
      let start = 0;
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') {
          inQuotes = !inQuotes;
        } else if (line[i] === "," && !inQuotes) {
          result.push(
            line.substring(start, i).replace(/^"|"$/g, "").replace(/""/g, '"'),
          );
          start = i + 1;
        }
      }
      result.push(
        line.substring(start).replace(/^"|"$/g, "").replace(/""/g, '"'),
      );
      return result;
    };

    const headers = parseLine(lines[0]).map((h) => h.trim().toLowerCase());
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      const obj: any = {};
      headers.forEach((header, index) => {
        const val = values[index]?.trim() || "";
        if (header === "employee code" || header === "employee_code")
          obj.employee_code = val;
        else if (header === "name") obj.name = val;
        else if (header === "email" || header === "official email")
          obj.email = val;
        else if (header === "personal email" || header === "personal_email")
          obj.personal_email = val;
        else if (header === "phone") obj.phone = val;
        else if (header === "department") obj.department = val;
        else if (header === "designation") obj.designation = val;
        else if (header === "joining date" || header === "joining_date")
          obj.joining_date = val;
        else if (header === "bank name" || header === "bank_name")
          obj.bank_name = val;
        else if (header === "account number" || header === "account_number")
          obj.account_number = val;
        else if (header === "ifsc") obj.ifsc = val;
        else if (header === "tax regime" || header === "tax_regime")
          obj.tax_regime = val || "new";
        else if (header === "active status" || header === "active_status") {
          obj.active_status =
            val.toLowerCase() === "active" ||
            val.toLowerCase() === "true" ||
            val === "1";
        }
      });
      rows.push(obj);
    }
    return rows;
  };

  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        showToast("CSV is empty or invalid format.", "error");
        return;
      }
      setPreviewRows(parsed);
      setOpenImportPreview(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleConfirmImport = async () => {
    setImporting(true);
    try {
      const res = await EmployeeService.importCsv(previewRows);
      const { imported, errors } = res;
      queryClient.invalidateQueries(["employees"]);
      queryClient.invalidateQueries(["activeSalaries"]);
      queryClient.invalidateQueries(["salaryHistory"]);
      queryClient.invalidateQueries(["dashboardData"]);
      queryClient.invalidateQueries(["profileFinancialSummary"]);
      if (errors && errors.length > 0) {
        showToast(
          `Imported ${imported} employees. There were ${errors.length} warnings/errors (see console details).`,
          "error",
        );
        console.warn("Import CSV warnings/errors:", errors);
      } else {
        showToast(`Successfully imported ${imported} employees!`, "success");
      }
      setOpenImportPreview(false);
      setPreviewRows([]);
    } catch (err: any) {
      showToast(
        err.response?.data?.message || "Failed to import employees.",
        "error",
      );
    } finally {
      setImporting(false);
    }
  };

  const filteredEmployees = employees.filter(
    (emp: Employee) =>
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const departmentOptions = withCurrentOption(
    allDepartments,
    formData.department,
  );
  const designationOptions = withCurrentOption(
    allDesignations,
    formData.designation,
  );

  const profileDeptOptions = withCurrentOption(
    allDepartments,
    profileFormData.department,
  );
  const profileDesigOptions = withCurrentOption(
    allDesignations,
    profileFormData.designation,
  );

  const summaryNumber = (value: any, fallback = 0) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  };

  const liveSummary = profileSummary
    ? {
      paidTotal: summaryNumber(profileSummary.amountPaid),
      paidMonthly:
        summaryNumber(profileSummary.amountPaid) /
        Math.max(1, summaryNumber(profileSummary.paidMonthsCount, 1)),
      remainingTotal: summaryNumber(profileSummary.amountToBePaid),
      estimatedMonthlyPayout: summaryNumber(
        profileSummary.estimatedMonthlyPayout,
        summaryNumber(profileSummary.amountToBePaid) /
        Math.max(1, summaryNumber(profileSummary.remainingMonthsCount, 1)),
      ),
      pfPaid: summaryNumber(profileSummary.pfDeducted),
      pfRemaining: summaryNumber(profileSummary.expectedPFRemaining),
      esiPaid: summaryNumber(profileSummary.esiDeducted),
      esiRemaining: summaryNumber(profileSummary.expectedESIRemaining),
      taxPaid: summaryNumber(profileSummary.taxDeducted),
      taxRemaining: summaryNumber(profileSummary.expectedTaxRemaining),
      advanceRecovered: summaryNumber(profileSummary.advanceRecovered),
      advanceOutstanding: summaryNumber(
        profileSummary.remainingAdvanceBalance,
      ),
      paidMonths: summaryNumber(profileSummary.paidMonthsCount),
      remainingMonths: summaryNumber(profileSummary.remainingMonthsCount),
      structure: profileSummary.structure,
    }
    : null;

  const annualize = (value: number, months: number) =>
    months > 0 ? (value / months) * 12 : 0;
  const annualizeRemaining = (value: number, months: number) =>
    months > 0 ? (value / months) * 12 : value * 12;
  const formatSummaryValue = (value: number) => formatCurrencyCrores(value);

  return (
    <Box>
      {!previewOnly && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Box>
            <Typography
              variant="h5"
              fontWeight="bold"
              fontFamily="Outfit"
              sx={{ color: "var(--color-text-primary)" }}
            >
              Employees
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "var(--color-text-secondary)", mt: 0.5 }}
            >
              Manage employee directory profiles and annual financial summaries.
            </Typography>
          </Box>
        </Box>
      )}

      {canViewPreview && !previewOnly && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderBottom: 1,
            borderColor: "var(--color-border)",
            mb: 3,
          }}
        >
          <Tabs
            value={currentMainTab}
            onChange={(_, newValue) => setCurrentMainTab(newValue)}
            sx={{
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 600,
                fontFamily: "Outfit",
                fontSize: "0.95rem",
                color: "var(--color-text-secondary)",
                "&.Mui-selected": {
                  color: "var(--color-primary-hover)",
                },
              },
              "& .MuiTabs-indicator": {
                backgroundColor: "var(--color-primary)",
              },
            }}
          >
            {isHRorAdmin && <Tab label="Employee Directory" />}
            {isHRorAdmin && <Tab label="Manage Options" />}
          </Tabs>
          {currentMainTab === 0 && (
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 2, pb: 0.5 }}
            >
              <input
                type="file"
                accept=".csv"
                id="import-csv-file-input"
                style={{ display: "none" }}
                onChange={handleImportCsv}
              />
              {isHRorAdmin && (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownloadSampleCsv}
                    sx={{
                      borderColor: "var(--color-border)",
                      color: "var(--color-text-secondary)",
                      textTransform: "none",
                      borderRadius: "var(--radius-control)",
                      "&:hover": {
                        borderColor: "var(--color-border-strong)",
                        bgcolor: "var(--color-surface-subtle)",
                        color: "var(--color-text-primary)",
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
                        borderColor: "var(--color-border)",
                        color: "var(--color-text-secondary)",
                        textTransform: "none",
                        borderRadius: "var(--radius-control)",
                        cursor: "pointer",
                        "&:hover": {
                          borderColor: "var(--color-border-strong)",
                          bgcolor: "var(--color-surface-subtle)",
                          color: "var(--color-text-primary)",
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
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-secondary)",
                  textTransform: "none",
                  borderRadius: "var(--radius-control)",
                  "&:hover": {
                    borderColor: "var(--color-border-strong)",
                    bgcolor: "var(--color-surface-subtle)",
                    color: "var(--color-text-primary)",
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
                    background: "var(--color-primary)",
                    boxShadow: "0 8px 18px rgba(99, 102, 241, 0.22)",
                    borderRadius: "var(--radius-control)",
                    textTransform: "none",
                  }}
                >
                  Add Employee
                </Button>
              )}
            </Box>
          )}
        </Box>
      )}

      {!canViewPreview && !previewOnly && (
        <Box
          sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mb: 3 }}
        >
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportCsv}
            sx={{
              borderColor: "var(--color-border)",
              color: "var(--color-text-secondary)",
              textTransform: "none",
              borderRadius: "var(--radius-control)",
              "&:hover": {
                borderColor: "var(--color-border-strong)",
                bgcolor: "var(--color-surface-subtle)",
                color: "var(--color-text-primary)",
              },
            }}
          >
            Export CSV
          </Button>
        </Box>
      )}

      {!previewOnly &&
        ((!isHRorAdmin && !isFinance) ||
          (isHRorAdmin && currentMainTab === 0)) ? (
        <>

  <EmployeeDirectory 
  searchTerm={searchTerm}
  setSearchTerm={setSearchTerm}
  page={page}
  setPage={setPage}
  rowsPerPage={rowsPerPage}
  setRowsPerPage={setRowsPerPage}
  isLoading={isLoading}
  filteredEmployees={filteredEmployees}
  isHRorAdmin={isHRorAdmin}
  setEmployeeToChangeStatus={setEmployeeToChangeStatus}
  setStatusDialogOpen={setStatusDialogOpen}
  setEmployeeToArchive={setEmployeeToArchive}
  setArchiveDialogOpen={setArchiveDialogOpen}
  handleOpenProfileDialog={handleOpenProfileDialog}
  handleOpenEditDialog={handleOpenEditDialog}
/>
        </>
      ) : (
        /* Manage Options View */
  <ManageOptions 
  departments={departments}
  newDeptName={newDeptName}
  setNewDeptName={setNewDeptName}
  handleAddDept={handleAddDept}
  deleteDepartmentMutation={deleteDepartmentMutation}
  designations={designations}
  newDesigName={newDesigName}
  setNewDesigName={setNewDesigName}
  handleAddDesig={handleAddDesig}
  deleteDesignationMutation={deleteDesignationMutation}
  inputStyles={inputStyles}
/>)}


      {/* Detailed Employee Profile Dialog */}
      <EmployeeProfileDialog
        openProfileDialog={openProfileDialog}
        setOpenProfileDialog={setOpenProfileDialog}
        profileFormData={profileFormData}
        setProfileFormData={setProfileFormData}
        profileEmpId={profileEmpId}
        profileDialogTab={profileDialogTab}
        setProfileDialogTab={setProfileDialogTab}
        profileSummary={profileSummary}
        isLoadingProfileSummary={isLoadingProfileSummary}
        profileViewMode={profileViewMode}
        setProfileViewMode={setProfileViewMode}
        profileStartDate={profileStartDate}
        profileEndDate={profileEndDate}
        setProfileStartDate={setProfileStartDate}
        setProfileEndDate={setProfileEndDate}
        tempStartDate={tempStartDate}
        tempEndDate={tempEndDate}
        setTempStartDate={setTempStartDate}
        setTempEndDate={setTempEndDate}
        activeRangePreset={activeRangePreset}
        setActiveRangePreset={setActiveRangePreset}
        profileTenureAnchorEl={profileTenureAnchorEl}
        setProfileTenureAnchorEl={setProfileTenureAnchorEl}
        applyProfileRange={applyProfileRange}
        toDateInputValue={toDateInputValue}
        handleProfileFormSubmit={handleProfileFormSubmit}
        handleExportFinancials={handleExportFinancials}
        handleGenerateCodeForProfile={handleGenerateCodeForProfile}
        exportStartYear={exportStartYear}
        exportEndYear={exportEndYear}
        setExportStartYear={setExportStartYear}
        setExportEndYear={setExportEndYear}
        updateProfileMutation={updateProfileMutation}
        isHRorAdmin={isHRorAdmin}
        employees={employees}
        profileDeptOptions={profileDeptOptions}
        profileDesigOptions={profileDesigOptions}
        allDepartments={allDepartments}
        allDesignations={allDesignations}
        addDepartmentMutation={addDepartmentMutation}
        addDesignationMutation={addDesignationMutation}
        liveSummary={liveSummary}
        annualize={annualize}
        annualizeRemaining={annualizeRemaining}
        formatSummaryValue={formatSummaryValue}
        computeEmployerPf={computeEmployerPf}
        computeEmployerEsi={computeEmployerEsi}
        inputStyles={inputStyles}
        dropdownListStyles={dropdownListStyles}
      />
      {/* Edit/Add Dialog */}
      <AddEditEmployeeDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        selectedEmp={selectedEmp}
        formData={formData}
        setFormData={setFormData}
        formErrors={formErrors}
        handleFormSubmit={handleFormSubmit}
        handleGenerateCode={handleGenerateCode}
        departmentOptions={departmentOptions}
        designationOptions={designationOptions}
        allDepartments={allDepartments}
        allDesignations={allDesignations}
        addDepartmentMutation={addDepartmentMutation}
        addDesignationMutation={addDesignationMutation}
        setFormErrors={setFormErrors}
        computeEmployerPf={computeEmployerPf}
        computeEmployerEsi={computeEmployerEsi}
        inputStyles={inputStyles}
        dropdownListStyles={dropdownListStyles}
      />
      
      {/* CSV Import Preview Dialog */}
      <ImportPreviewDialog
        openImportPreview={openImportPreview}
        setOpenImportPreview={setOpenImportPreview}
        importing={importing}
        previewRows={previewRows}
        handleConfirmImport={handleConfirmImport}
      />

      {/* Archive Confirmation Dialog */}
      <ArchiveDialog
        open={archiveDialogOpen}
        onClose={() => setArchiveDialogOpen(false)}
        employee={employeeToArchive}
        onConfirm={(id) => deleteEmployeeMutation.mutate(id)}
        isPending={deleteEmployeeMutation.isPending}
      />
      {/* Status Change Confirmation Dialog */}
      <StatusChangeDialog
        open={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
        employee={employeeToChangeStatus}
        onConfirm={(id, currentStatus) =>
          updateMutation.mutate({ id, data: { active_status: !currentStatus } })
        }
        isPending={updateMutation.isPending}
      />
    </Box>
  );
};

// Styling for text fields inside dialogs
const inputStyles = {
  "& .MuiOutlinedInput-root": {
    color: "var(--color-text-primary)",
    borderRadius: "var(--radius-control)",
    "& fieldset": { borderColor: "var(--color-border)" },
    "&.Mui-focused fieldset": { borderColor: "var(--color-primary)" },
    "& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button":
    {
      "-webkit-appearance": "none",
      margin: 0,
    },
    "& input[type=number]": {
      "-moz-appearance": "textfield",
    },
  },
  "& .MuiInputLabel-root": {
    color: "var(--color-text-secondary)",
    background: "var(--color-surface)",
    px: 0.5,
    maxWidth: "calc(100% - 24px)",
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "var(--color-primary-hover)" },
};

const dropdownListStyles = {
  bgcolor: "var(--color-surface)",
  color: "var(--color-text-primary)",
  "& .MuiAutocomplete-option.Mui-focused": {
    bgcolor: "rgba(99, 102, 241, 0.18)",
  },
  '& .MuiAutocomplete-option[aria-selected="true"]': {
    bgcolor: "rgba(99, 102, 241, 0.24)",
  },
};

const withCurrentOption = (
  options: readonly string[],
  currentValue: string,
) => {
  if (!currentValue || options.includes(currentValue)) {
    return [...options];
  }

  return [currentValue, ...options];
};

export default Employees;
