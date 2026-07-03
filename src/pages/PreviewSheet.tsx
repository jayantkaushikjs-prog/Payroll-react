import React, { useState, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Grid,
  TablePagination,
  Tooltip,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  EditOutlined,
  SearchOutlined,
  CalendarMonthOutlined, AddOutlined, DownloadOutlined, UploadOutlined,
} from '@mui/icons-material';
import { FormControlLabel, Checkbox, Chip, CircularProgress, Divider } from '@mui/material';
import { EmployeeService } from '../services/employee.service';
import api from '../services/api';
import { Employee } from '../utils/employeeUtils';
import { useAuth, Permission, Role } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export interface PreviewEditFormData {
  deduction_absent: number | string;
  leave_encashment: number | string;
  late_arrival_deduction: number | string;
  damages_recovery: number | string;
  bonus_incentives: number | string;
  other_deductions: number | string;
  appraisal: number | string;
  appraisal_effective_date: string;
  remarks: string;
}


const getTheoreticalDaysPresent = (emp: any, previewMonth: string) => {
  const [year, month] = previewMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  
  let startDay = 1;
  let endDay = daysInMonth;
  
  if (emp.joining_date) {
    const joiningDate = new Date(emp.joining_date);
    const jYear = joiningDate.getUTCFullYear();
    const jMonth = joiningDate.getUTCMonth() + 1;
    const jDay = joiningDate.getUTCDate();
    
    if (jYear > year || (jYear === year && jMonth > month)) {
      return 0;
    }
    if (jYear === year && jMonth === month) {
      startDay = Math.max(startDay, jDay);
    }
  }
  
  if (emp.relieving_date) {
    const relievingDate = new Date(emp.relieving_date);
    const rYear = relievingDate.getUTCFullYear();
    const rMonth = relievingDate.getUTCMonth() + 1;
    const rDay = relievingDate.getUTCDate();
    
    if (rYear < year || (rYear === year && rMonth < month)) {
      return 0;
    }
    if (rYear === year && rMonth === month) {
      endDay = Math.min(endDay, rDay);
    }
  }
  
  return Math.max(0, endDay - startDay + 1);
};

const getPreviewStatus = (emp: any, previewMonth: string) => {
  // Prefer server-provided preview_status when present (server overrides for locked months)
  if (emp && emp.preview_status) return emp.preview_status;
  if (!previewMonth) return 'old';
  const [year, month] = previewMonth.split('-').map(Number);
  const selectedMonth = new Date(Date.UTC(year, month - 1, 1));
  const selectedMonthEnd = new Date(Date.UTC(year, month, 0));

  const joining = emp.joining_date ? new Date(emp.joining_date) : null;
  const relieving = emp.relieving_date ? new Date(emp.relieving_date) : null;

  const monthMatches = (date?: Date | null) =>
    date && date.getUTCFullYear() === selectedMonth.getUTCFullYear() && date.getUTCMonth() === selectedMonth.getUTCMonth();

  if (relieving && monthMatches(relieving)) return 'relieving';
  if (relieving && relieving > selectedMonthEnd) return 'on_notice';
  if (joining && monthMatches(joining)) return 'new';
  return 'old';
};

