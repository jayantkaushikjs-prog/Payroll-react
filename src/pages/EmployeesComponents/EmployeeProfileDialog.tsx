import React from 'react';
import {
  Box, Button, TextField, Typography, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, InputAdornment, Tooltip, Grid,
  FormControlLabel, Switch, CircularProgress, Divider,
  Autocomplete, Tabs, Tab, Select, MenuItem,
  FormControl, InputLabel, Popover,
} from '@mui/material';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip as ChartTooltip, Legend,
  PieChart, Pie, Cell, CartesianGrid,
} from 'recharts';
import {
  Add as AddIcon, Edit as EditIcon,
  Download as DownloadIcon, HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import { formatCurrency, formatCurrencyCrores } from '../../constants/currency';
import {
  Employee, ProfileFormData, isPfRequiredByWageLimit,
  getBasicSalaryFromMonthlyCtc, formatMonthLabel
} from '../../utils/employeeUtils';
import { EmployeeService } from '../../services/employee.service';

interface EmployeeProfileDialogProps {
  openProfileDialog: boolean;
  setOpenProfileDialog: (open: boolean) => void;
  profileFormData: ProfileFormData;
  setProfileFormData: (data: ProfileFormData | ((prev: ProfileFormData) => ProfileFormData)) => void;
  profileEmpId: number | '';
  profileDialogTab: number;
  setProfileDialogTab: (tab: number) => void;
  profileSummary: any;
  isLoadingProfileSummary: boolean;
  profileViewMode: 'monthly' | 'annual';
  setProfileViewMode: (mode: 'monthly' | 'annual') => void;
  profileStartDate: string;
  profileEndDate: string;
  setProfileStartDate: (date: string) => void;
  setProfileEndDate: (date: string) => void;
  tempStartDate: string;
  tempEndDate: string;
  setTempStartDate: (date: string) => void;
  setTempEndDate: (date: string) => void;
  activeRangePreset: string;
  setActiveRangePreset: (preset: string) => void;
  profileTenureAnchorEl: null | HTMLElement;
  setProfileTenureAnchorEl: (el: null | HTMLElement) => void;
  applyProfileRange: (start: string, end: string, preset: string) => void;
  toDateInputValue: (date: Date) => string;
  handleProfileFormSubmit: (e: React.FormEvent) => void;
  handleExportFinancials: () => void;
  handleGenerateCodeForProfile: () => void;
  exportStartYear: number;
  exportEndYear: number;
  setExportStartYear: (year: number) => void;
  setExportEndYear: (year: number) => void;
  updateProfileMutation: any;
  isHRorAdmin: boolean | null | undefined;
  employees: Employee[];
  profileDeptOptions: string[];
  profileDesigOptions: string[];
  allDepartments: string[];
  allDesignations: string[];
  addDepartmentMutation: any;
  addDesignationMutation: any;
  liveSummary: any;
  annualize: (value: number, months: number) => number;
  annualizeRemaining: (value: number, months: number) => number;
  formatSummaryValue: (value: number) => string;
  computeEmployerPf: (monthlyCtc: string | number, pfDeduction: boolean) => number;
  computeEmployerEsi: (monthlyCtc: string | number) => number;
  inputStyles: any;
  dropdownListStyles: any;
}

export const EmployeeProfileDialog: React.FC<EmployeeProfileDialogProps> = ({
  openProfileDialog, setOpenProfileDialog,
  profileFormData, setProfileFormData,
  profileEmpId,
  profileDialogTab, setProfileDialogTab,
  profileSummary, isLoadingProfileSummary,
  profileViewMode, setProfileViewMode,
  profileStartDate, profileEndDate,
  setProfileStartDate, setProfileEndDate,
  tempStartDate, tempEndDate,
  setTempStartDate, setTempEndDate,
  activeRangePreset, setActiveRangePreset,
  profileTenureAnchorEl, setProfileTenureAnchorEl,
  applyProfileRange, toDateInputValue,
  handleProfileFormSubmit, handleExportFinancials,
  handleGenerateCodeForProfile,
  exportStartYear, exportEndYear,
  setExportStartYear, setExportEndYear,
  updateProfileMutation,
  isHRorAdmin, employees,
  profileDeptOptions, profileDesigOptions,
  allDepartments, allDesignations,
  addDepartmentMutation, addDesignationMutation,
  liveSummary, annualize, annualizeRemaining,
  formatSummaryValue,
  computeEmployerPf, computeEmployerEsi,
  inputStyles, dropdownListStyles,
}) => {
  const currentYear = new Date().getFullYear();

  return (
    <>
      <Dialog
        open={openProfileDialog}
        onClose={() => setOpenProfileDialog(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-card)",
            boxShadow: "var(--shadow-card)",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: "Outfit",
            fontWeight: 600,
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            pb: 2,
          }}
        >
          <Typography
            variant="h6"
            fontWeight="bold"
            fontFamily="Outfit"
            sx={{ color: "var(--color-text-primary)" }}
          >
            {profileFormData.name
              ? `${profileFormData.name}'s Profile & Financial Summary`
              : "Employee Profile & Financial Summary"}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          {!profileEmpId ? (
            <Box
              sx={{
                py: 4,
                textAlign: "center",
                color: "var(--color-text-secondary)",
              }}
            >
              No employee selected.
            </Box>
          ) : (
            <Grid container spacing={3.5}>
              {/* Left Column: Editable HR & Bank Details */}
              <Grid item xs={12} lg={5}>
                <Paper
                  sx={{
                    p: 3,
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-card)",
                    background: "var(--color-surface-subtle)",
                  }}
                >
                  {/* <Typography variant="subtitle1" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)', mb: 1 }}>
                    HR Profile Details
                  </Typography> */}

                  <Box
                    sx={{
                      borderBottom: 1,
                      borderColor: "var(--color-border)",
                      mb: 2.5,
                    }}
                  >
                    <Tabs
                      value={profileDialogTab}
                      onChange={(_, newValue) => setProfileDialogTab(newValue)}
                      sx={{
                        "& .MuiTab-root": {
                          textTransform: "none",
                          fontWeight: 600,
                          fontFamily: "Outfit",
                          fontSize: "0.875rem",
                          color: "var(--color-text-secondary)",
                          minWidth: "auto",
                          px: 2,
                          pb: 1,
                          "&.Mui-selected": {
                            color: "var(--color-primary-hover)",
                          },
                        },
                        "& .MuiTabs-indicator": {
                          backgroundColor: "var(--color-primary)",
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
                            onChange={(e) =>
                              setProfileFormData({
                                ...profileFormData,
                                employee_code: e.target.value,
                              })
                            }
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
                            onChange={(e) =>
                              setProfileFormData({
                                ...profileFormData,
                                name: e.target.value,
                              })
                            }
                            sx={inputStyles}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Official Email"
                            fullWidth
                            required
                            type="email"
                            autoComplete="off"
                            disabled={!isHRorAdmin}
                            value={profileFormData.email}
                            onChange={(e) =>
                              setProfileFormData({
                                ...profileFormData,
                                email: e.target.value,
                              })
                            }
                            sx={inputStyles}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Personal Email"
                            fullWidth
                            type="email"
                            required
                            autoComplete="off"
                            disabled={!isHRorAdmin}
                            value={profileFormData.personal_email}
                            onChange={(e) =>
                              setProfileFormData({
                                ...profileFormData,
                                personal_email: e.target.value,
                              })
                            }
                            sx={inputStyles}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Phone Number"
                            fullWidth
                            disabled={!isHRorAdmin}
                            value={profileFormData.phone}
                            onChange={(e) =>
                              setProfileFormData({
                                ...profileFormData,
                                phone: e.target.value,
                              })
                            }
                            sx={inputStyles}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Autocomplete
                            freeSolo
                            options={profileDeptOptions}
                            value={profileFormData.department || null}
                            disabled={!isHRorAdmin}
                            onChange={(_, value) => {
                              const val =
                                typeof value === "string" ? value : value || "";
                              setProfileFormData({
                                ...profileFormData,
                                department: val,
                              });
                              if (val && !allDepartments.includes(val)) {
                                addDepartmentMutation.mutate(val);
                              }
                            }}
                            onInputChange={(_, newInputValue) => {
                              setProfileFormData({
                                ...profileFormData,
                                department: newInputValue,
                              });
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Department"
                                required
                                sx={inputStyles}
                              />
                            )}
                            ListboxProps={{ sx: dropdownListStyles }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Autocomplete
                            freeSolo
                            options={profileDesigOptions}
                            value={profileFormData.designation || null}
                            disabled={!isHRorAdmin}
                            onChange={(_, value) => {
                              const val =
                                typeof value === "string" ? value : value || "";
                              setProfileFormData({
                                ...profileFormData,
                                designation: val,
                              });
                              if (val && !allDesignations.includes(val)) {
                                addDesignationMutation.mutate(val);
                              }
                            }}
                            onInputChange={(_, newInputValue) => {
                              setProfileFormData({
                                ...profileFormData,
                                designation: newInputValue,
                              });
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Designation"
                                required
                                sx={inputStyles}
                              />
                            )}
                            ListboxProps={{ sx: dropdownListStyles }}
                          />
                        </Grid>

                        <Grid item xs={12} sm={4}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={
                                  profileFormData.pf_deduction ||
                                  isPfRequiredByWageLimit(
                                    employees.find(
                                      (e: Employee) => e.id === profileEmpId,
                                    )?.monthly_ctc,
                                  )
                                }
                                disabled={
                                  !isHRorAdmin ||
                                  isPfRequiredByWageLimit(
                                    employees.find(
                                      (e: Employee) => e.id === profileEmpId,
                                    )?.monthly_ctc,
                                  )
                                }
                                onChange={(e) => {
                                  const pfRequired = isPfRequiredByWageLimit(
                                    employees.find(
                                      (emp: Employee) =>
                                        emp.id === profileEmpId,
                                    )?.monthly_ctc,
                                  );
                                  setProfileFormData({
                                    ...profileFormData,
                                    pf_deduction:
                                      pfRequired || e.target.checked,
                                  });
                                }}
                                sx={{
                                  "& .MuiSwitch-switchBase.Mui-checked": {
                                    color: "var(--color-primary)",
                                  },
                                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                                    { bgcolor: "var(--color-primary)" },
                                }}
                              />
                            }
                            label="PF"
                            sx={{
                              color: "var(--color-text-secondary)",
                              "& .MuiFormControlLabel-label": {
                                fontSize: "0.8rem",
                              },
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={8}>
                          {(() => {
                            const emp = employees.find(
                              (e: any) => e.id === profileEmpId,
                            );
                            const pfApplies =
                              profileFormData.pf_deduction ||
                              isPfRequiredByWageLimit(emp?.monthly_ctc);
                            const uan = profileFormData.pf_uan.trim();
                            const uanError =
                              (uan && !/^\d{12}$/.test(uan)) ||
                              (pfApplies && !uan);
                            return (
                              <TextField
                                label={`PF No. / UAN${pfApplies ? " *" : ""}`}
                                fullWidth
                                disabled={!isHRorAdmin}
                                value={profileFormData.pf_uan}
                                onChange={(e) => {
                                  const val = e.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 12);
                                  setProfileFormData({
                                    ...profileFormData,
                                    pf_uan: val,
                                  });
                                }}
                                error={uanError}
                                helperText={
                                  pfApplies && !uan
                                    ? "UAN is required"
                                    : uan && !/^\d{12}$/.test(uan)
                                      ? "UAN must be exactly 12 digits"
                                      : ""
                                }
                                inputProps={{
                                  maxLength: 12,
                                  inputMode: "numeric",
                                }}
                                sx={inputStyles}
                              />
                            );
                          })()}
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
                            onChange={(e) =>
                              setProfileFormData({
                                ...profileFormData,
                                joining_date: e.target.value,
                              })
                            }
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
                            onChange={(e) =>
                              setProfileFormData({
                                ...profileFormData,
                                relieving_date: e.target.value,
                              })
                            }
                            sx={inputStyles}
                          />
                        </Grid>

                        <Grid item xs={12} sx={{ mt: 1 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              color: "var(--color-primary-hover)",
                              fontWeight: 600,
                            }}
                          >
                            BANK ACCOUNT DETAILS
                          </Typography>
                          <Divider
                            sx={{
                              borderColor: "var(--color-border)",
                              mt: 0.5,
                              mb: 1.5,
                            }}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            label="Bank Name"
                            fullWidth
                            required
                            disabled={!isHRorAdmin}
                            value={profileFormData.bank_name}
                            onChange={(e) =>
                              setProfileFormData({
                                ...profileFormData,
                                bank_name: e.target.value,
                              })
                            }
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
                            onChange={(e) =>
                              setProfileFormData({
                                ...profileFormData,
                                account_number: e.target.value,
                              })
                            }
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
                            onChange={(e) =>
                              setProfileFormData({
                                ...profileFormData,
                                ifsc: e.target.value,
                              })
                            }
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
                            background: "var(--color-primary)",
                            borderRadius: "var(--radius-control)",
                            py: 1.2,
                            textTransform: "none",
                            fontWeight: 600,
                          }}
                        >
                          {updateProfileMutation.isLoading
                            ? "Saving..."
                            : "Save Profile Changes"}
                        </Button>
                      </Box>
                    )}
                  </form>
                </Paper>
              </Grid>

              {/* Right Column: Financial Summary & Graphical Charts */}
              <Grid item xs={12} lg={7}>
                {isLoadingProfileSummary ? (
                  <Box
                    sx={{ display: "flex", justifyContent: "center", py: 8 }}
                  >
                    <CircularProgress
                      size={40}
                      sx={{ color: "var(--color-primary)" }}
                    />
                  </Box>
                ) : !liveSummary ? (
                  <Paper
                    sx={{
                      p: 4,
                      textAlign: "center",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-card)",
                      background: "var(--color-surface)",
                    }}
                  >
                    <Typography sx={{ color: "var(--color-text-secondary)" }}>
                      No summary details available for this year.
                    </Typography>
                  </Paper>
                ) : (
                  <Box>
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 3,
                        gap: 2,
                      }}
                    >
                      <Typography
                        variant="subtitle1"
                        fontWeight="bold"
                        sx={{
                          color: "var(--color-text-primary)",
                          fontFamily: "Outfit",
                        }}
                      >
                        Live Payroll Summary
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          flexWrap: "wrap",
                        }}
                      >
                        {/* Date Range Picker Button */}
                        <Button
                          size="small"
                          onClick={(e) => {
                            setTempStartDate(profileStartDate);
                            setTempEndDate(profileEndDate);
                            setProfileTenureAnchorEl(e.currentTarget);
                          }}
                          endIcon={
                            <span style={{ fontSize: "0.65rem", opacity: 0.6 }}>
                              â–¼
                            </span>
                          }
                          sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            px: 1.5,
                            py: 0.6,
                            fontSize: "0.8rem",
                            borderRadius: "var(--radius-control)",
                            color: "var(--color-text-secondary)",
                            border: "1px solid var(--color-border)",
                            bgcolor: "var(--color-surface-subtle)",
                            "&:hover": {
                              bgcolor: "rgba(255,255,255,0.05)",
                              color: "var(--color-text-primary)",
                              borderColor: "var(--color-border-strong)",
                            },
                          }}
                        >
                          Select Date Range
                        </Button>

                        {/* Range Popover */}
                        <Popover
                          anchorEl={profileTenureAnchorEl}
                          open={Boolean(profileTenureAnchorEl)}
                          onClose={() => setProfileTenureAnchorEl(null)}
                          anchorOrigin={{
                            vertical: "bottom",
                            horizontal: "left",
                          }}
                          transformOrigin={{
                            vertical: "top",
                            horizontal: "left",
                          }}
                          PaperProps={{
                            sx: {
                              mt: 1,
                              p: 2.5,
                              width: 360,
                              background: "var(--color-surface)",
                              border: "1px solid var(--color-border)",
                              borderRadius: "var(--radius-card)",
                              boxShadow: "var(--shadow-card)",
                            },
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              color: "var(--color-text-secondary)",
                              fontWeight: 700,
                              letterSpacing: "0.06em",
                              mb: 1.5,
                              display: "block",
                            }}
                          >
                            QUICK SELECT
                          </Typography>
                          <Box
                            sx={{
                              display: "grid",
                              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                              gap: 1,
                              mb: 2.5,
                            }}
                          >
                            {[
                              {
                                label: "This FY",
                                preset: "thisfy",
                                start:
                                  new Date().getMonth() >= 3
                                    ? `${currentYear}-04-01`
                                    : `${currentYear - 1}-04-01`,
                                end:
                                  new Date().getMonth() >= 3
                                    ? `${currentYear + 1}-03-31`
                                    : `${currentYear}-03-31`,
                              },
                              {
                                label: "Last FY",
                                preset: "lastfy",
                                start:
                                  new Date().getMonth() >= 3
                                    ? `${currentYear - 1}-04-01`
                                    : `${currentYear - 2}-04-01`,
                                end:
                                  new Date().getMonth() >= 3
                                    ? `${currentYear}-03-31`
                                    : `${currentYear - 1}-03-31`,
                              },
                              {
                                label: "Last 6M",
                                preset: "l6m",
                                start: toDateInputValue(
                                  new Date(
                                    new Date().setMonth(
                                      new Date().getMonth() - 6,
                                    ),
                                  ),
                                ),
                                end: toDateInputValue(new Date()),
                              },
                              {
                                label: "Last 3M",
                                preset: "l3m",
                                start: toDateInputValue(
                                  new Date(
                                    new Date().setMonth(
                                      new Date().getMonth() - 3,
                                    ),
                                  ),
                                ),
                                end: toDateInputValue(new Date()),
                              },
                            ].map(({ label, preset, start, end }) => (
                              <Button
                                key={preset}
                                size="small"
                                onClick={() =>
                                  applyProfileRange(start, end, preset)
                                }
                                sx={{
                                  textTransform: "none",
                                  justifyContent: "center",
                                  borderRadius: "var(--radius-control)",
                                  border: "1px solid",
                                  borderColor:
                                    activeRangePreset === preset
                                      ? "var(--color-primary)"
                                      : "var(--color-border)",
                                  bgcolor:
                                    activeRangePreset === preset
                                      ? "rgba(99,102,241,0.15)"
                                      : "transparent",
                                  color:
                                    activeRangePreset === preset
                                      ? "var(--color-primary-hover)"
                                      : "var(--color-text-secondary)",
                                  fontWeight: 600,
                                  py: 0.9,
                                  "&:hover": {
                                    borderColor: "var(--color-primary)",
                                    color: "var(--color-primary-hover)",
                                    bgcolor: "rgba(99,102,241,0.08)",
                                  },
                                }}
                              >
                                {label}
                              </Button>
                            ))}
                          </Box>

                          <Typography
                            variant="caption"
                            sx={{
                              color: "var(--color-text-secondary)",
                              fontWeight: 700,
                              letterSpacing: "0.06em",
                              mb: 1.5,
                              display: "block",
                            }}
                          >
                            CUSTOM RANGE
                          </Typography>
                          <Box
                            sx={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: 1.5,
                              mb: 2.5,
                            }}
                          >
                            <TextField
                              type="date"
                              label="Start Date"
                              value={tempStartDate}
                              onChange={(e) => {
                                setTempStartDate(e.target.value);
                                setActiveRangePreset("custom");
                              }}
                              InputLabelProps={{ shrink: true }}
                              size="small"
                              sx={inputStyles}
                            />
                            <TextField
                              type="date"
                              label="End Date"
                              value={tempEndDate}
                              onChange={(e) => {
                                setTempEndDate(e.target.value);
                                setActiveRangePreset("custom");
                              }}
                              InputLabelProps={{ shrink: true }}
                              size="small"
                              sx={inputStyles}
                            />
                          </Box>

                          <Box
                            sx={{
                              display: "flex",
                              gap: 1,
                              justifyContent: "flex-end",
                            }}
                          >
                            <Button
                              size="small"
                              onClick={() => setProfileTenureAnchorEl(null)}
                              sx={{
                                textTransform: "none",
                                color: "var(--color-text-secondary)",
                                fontWeight: 600,
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              disabled={
                                !tempStartDate ||
                                !tempEndDate ||
                                tempStartDate > tempEndDate
                              }
                              onClick={() => {
                                setProfileStartDate(tempStartDate);
                                setProfileEndDate(tempEndDate);
                                setProfileTenureAnchorEl(null);
                              }}
                              sx={{
                                textTransform: "none",
                                fontWeight: 600,
                                background: "var(--color-primary)",
                                borderRadius: "var(--radius-control)",
                                px: 2.5,
                                "&:hover": {
                                  background: "var(--color-primary-hover)",
                                },
                              }}
                            >
                              Apply
                            </Button>
                          </Box>
                        </Popover>

                        {/* Annual / Monthly Toggle */}
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            bgcolor: "var(--color-surface-subtle)",
                            p: 0.5,
                            borderRadius: "var(--radius-control)",
                            border: "1px solid var(--color-border)",
                          }}
                        >
                          <Button
                            size="small"
                            onClick={() => setProfileViewMode("monthly")}
                            sx={{
                              textTransform: "none",
                              fontWeight: 600,
                              px: 2,
                              py: 0.4,
                              borderRadius: "calc(var(--radius-control) - 2px)",
                              color:
                                profileViewMode === "monthly"
                                  ? "#fff"
                                  : "var(--color-text-secondary)",
                              background:
                                profileViewMode === "monthly"
                                  ? "var(--color-primary)"
                                  : "transparent",
                              "&:hover": {
                                background:
                                  profileViewMode === "monthly"
                                    ? "var(--color-primary-hover)"
                                    : "rgba(255,255,255,0.04)",
                              },
                            }}
                          >
                            Monthly
                          </Button>
                          <Button
                            size="small"
                            onClick={() => setProfileViewMode("annual")}
                            sx={{
                              textTransform: "none",
                              fontWeight: 600,
                              px: 2,
                              py: 0.4,
                              borderRadius: "calc(var(--radius-control) - 2px)",
                              color:
                                profileViewMode === "annual"
                                  ? "#fff"
                                  : "var(--color-text-secondary)",
                              background:
                                profileViewMode === "annual"
                                  ? "var(--color-primary)"
                                  : "transparent",
                              "&:hover": {
                                background:
                                  profileViewMode === "annual"
                                    ? "var(--color-primary-hover)"
                                    : "rgba(255,255,255,0.04)",
                              },
                            }}
                          >
                            Annual
                          </Button>
                        </Box>

                        <Button
                          variant="contained"
                          size="small"
                          onClick={handleExportFinancials}
                          startIcon={<DownloadIcon />}
                          sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            height: "34px",
                            borderRadius: "var(--radius-control)",
                            background: "var(--color-primary)",
                            "&:hover": {
                              background: "var(--color-primary-hover)",
                            },
                          }}
                        >
                          Export CSV
                        </Button>
                      </Box>
                    </Box>

                    <Grid container spacing={3}>
                      {/* Top Stats */}
                      <Grid item xs={12} sm={6}>
                        <Paper
                          sx={{
                            p: 2.5,
                            background: "rgba(16, 185, 129, 0.08)",
                            border: "1px solid rgba(16, 185, 129, 0.2)",
                            borderRadius: "var(--radius-control)",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                color: "var(--color-success)",
                                fontWeight: 600,
                              }}
                            >
                              {profileViewMode === "annual"
                                ? "PAYROLL PAID"
                                : "AVG MONTHLY PAID"}
                            </Typography>
                            <Tooltip
                              title={`From posted payroll calculations in the selected range. PF: ${formatCurrency(liveSummary.pfPaid)}, ESI: ${formatCurrency(liveSummary.esiPaid)}, Tax: ${formatCurrency(liveSummary.taxPaid)}.`}
                              arrow
                            >
                              <IconButton
                                size="small"
                                sx={{ p: 0.2, color: "var(--color-success)" }}
                              >
                                <HelpOutlineIcon sx={{ fontSize: "1rem" }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                          <Typography
                            variant="h4"
                            sx={{
                              color: "var(--color-success)",
                              fontWeight: "bold",
                              fontFamily: "Outfit",
                              mt: 1,
                              fontSize: {
                                xs: "1.05rem",
                                sm: "1.3rem",
                                md: "1.6rem",
                              },
                              lineHeight: 1.2,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {profileViewMode === "annual"
                              ? formatSummaryValue(
                                annualize(
                                  liveSummary.paidTotal,
                                  liveSummary.paidMonths,
                                ),
                              )
                              : formatSummaryValue(
                                Number(liveSummary.paidMonthly.toFixed(2)),
                              )}
                          </Typography>
                        </Paper>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Paper
                          sx={{
                            p: 2.5,
                            background: "rgba(59, 130, 246, 0.08)",
                            border: "1px solid rgba(59, 130, 246, 0.2)",
                            borderRadius: "var(--radius-control)",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                color: "var(--color-primary-hover)",
                                fontWeight: 600,
                              }}
                            >
                              {profileViewMode === "annual"
                                ? "PROJECTED REMAINING PAYOUT"
                                : "LIVE MONTHLY PAYOUT"}
                            </Typography>
                            <Tooltip
                              title={`Projected from current employee inputs, preview sheet inputs, payroll rules, advances, and salary structure revisions. PF: ${formatCurrency(liveSummary.pfRemaining)}, ESI: ${formatCurrency(liveSummary.esiRemaining)}, Tax: ${formatCurrency(liveSummary.taxRemaining)}.`}
                              arrow
                            >
                              <IconButton
                                size="small"
                                sx={{
                                  p: 0.2,
                                  color: "var(--color-primary-hover)",
                                }}
                              >
                                <HelpOutlineIcon sx={{ fontSize: "1rem" }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                          <Typography
                            variant="h4"
                            sx={{
                              color: "var(--color-primary-hover)",
                              fontWeight: "bold",
                              fontFamily: "Outfit",
                              mt: 1,
                              fontSize: {
                                xs: "1.05rem",
                                sm: "1.3rem",
                                md: "1.6rem",
                              },
                              lineHeight: 1.2,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {profileViewMode === "annual"
                              ? formatSummaryValue(
                                liveSummary.estimatedMonthlyPayout * 12,
                              )
                              : formatSummaryValue(
                                liveSummary.estimatedMonthlyPayout,
                              )}
                          </Typography>
                        </Paper>
                      </Grid>

                      {/* Consolidated Deductions & Tax Summary */}
                      <Grid item xs={12}>
                        <Paper
                          sx={{
                            p: 3,
                            border: "1px solid var(--color-border)",
                            borderRadius: "var(--radius-control)",
                            background: "var(--color-surface-subtle)",
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            sx={{
                              color: "var(--color-primary-hover)",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              mb: 2.5,
                            }}
                          >
                            Deductions & Statutory Summary
                          </Typography>
                          <Grid container spacing={3}>
                            {/* Employee PF */}
                            <Grid item xs={6} sm={4} md={2.4}>
                              <Box>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: "var(--color-text-secondary)",
                                    fontWeight: 600,
                                    display: "block",
                                    mb: 0.8,
                                  }}
                                >
                                  Employee PF
                                </Typography>
                                <Typography
                                  variant="body2"
                                  fontWeight="bold"
                                  sx={{ color: "var(--color-text-primary)", mb: 0.5 }}
                                >
                                  {profileViewMode === "annual"
                                    ? `${formatSummaryValue(annualize(liveSummary.pfPaid, liveSummary.paidMonths))} / ${formatSummaryValue(annualizeRemaining(liveSummary.pfRemaining, liveSummary.remainingMonths))}`
                                    : `${formatSummaryValue(liveSummary.pfPaid / Math.max(1, liveSummary.paidMonths))} / ${formatSummaryValue(liveSummary.pfRemaining / Math.max(1, liveSummary.remainingMonths))}`}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "var(--color-text-secondary)", fontSize: "0.7rem" }}>
                                  {profileViewMode === "annual" ? "Paid / Remaining" : "Paid / Live"}
                                </Typography>
                              </Box>
                            </Grid>

                            {/* Employer PF */}
                            <Grid item xs={6} sm={4} md={2.4}>
                              <Box>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: "var(--color-text-secondary)",
                                    fontWeight: 600,
                                    display: "block",
                                    mb: 0.8,
                                  }}
                                >
                                  Employer PF
                                </Typography>
                                <Typography
                                  variant="body2"
                                  fontWeight="bold"
                                  sx={{ color: "var(--color-text-primary)", mb: 0.5 }}
                                >
                                  {formatSummaryValue(
                                    profileViewMode === "annual"
                                      ? computeEmployerPf(profileFormData.monthly_ctc, profileFormData.pf_deduction) * 12
                                      : computeEmployerPf(profileFormData.monthly_ctc, profileFormData.pf_deduction)
                                  )}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "var(--color-text-secondary)", fontSize: "0.7rem" }}>
                                  Contribution
                                </Typography>
                              </Box>
                            </Grid>

                            {/* Employee ESI */}
                            <Grid item xs={6} sm={4} md={2.4}>
                              <Box>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: "var(--color-text-secondary)",
                                    fontWeight: 600,
                                    display: "block",
                                    mb: 0.8,
                                  }}
                                >
                                  Employee ESI
                                </Typography>
                                <Typography
                                  variant="body2"
                                  fontWeight="bold"
                                  sx={{ color: "var(--color-text-primary)", mb: 0.5 }}
                                >
                                  {profileViewMode === "annual"
                                    ? `${formatSummaryValue(annualize(liveSummary.esiPaid, liveSummary.paidMonths))} / ${formatSummaryValue(annualizeRemaining(liveSummary.esiRemaining, liveSummary.remainingMonths))}`
                                    : `${formatSummaryValue(liveSummary.esiPaid / Math.max(1, liveSummary.paidMonths))} / ${formatSummaryValue(liveSummary.esiRemaining / Math.max(1, liveSummary.remainingMonths))}`}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "var(--color-text-secondary)", fontSize: "0.7rem" }}>
                                  {profileViewMode === "annual" ? "Paid / Remaining" : "Paid / Live"}
                                </Typography>
                              </Box>
                            </Grid>

                            {/* Employer ESI - Conditional */}
                            {computeEmployerEsi(profileFormData.monthly_ctc) > 0 && (
                              <Grid item xs={6} sm={4} md={2.4}>
                                <Box>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: "var(--color-text-secondary)",
                                      fontWeight: 600,
                                      display: "block",
                                      mb: 0.8,
                                    }}
                                  >
                                    Employer ESI
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    fontWeight="bold"
                                    sx={{ color: "var(--color-text-primary)", mb: 0.5 }}
                                  >
                                    {formatSummaryValue(
                                      profileViewMode === "annual"
                                        ? computeEmployerEsi(profileFormData.monthly_ctc) * 12
                                        : computeEmployerEsi(profileFormData.monthly_ctc)
                                    )}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: "var(--color-text-secondary)", fontSize: "0.7rem" }}>
                                    Contribution
                                  </Typography>
                                </Box>
                              </Grid>
                            )}

                            {/* TDS */}
                            <Grid item xs={6} sm={4} md={2.4}>
                              <Box>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: "var(--color-text-secondary)",
                                    fontWeight: 600,
                                    display: "block",
                                    mb: 0.8,
                                  }}
                                >
                                  TDS
                                </Typography>
                                <Typography
                                  variant="body2"
                                  fontWeight="bold"
                                  sx={{ color: "var(--color-text-primary)", mb: 0.5 }}
                                >
                                  {profileViewMode === "annual"
                                    ? `${formatSummaryValue(annualize(liveSummary.taxPaid, liveSummary.paidMonths))} / ${formatSummaryValue(annualizeRemaining(liveSummary.taxRemaining, liveSummary.remainingMonths))}`
                                    : `${formatSummaryValue(liveSummary.taxPaid / Math.max(1, liveSummary.paidMonths))} / ${formatSummaryValue(liveSummary.taxRemaining / Math.max(1, liveSummary.remainingMonths))}`}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "var(--color-text-secondary)", fontSize: "0.7rem" }}>
                                  {profileViewMode === "annual" ? "Paid / Remaining" : "Paid / Live"}
                                </Typography>
                              </Box>
                            </Grid>

                            {/* Professional Tax */}
                            <Grid item xs={6} sm={4} md={2.4}>
                              <Box>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: "var(--color-text-secondary)",
                                    fontWeight: 600,
                                    display: "block",
                                    mb: 0.8,
                                  }}
                                >
                                  Prof. Tax
                                </Typography>
                                <Typography
                                  variant="body2"
                                  fontWeight="bold"
                                  sx={{ color: "var(--color-text-primary)", mb: 0.5 }}
                                >
                                  {profileSummary.structure && profileSummary.structure.ctc
                                    ? formatCurrency(profileSummary.structure.ctc * 12 > 250000 ? 200 : 0)
                                    : formatCurrency(0)}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "var(--color-text-secondary)", fontSize: "0.7rem" }}>
                                  Monthly
                                </Typography>
                              </Box>
                            </Grid>
                          </Grid>
                        </Paper>
                      </Grid>

                      {/* Live Salary Structure - Revised UI */}
                      {profileSummary.structure ? (
                        <Grid item xs={12}>
                          <Paper
                            sx={{
                              p: 3,
                              border: "1px solid var(--color-border)",
                              borderRadius: "var(--radius-control)",
                              background: "var(--color-surface-subtle)",
                            }}
                          >
                            <Box sx={{ mb: 2.5, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                              <Typography
                                variant="subtitle2"
                                sx={{
                                  color: "var(--color-primary-hover)",
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.08em",
                                }}
                              >
                                Salary Structure Breakdown
                              </Typography>
                              <Typography variant="caption" sx={{ color: "var(--color-text-secondary)" }}>
                                {profileViewMode === "annual" ? "Annual figures" : "Monthly figures"}
                              </Typography>
                            </Box>

                            <Grid container spacing={2.5}>
                              <Grid item xs={12} sm={6} md={3}>
                                <Paper sx={{ p: 2, borderRadius: "var(--radius-control)", border: "1px solid var(--color-border)", bgcolor: "var(--color-surface)" }}>
                                  <Typography variant="caption" sx={{ color: "var(--color-text-secondary)", mb: 0.5, display: "block" }}>
                                    CTC
                                  </Typography>
                                  <Typography variant="h6" fontWeight={700} sx={{ color: "var(--color-text-primary)" }}>
                                    {profileViewMode === "annual" ? formatSummaryValue(profileSummary.structure.ctc * 12) : formatSummaryValue(profileSummary.structure.ctc)}
                                  </Typography>
                                </Paper>
                              </Grid>

                              <Grid item xs={12} sm={6} md={3}>
                                <Paper sx={{ p: 2, borderRadius: "var(--radius-control)", border: "1px solid var(--color-border)", bgcolor: "var(--color-surface)" }}>
                                  <Typography variant="caption" sx={{ color: "var(--color-text-secondary)", mb: 0.5, display: "block" }}>
                                    Gross Salary
                                  </Typography>
                                  <Typography variant="h6" fontWeight={700} sx={{ color: "var(--color-text-primary)" }}>
                                    {profileViewMode === "annual" ? formatSummaryValue(profileSummary.structure.gross_salary * 12) : formatSummaryValue(profileSummary.structure.gross_salary)}
                                  </Typography>
                                </Paper>
                              </Grid>

                              <Grid item xs={12} sm={6} md={3}>
                                <Paper sx={{ p: 2, borderRadius: "var(--radius-control)", border: "1px solid var(--color-border)", bgcolor: "var(--color-surface)" }}>
                                  <Typography variant="caption" sx={{ color: "var(--color-text-secondary)", mb: 0.5, display: "block" }}>
                                    Basic Salary
                                  </Typography>
                                  <Typography variant="h6" fontWeight={700} sx={{ color: "var(--color-text-primary)" }}>
                                    {profileViewMode === "annual" ? formatSummaryValue(profileSummary.structure.basic_salary * 12) : formatSummaryValue(profileSummary.structure.basic_salary)}
                                  </Typography>
                                </Paper>
                              </Grid>

                              <Grid item xs={12} sm={6} md={3}>
                                <Paper sx={{ p: 2, borderRadius: "var(--radius-control)", border: "1px solid var(--color-border)", bgcolor: "var(--color-surface)" }}>
                                  <Typography variant="caption" sx={{ color: "var(--color-text-secondary)", mb: 0.5, display: "block" }}>
                                    HRA
                                  </Typography>
                                  <Typography variant="h6" fontWeight={700} sx={{ color: "var(--color-text-primary)" }}>
                                    {profileViewMode === "annual" ? formatSummaryValue(profileSummary.structure.hra * 12) : formatSummaryValue(profileSummary.structure.hra)}
                                  </Typography>
                                </Paper>
                              </Grid>

                              <Grid item xs={12} sm={6} md={3}>
                                <Paper sx={{ p: 2, borderRadius: "var(--radius-control)", border: "1px solid var(--color-border)", bgcolor: "var(--color-surface)" }}>
                                  <Typography variant="caption" sx={{ color: "var(--color-text-secondary)", mb: 0.5, display: "block" }}>
                                    Employer PF
                                  </Typography>
                                  <Typography variant="h6" fontWeight={700} sx={{ color: "var(--color-text-primary)" }}>
                                    {profileViewMode === "annual"
                                      ? formatSummaryValue(computeEmployerPf(profileFormData.monthly_ctc, profileFormData.pf_deduction) * 12)
                                      : formatSummaryValue(computeEmployerPf(profileFormData.monthly_ctc, profileFormData.pf_deduction))}
                                  </Typography>
                                </Paper>
                              </Grid>

                              {(profileSummary.structure?.employer_esi ?? computeEmployerEsi(profileFormData.monthly_ctc)) > 0 && (
                                <Grid item xs={12} sm={6} md={3}>
                                  <Paper sx={{ p: 2, borderRadius: "var(--radius-control)", border: "1px solid var(--color-border)", bgcolor: "var(--color-surface)" }}>
                                    <Typography variant="caption" sx={{ color: "var(--color-text-secondary)", mb: 0.5, display: "block" }}>
                                      Employer ESI
                                    </Typography>
                                    <Typography variant="h6" fontWeight={700} sx={{ color: "var(--color-text-primary)" }}>
                                      {profileViewMode === "annual"
                                        ? formatSummaryValue((profileSummary.structure?.employer_esi ?? computeEmployerEsi(profileFormData.monthly_ctc)) * 12)
                                        : formatSummaryValue(profileSummary.structure?.employer_esi ?? computeEmployerEsi(profileFormData.monthly_ctc))}
                                    </Typography>
                                  </Paper>
                                </Grid>
                              )}

                              {profileSummary.structure.special_allowance > 0 && (
                                <Grid item xs={12} sm={6} md={3}>
                                  <Paper sx={{ p: 2, borderRadius: "var(--radius-control)", border: "1px solid var(--color-border)", bgcolor: "var(--color-surface)" }}>
                                    <Typography variant="caption" sx={{ color: "var(--color-text-secondary)", mb: 0.5, display: "block" }}>
                                      Special Allowance
                                    </Typography>
                                    <Typography variant="h6" fontWeight={700} sx={{ color: "var(--color-text-primary)" }}>
                                      {profileViewMode === "annual" ? formatSummaryValue(profileSummary.structure.special_allowance * 12) : formatSummaryValue(profileSummary.structure.special_allowance)}
                                    </Typography>
                                  </Paper>
                                </Grid>
                              )}

                              {profileSummary.structure.other_allowance > 0 && (
                                <Grid item xs={12} sm={6} md={3}>
                                  <Paper sx={{ p: 2, borderRadius: "var(--radius-control)", border: "1px solid var(--color-border)", bgcolor: "var(--color-surface)" }}>
                                    <Typography variant="caption" sx={{ color: "var(--color-text-secondary)", mb: 0.5, display: "block" }}>
                                      Other Allowance
                                    </Typography>
                                    <Typography variant="h6" fontWeight={700} sx={{ color: "var(--color-text-primary)" }}>
                                      {profileViewMode === "annual" ? formatSummaryValue(profileSummary.structure.other_allowance * 12) : formatSummaryValue(profileSummary.structure.other_allowance)}
                                    </Typography>
                                  </Paper>
                                </Grid>
                              )}
                            </Grid>
                          </Paper>
                        </Grid>
                      ) : null}

                      {/* Advances loan summary */}
                      <Grid item xs={12}>
                        <Paper
                          sx={{
                            p: 2.5,
                            border: "1px solid var(--color-border)",
                            borderRadius: "var(--radius-control)",
                            background: "var(--color-surface-subtle)",
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              color: "var(--color-primary-hover)",
                              fontWeight: 600,
                            }}
                          >
                            SALARY ADVANCES OVERVIEW
                          </Typography>
                          <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={4}>
                              <Typography
                                variant="caption"
                                sx={{ color: "var(--color-text-secondary)" }}
                              >
                                Total Taken
                              </Typography>
                              <Typography
                                variant="body2"
                                fontWeight="bold"
                                sx={{
                                  color: "var(--color-text-primary)",
                                  mt: 0.5,
                                }}
                              >
                                {formatSummaryValue(
                                  profileSummary.totalAdvancesTaken,
                                )}
                              </Typography>
                            </Grid>
                            <Grid item xs={4}>
                              <Typography
                                variant="caption"
                                sx={{ color: "var(--color-text-secondary)" }}
                              >
                                Total Repaid (YTD)
                              </Typography>
                              <Typography
                                variant="body2"
                                fontWeight="bold"
                                sx={{ color: "var(--color-success)", mt: 0.5 }}
                              >
                                {formatSummaryValue(
                                  profileSummary.totalAdvancesRepaid,
                                )}
                              </Typography>
                            </Grid>
                            <Grid item xs={4}>
                              <Typography
                                variant="caption"
                                sx={{ color: "var(--color-text-secondary)" }}
                              >
                                Outstanding Loan
                              </Typography>
                              <Typography
                                variant="body2"
                                fontWeight="bold"
                                sx={{
                                  color:
                                    profileSummary.remainingAdvanceBalance > 0
                                      ? "#fb923c"
                                      : "var(--color-text-muted)",
                                  mt: 0.5,
                                }}
                              >
                                {formatSummaryValue(
                                  profileSummary.remainingAdvanceBalance,
                                )}
                              </Typography>
                            </Grid>
                          </Grid>
                          {profileSummary.advanceDetails?.length > 0 && (
                            <TableContainer
                              sx={{
                                mt: 2,
                                border: "1px solid var(--color-border)",
                                borderRadius: "var(--radius-control)",
                              }}
                            >
                              <Table size="small">
                                <TableHead
                                  sx={{ bgcolor: "var(--color-surface)" }}
                                >
                                  <TableRow>
                                    {[
                                      "Date",
                                      "Amount",
                                      "Type",
                                      "Installment",
                                      "Months",
                                      "Start",
                                      "Recovered",
                                      "Remaining",
                                    ].map((header) => (
                                      <TableCell
                                        key={header}
                                        sx={{
                                          color: "var(--color-text-secondary)",
                                          fontSize: "0.75rem",
                                          fontWeight: 700,
                                        }}
                                      >
                                        {header}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {profileSummary.advanceDetails.map(
                                    (advance: any) => {
                                      const months = advance.installment_amount
                                        ? Math.ceil(
                                          Number(advance.amount) /
                                          Number(
                                            advance.installment_amount,
                                          ),
                                        )
                                        : "-";
                                      return (
                                        <TableRow key={advance.id}>
                                          <TableCell
                                            sx={{
                                              color:
                                                "var(--color-text-primary)",
                                              fontSize: "0.78rem",
                                            }}
                                          >
                                            {advance.date}
                                          </TableCell>
                                          <TableCell
                                            sx={{
                                              color:
                                                "var(--color-text-primary)",
                                              fontSize: "0.78rem",
                                            }}
                                          >
                                            {formatCurrency(advance.amount)}
                                          </TableCell>
                                          <TableCell
                                            sx={{
                                              color:
                                                "var(--color-text-primary)",
                                              fontSize: "0.78rem",
                                              textTransform: "capitalize",
                                            }}
                                          >
                                            {advance.recovery_type?.replace(
                                              "_",
                                              " ",
                                            )}
                                          </TableCell>
                                          <TableCell
                                            sx={{
                                              color:
                                                "var(--color-text-primary)",
                                              fontSize: "0.78rem",
                                            }}
                                          >
                                            {advance.installment_amount
                                              ? formatCurrency(
                                                advance.installment_amount,
                                              )
                                              : "-"}
                                          </TableCell>
                                          <TableCell
                                            sx={{
                                              color:
                                                "var(--color-text-primary)",
                                              fontSize: "0.78rem",
                                            }}
                                          >
                                            {months}
                                          </TableCell>
                                          <TableCell
                                            sx={{
                                              color:
                                                "var(--color-text-primary)",
                                              fontSize: "0.78rem",
                                            }}
                                          >
                                            {formatMonthLabel(
                                              advance.start_month,
                                            )}{" "}
                                            {advance.start_year}
                                          </TableCell>
                                          <TableCell
                                            sx={{
                                              color: "var(--color-success)",
                                              fontSize: "0.78rem",
                                              fontWeight: 600,
                                            }}
                                          >
                                            {formatCurrency(
                                              advance.total_recovered,
                                            )}
                                          </TableCell>
                                          <TableCell
                                            sx={{
                                              color:
                                                advance.remaining_amount > 0
                                                  ? "#fb923c"
                                                  : "var(--color-text-muted)",
                                              fontSize: "0.78rem",
                                              fontWeight: 600,
                                            }}
                                          >
                                            {formatCurrency(
                                              advance.remaining_amount,
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      );
                                    },
                                  )}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          )}
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions
          sx={{ p: 3, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}
        >
          <Button
            onClick={() => setOpenProfileDialog(false)}
            variant="outlined"
            sx={{
              color: "var(--color-text-secondary)",
              borderColor: "var(--color-border)",
              textTransform: "none",
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