const PreviewSheet: React.FC = () => {
  const importCsvRef = useRef<HTMLInputElement>(null);

  const { hasPermission, hasRole } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Role Checks
  const isHRorAdmin = hasRole([Role.HR]) || hasRole([Role.SUPER_ADMIN]);
  const isFinance = hasRole([Role.FINANCE]);

  // Preview Sheet State
  const [previewMonth, setPreviewMonth] = useState<string>(
    new Date().toISOString().substring(0, 7)
  );
  const [previewSearch, setPreviewSearch] = useState('');
  const [previewPage, setPreviewPage] = useState(0);
  const [previewRowsPerPage, setPreviewRowsPerPage] = useState(10);
  

  // Filter States
  const [modifiedOnly, setModifiedOnly] = useState(false);
  const [filterAll, setFilterAll] = useState(true);
  const [filterNew, setFilterNew] = useState(false);
  const [filterOld, setFilterOld] = useState(false);
  const [filterNotice, setFilterNotice] = useState(false);
  const [filterRelieving, setFilterRelieving] = useState(false);

  const { data: previewReview, isLoading: isReviewLoading } = useQuery({
    queryKey: ['preview-review', previewMonth],
    queryFn: () => EmployeeService.getPreviewReview(previewMonth),
    enabled: hasPermission(Permission.VIEW_EMPLOYEE),
  });

  const updateReviewStatusMutation = useMutation(
    async (status: 'done' | 'undone') => {
      const res = await EmployeeService.updatePreviewReviewStatus(previewMonth, status);
      return res;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['preview-review']);
        showToast('Status updated successfully', 'success');
      },
    }
  );

  // Edit Dialog State
  const [openPreviewEditDialog, setOpenPreviewEditDialog] = useState(false);
  const [previewEditEmp, setPreviewEditEmp] = useState<Employee | null>(null);
  const [previewEditFormData, setPreviewEditFormData] = useState<PreviewEditFormData>({
    deduction_absent: '',
    leave_encashment: '',
    late_arrival_deduction: '',
    damages_recovery: '',
    bonus_incentives: '',
    other_deductions: '',
    appraisal: '',
    appraisal_effective_date: '',
    remarks: '',
  });

  // Queries
  const {
    data: previewEmployees = [],
    isLoading: isPreviewLoading,
    isError: isPreviewError,
  } = useQuery<Employee[]>({
    queryKey: ['preview-employees', previewMonth],
    queryFn: () => EmployeeService.getPreview(previewMonth),
    enabled: hasPermission(Permission.VIEW_EMPLOYEE),
  });

  // Mutations
  const savePreviewInputMutation = useMutation(
    async ({ id, month, data }: { id: number; month: string; data: any }) => {
      const res = await EmployeeService.patchPreview(id, month, data);
      return res;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['preview-employees']);
        showToast('HR inputs saved successfully', 'success');
      },
      onError: (err: any) => {
        const backendMessage = err.response?.data?.message || 'Failed to save HR inputs';
        showToast(backendMessage, 'error');
      },
    }
  );

  // Handlers
  const handleOpenPreviewEdit = (emp: Employee) => {
    if ((emp as any).preview_locked) {
      showToast('Preview locked for this month — edits are disabled', 'error');
      return;
    }
    setPreviewEditEmp(emp);
    setPreviewEditFormData({
      deduction_absent: emp.deduction_absent ? Number(emp.deduction_absent) : '',
      leave_encashment: emp.leave_encashment ? Number(emp.leave_encashment) : '',
      late_arrival_deduction: emp.late_arrival_deduction ? Number(emp.late_arrival_deduction) : '',
      damages_recovery: emp.damages_recovery ? Number(emp.damages_recovery) : '',
      bonus_incentives: emp.bonus_incentives ? Number(emp.bonus_incentives) : '',
      other_deductions: emp.other_deductions ? Number(emp.other_deductions) : '',
      appraisal: emp.appraisal ? Number(emp.appraisal) : '',
      appraisal_effective_date: emp.appraisal_effective_date || '',
      remarks: emp.remarks || '',
    });
    setOpenPreviewEditDialog(true);
  };

  const handleSavePreviewEdit = () => {
    if (!previewEditEmp) return;
    if ((previewEditEmp as any).preview_locked) {
      showToast('Cannot save inputs — preview is locked for this month', 'error');
      return;
    }

    const monthlyPayload = {
      appraisal: Number(previewEditFormData.appraisal) || 0,
      appraisal_effective_date: previewEditFormData.appraisal_effective_date || null,
      deduction_absent: Number(previewEditFormData.deduction_absent) || 0,
      leave_encashment: Number(previewEditFormData.leave_encashment) || 0,
      late_arrival_deduction: Number(previewEditFormData.late_arrival_deduction) || 0,
      damages_recovery: Number(previewEditFormData.damages_recovery) || 0,
      bonus_incentives: Number(previewEditFormData.bonus_incentives) || 0,
      other_deductions: Number(previewEditFormData.other_deductions) || 0,
      remarks: previewEditFormData.remarks || null,
      other_inputs: previewEditEmp.other_inputs || null,
    };

    savePreviewInputMutation.mutate(
      { id: previewEditEmp.id, month: previewMonth, data: monthlyPayload },
      {
        onSuccess: () => {
          setOpenPreviewEditDialog(false);
          setPreviewEditEmp(null);
        },
      }
    );
  };

  // Derived Data
  const filteredPreview = useMemo(() => {
    if (!previewEmployees) return [];
    
    // Parse the preview month string (YYYY-MM)
    const [previewYear, previewMonthNum] = previewMonth.split('-').map(Number);
    const startOfPreviewMonth = new Date(Date.UTC(previewYear, previewMonthNum - 1, 1));
    const endOfPreviewMonth = new Date(Date.UTC(previewYear, previewMonthNum, 0));
    
    return previewEmployees.filter((emp) => {
      // 1. Text Search
      const matchesSearch = 
        emp.name.toLowerCase().includes(previewSearch.toLowerCase()) ||
        emp.employee_code.toLowerCase().includes(previewSearch.toLowerCase());
        
      if (!matchesSearch) return false;

      // 2. Checkbox Filters
      // If "All" is selected and "Modified Inputs Only" is NOT selected, we can bypass the specific sub-filters
      // But typically these filters are cumulative or exclusive. Let's make them inclusive-OR for the categories if selected.
      
      // If Modified Inputs Only is checked, it MUST have monthly input
      if (modifiedOnly && !emp.has_monthly_input) return false;
      
      // If All is checked, we don't filter out based on New/Old/On Notice/Relieving
      if (filterAll) return true;
      
      // If NO sub-filters are checked but All is false, maybe we default to All? 
      // We'll require at least one condition to match if any sub-filter is active.
      const hasActiveSubfilter = filterNew || filterOld || filterNotice || filterRelieving;
      if (!hasActiveSubfilter) return true; // Default behavior if nothing is checked
      
      const joiningDate = emp.joining_date ? new Date(emp.joining_date) : null;
      const relievingDate = emp.relieving_date ? new Date(emp.relieving_date) : null;
      
      let matchesCategory = false;
      
      if (filterNew && joiningDate) {
        if (joiningDate >= startOfPreviewMonth && joiningDate <= endOfPreviewMonth) matchesCategory = true;
      }
      
      if (filterOld && joiningDate) {
        if (joiningDate < startOfPreviewMonth) matchesCategory = true;
      }
      
      if (filterNotice && relievingDate) {
        // On Notice means they are leaving in the future (after the end of the current preview month) or similar
        const now = new Date();
        if (relievingDate > now) matchesCategory = true;
      }
      
      if (filterRelieving) {
        if (emp.preview_status) {
          if (emp.preview_status === 'relieving') matchesCategory = true;
        } else if (relievingDate) {
          if (relievingDate >= startOfPreviewMonth && relievingDate <= endOfPreviewMonth) matchesCategory = true;
        }
      }
      
      return matchesCategory;
    });
  }, [previewEmployees, previewSearch, modifiedOnly, filterAll, filterNew, filterOld, filterNotice, filterRelieving, previewMonth]);

  const paginatedPreview = useMemo(() => {
    const startIndex = previewPage * previewRowsPerPage;
    return filteredPreview.slice(startIndex, startIndex + previewRowsPerPage);
  }, [filteredPreview, previewPage, previewRowsPerPage]);

  const previewLocked = useMemo(() => {
    return Array.isArray(previewEmployees) && previewEmployees.some((e: any) => e.preview_locked);
  }, [previewEmployees]);

  
  const handleDownloadSample = async () => {
    try {
      const response = await api.get('/employees/preview-csv-sample', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'monthly_preview_sample.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      showToast('Failed to download sample CSV', 'error');
    }
  };

  const handleImportCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('month', previewMonth);

    try {
      // Let axios/browser set the multipart Content-Type (including boundary)
      const response = await api.post('/employees/preview-csv-import', formData);
      showToast(`Imported ${response.data.imported} records.`, 'success');
      if (response.data.errors?.length > 0) {
         showToast(response.data.errors.join('\n'), 'warning');
      }
      queryClient.invalidateQueries(['preview-employees', previewMonth]);
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to import CSV';
      showToast(msg, 'error');
    }
    
    if (importCsvRef.current) {
      importCsvRef.current.value = '';
    }
  };

  const handleExportCsv = async () => {
    try {
      const response = await api.get(`/employees/preview-csv-export?month=${previewMonth}`, { responseType: 'blob' });
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `monthly_preview_${previewMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to export CSV';
      showToast(msg, 'error');
    }
  };

  if (!hasPermission(Permission.VIEW_EMPLOYEE)) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          You don't have permission to view the Monthly Preview Sheet.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)' }}>
            Monthly Preview Sheet
          </Typography>
          <Typography variant="body1" sx={{ color: 'var(--color-text-secondary)', mt: 1 }}>
            Review and manage per-employee HR inputs for the selected month before payroll is finalized.
          </Typography>
        </Box>
      </Box>

      {/* Controls */}
      <Paper sx={{ p: 2, mb: 4, borderRadius: 2, bgcolor: 'var(--color-surface)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }} elevation={0}>
        <FormControlLabel control={<Checkbox size="small" checked={modifiedOnly} onChange={(e) => setModifiedOnly(e.target.checked)} />} label={<Typography variant="body2" sx={{ fontWeight: 500 }}>Modified Inputs Only</Typography>} />
        <Divider orientation="vertical" flexItem />
        <FormControlLabel control={<Checkbox size="small" checked={filterAll} onChange={(e) => setFilterAll(e.target.checked)} />} label={<Typography variant="body2">All</Typography>} />
        <FormControlLabel control={<Checkbox size="small" checked={filterNew} onChange={(e) => setFilterNew(e.target.checked)} />} label={<Typography variant="body2">New</Typography>} />
        <FormControlLabel control={<Checkbox size="small" checked={filterOld} onChange={(e) => setFilterOld(e.target.checked)} />} label={<Typography variant="body2">Old</Typography>} />
        <FormControlLabel control={<Checkbox size="small" checked={filterNotice} onChange={(e) => setFilterNotice(e.target.checked)} />} label={<Typography variant="body2">On Notice</Typography>} />
        <FormControlLabel control={<Checkbox size="small" checked={filterRelieving} onChange={(e) => setFilterRelieving(e.target.checked)} />} label={<Typography variant="body2">Relieving</Typography>} />
        
        <Box sx={{ flexGrow: 1 }} />
        
        
        <Button variant="outlined" color="inherit" onClick={handleDownloadSample} sx={{ borderRadius: 2, textTransform: 'none' }} startIcon={<DownloadOutlined />}>Sample CSV</Button>
        <input type="file" accept=".csv" ref={importCsvRef} style={{ display: 'none' }} onChange={handleImportCsv} />
        <Button variant="outlined" color="inherit" onClick={() => importCsvRef.current?.click()} sx={{ borderRadius: 2, textTransform: 'none' }} startIcon={<UploadOutlined />}>Import CSV</Button>
        <Button variant="outlined" color="inherit" onClick={handleExportCsv} sx={{ borderRadius: 2, textTransform: 'none' }} startIcon={<DownloadOutlined />}>Export CSV</Button>
        
        <TextField
          label="Month"
          type="month"
          variant="outlined"
          size="small"
          value={previewMonth}
          onChange={(e) => setPreviewMonth(e.target.value)}
          sx={{ width: 150, ml: 1 }}
        />
      </Paper>

      {/* Table */}
      <Paper sx={{ width: '100%', mb: 2, borderRadius: 2, overflow: 'hidden' }} elevation={0}>
        {isPreviewLoading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography>Loading preview data...</Typography>
          </Box>
        ) : isPreviewError ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="error">Error loading preview data.</Typography>
          </Box>
        ) : (
          <>
            <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
              <Table sx={{ minWidth: 1600 }} size="small">
                <TableHead sx={{ bgcolor: 'var(--color-surface-subtle)' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, fontSize: '11px', color: 'text.secondary', textTransform: 'uppercase' }}>Employee Code</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '11px', color: 'text.secondary', textTransform: 'uppercase' }}>Employee Name</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '11px', color: 'text.secondary', textTransform: 'uppercase' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '11px', color: 'text.secondary', textTransform: 'uppercase' }}>Days Present</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '11px', color: 'text.secondary', textTransform: 'uppercase' }}>Non-Payable Days</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '11px', color: 'text.secondary', textTransform: 'uppercase', textAlign: 'right' }}>Appraisal (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '11px', color: 'text.secondary', textTransform: 'uppercase', textAlign: 'right' }}>Bonus / Incentives (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '11px', color: 'text.secondary', textTransform: 'uppercase', textAlign: 'right' }}>Leave Encashment (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '11px', color: 'text.secondary', textTransform: 'uppercase', textAlign: 'right' }}>Late Arrivals (count)</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '11px', color: 'text.secondary', textTransform: 'uppercase', textAlign: 'right' }}>Damages Recovery (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '11px', color: 'text.secondary', textTransform: 'uppercase', textAlign: 'right' }}>Other Deductions (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '11px', color: 'text.secondary', textTransform: 'uppercase' }}>Remarks</TableCell>
                    {isHRorAdmin && (
                      <TableCell sx={{ fontWeight: 600, fontSize: '11px', color: 'text.secondary', textTransform: 'uppercase', textAlign: 'center' }}>Actions</TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedPreview.map((emp) => (
                    <TableRow key={emp.id} hover onClick={() => handleOpenPreviewEdit(emp)} sx={{ cursor: (emp as any).preview_locked ? 'default' : 'pointer', '& td, & th': { color: 'text.primary' }, '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell sx={{ fontSize: '13px' }}>{emp.employee_code}</TableCell>
                      <TableCell sx={{ fontWeight: 500, fontSize: '13px' }}>{emp.name}</TableCell>
                      <TableCell>
                        {(() => {
                          const status = getPreviewStatus(emp, previewMonth);
                          if (status === 'relieved') return <Chip label="Relieved" size="small" sx={{ bgcolor: 'rgba(148, 163, 184, 0.16)', color: 'text.primary', fontWeight: 600, fontSize: '11px' }} />;
                          if (status === 'relieving') return <Chip label="Relieving" size="small" sx={{ bgcolor: 'rgba(239, 68, 68, 0.16)', color: 'error.main', fontWeight: 600, fontSize: '11px' }} />;
                          if (status === 'on_notice') return <Chip label="On Notice" size="small" sx={{ bgcolor: 'rgba(251, 191, 36, 0.16)', color: 'warning.main', fontWeight: 600, fontSize: '11px' }} />;
                          if (status === 'new') return <Chip label="New" size="small" sx={{ bgcolor: 'rgba(16, 185, 129, 0.16)', color: 'success.main', fontWeight: 600, fontSize: '11px' }} />;
                          return <Chip label="Old" size="small" sx={{ bgcolor: 'rgba(56, 189, 248, 0.16)', color: 'info.main', fontWeight: 600, fontSize: '11px' }} />;
                        })()}
                      </TableCell>
                      <TableCell sx={{ fontSize: '13px' }}>{emp.no_of_days_present ?? getTheoreticalDaysPresent(emp, previewMonth)}</TableCell>
                      <TableCell sx={{ fontSize: '13px' }}>{emp.has_monthly_input ? `${emp.deduction_absent ?? 0}` : '-'}</TableCell>
                      <TableCell align="right">
                        {emp.has_monthly_input ? (
                          <Tooltip title={`Effective: ${emp.appraisal_effective_date ? new Date(emp.appraisal_effective_date).toLocaleDateString() : 'N/A'}`}>
                            <Typography sx={{ fontSize: '13px', fontWeight: 500 }}>₹{Number(emp.appraisal ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                          </Tooltip>
                        ) : (
                          <Typography sx={{ color: 'text.disabled', fontSize: '13px' }}>-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '13px' }}>{emp.has_monthly_input ? `₹${Number(emp.bonus_incentives ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</TableCell>
                      <TableCell align="right" sx={{ fontSize: '13px' }}>{emp.has_monthly_input ? `₹${Number(emp.leave_encashment ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</TableCell>
                      <TableCell align="right" sx={{ fontSize: '13px' }}>
                        {emp.has_monthly_input ? `${Number(emp.late_arrival_deduction ?? 0).toFixed(0)} (→ ${Math.floor(Number(emp.late_arrival_deduction || 0) / 3) * 0.5} days)` : '-'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '13px' }}>{emp.has_monthly_input ? `₹${Number(emp.damages_recovery ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</TableCell>
                      <TableCell align="right" sx={{ fontSize: '13px' }}>{emp.has_monthly_input ? `₹${Number(emp.other_deductions ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</TableCell>
                      <TableCell sx={{ maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '13px' }}>
                        {emp.has_monthly_input ? (emp.remarks || '-') : '-'}
                      </TableCell>
                      {isHRorAdmin && (
                        <TableCell align="center">
                          <IconButton size="small" onClick={() => handleOpenPreviewEdit(emp)} sx={{ color: 'primary.main' }} disabled={(emp as any).preview_locked}>
                            <EditOutlined fontSize="small" />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {filteredPreview.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} align="center" sx={{ py: 3 }}>
                        <Typography color="text.secondary">No employees found.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50]}
              component="div"
              count={filteredPreview.length}
              rowsPerPage={previewRowsPerPage}
              page={previewPage}
              onPageChange={(_, newPage) => setPreviewPage(newPage)}
              onRowsPerPageChange={(event) => {
                setPreviewRowsPerPage(parseInt(event.target.value, 10));
                setPreviewPage(0);
              }}
            />
          </>
        )}
      </Paper>

      {/* Edit Dialog */}
      <Dialog open={openPreviewEditDialog} onClose={() => setOpenPreviewEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 600 }}>
          Edit HR Inputs - {previewEditEmp?.name}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* ... form fields similar to Employees.tsx preview dialog ... */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Non-Payable Days"
                fullWidth
                type="number"
                value={previewEditFormData.deduction_absent}
                onChange={(e) => setPreviewEditFormData({ ...previewEditFormData, deduction_absent: e.target.value })}
                InputProps={{ endAdornment: <InputAdornment position="end">days</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Leave Encashment"
                fullWidth
                type="number"
                value={previewEditFormData.leave_encashment}
                onChange={(e) => setPreviewEditFormData({ ...previewEditFormData, leave_encashment: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Late Arrivals (count)"
                fullWidth
                type="number"
                value={previewEditFormData.late_arrival_deduction}
                onChange={(e) => setPreviewEditFormData({ ...previewEditFormData, late_arrival_deduction: e.target.value })}
                InputProps={{ endAdornment: <InputAdornment position="end">occurrences</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Damages Recovery"
                fullWidth
                type="number"
                value={previewEditFormData.damages_recovery}
                onChange={(e) => setPreviewEditFormData({ ...previewEditFormData, damages_recovery: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Bonus / Incentives"
                fullWidth
                type="number"
                value={previewEditFormData.bonus_incentives}
                onChange={(e) => setPreviewEditFormData({ ...previewEditFormData, bonus_incentives: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Other Deductions"
                fullWidth
                type="number"
                value={previewEditFormData.other_deductions}
                onChange={(e) => setPreviewEditFormData({ ...previewEditFormData, other_deductions: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Appraisal Amount"
                fullWidth
                type="number"
                value={previewEditFormData.appraisal}
                onChange={(e) => setPreviewEditFormData({ ...previewEditFormData, appraisal: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Appraisal Effective Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={previewEditFormData.appraisal_effective_date}
                onChange={(e) => setPreviewEditFormData({ ...previewEditFormData, appraisal_effective_date: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Remarks"
                fullWidth
                multiline
                rows={2}
                value={previewEditFormData.remarks}
                onChange={(e) => setPreviewEditFormData({ ...previewEditFormData, remarks: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: 'var(--color-surface-subtle)' }}>
          <Button onClick={() => setOpenPreviewEditDialog(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleSavePreviewEdit}
            variant="contained"
            disabled={savePreviewInputMutation.isLoading}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            {savePreviewInputMutation.isLoading ? 'Saving...' : 'Save Inputs'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Review Status and Logs */}
      <Paper sx={{ p: 3, mt: 4, borderRadius: 2, bgcolor: 'var(--color-surface)' }} elevation={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="subtitle2" fontWeight="bold">HR Preview Status</Typography>
            <Typography variant="body2" color="text.secondary">
              {previewReview?.status === 'done' ? 'Marked done. Handed off to Finance.' : 'Marked undone. Finance should wait for HR completion.'}
            </Typography>
          </Box>
          <Button 
            variant="contained" 
            color="primary" 
            sx={{ borderRadius: 2, textTransform: 'none', px: 3, fontWeight: 600 }}
            disabled={updateReviewStatusMutation.isLoading || previewLocked}
            onClick={() => updateReviewStatusMutation.mutate(previewReview?.status === 'done' ? 'undone' : 'done')}
          >
            {previewReview?.status === 'done' ? 'Mark Undone' : 'Mark Done'}
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mt: 2, mb: 4, borderRadius: 2, bgcolor: 'var(--color-surface)' }} elevation={0}>
        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Sheet Activity Logs</Typography>
        {previewReview?.logs && previewReview.logs.length > 0 ? (
          previewReview.logs.map((log: any, idx: number) => (
            <Typography key={idx} variant="body2" color="text.secondary">
              {new Date(log.created_at).toLocaleString()}: {log.email || 'System'} changed status from {log.from} to {log.to}.
            </Typography>
          ))
        ) : (
          <Typography variant="body2" color="text.secondary">No activity logs yet.</Typography>
        )}
      </Paper>

    </Box>
  );
};

export default PreviewSheet;
