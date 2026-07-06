import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  Divider,
  InputAdornment,
  FormControlLabel,
  Switch,
  Autocomplete,
} from "@mui/material";
import { Employee, BaseEmployeeFormData, isPfRequiredByWageLimit } from "../../utils/employeeUtils";
import { computeEmployerPf, computeEmployerEsi } from "../../utils/statutoryCalculations";

interface AddEditEmployeeDialogProps {
  open: boolean;
  onClose: () => void;
  selectedEmp: Employee | null;
  formData: BaseEmployeeFormData;
  setFormData: (data: BaseEmployeeFormData | ((prev: BaseEmployeeFormData) => BaseEmployeeFormData)) => void;
  formErrors: Record<string, string>;
  handleFormSubmit: (e: React.FormEvent) => void;
  handleGenerateCode: () => void;
  departmentOptions: string[];
  designationOptions: string[];
  allDepartments: string[];
  allDesignations: string[];
  addDepartmentMutation: any;
  addDesignationMutation: any;
  setFormErrors: (errors: any) => void;
  inputStyles: any;
  dropdownListStyles: any;
}

export const AddEditEmployeeDialog: React.FC<AddEditEmployeeDialogProps> = ({
  open,
  onClose,
  selectedEmp,
  formData,
  setFormData,
  formErrors,
  handleFormSubmit,
  handleGenerateCode,
  departmentOptions,
  designationOptions,
  allDepartments,
  allDesignations,
  addDepartmentMutation,
  addDesignationMutation,
  setFormErrors,
  inputStyles,
  dropdownListStyles,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
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
          pb: selectedEmp ? 1 : 2,
        }}
      >
        {selectedEmp ? "Edit Employee Details" : "Register New Employee"}
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
                onChange={(e) =>
                  setFormData({ ...formData, employee_code: e.target.value })
                }
                error={!!formErrors.employee_code}
                helperText={formErrors.employee_code}
                sx={inputStyles}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        onClick={handleGenerateCode}
                        size="small"
                        variant="text"
                        sx={{
                          textTransform: "none",
                          fontWeight: 600,
                          color: "var(--color-primary-hover)",
                          mr: -1,
                        }}
                      >
                        Generate
                      </Button>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Full Name"
                fullWidth
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                error={!!formErrors.name}
                helperText={formErrors.name}
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
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                error={!!formErrors.email}
                helperText={formErrors.email}
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
                value={formData.personal_email}
                onChange={(e) =>
                  setFormData({ ...formData, personal_email: e.target.value })
                }
                error={!!formErrors.personal_email}
                helperText={formErrors.personal_email}
                sx={inputStyles}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Phone Number"
                fullWidth
                value={formData.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setFormData({ ...formData, phone: val });
                }}
                error={!!formErrors.phone}
                helperText={formErrors.phone}
                inputProps={{
                  maxLength: 10,
                  inputMode: "numeric",
                  pattern: "[0-9]*",
                }}
                sx={inputStyles}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                freeSolo
                options={designationOptions}
                value={formData.designation || null}
                onChange={(_, value) => {
                  const val = typeof value === "string" ? value : value || "";
                  setFormData({ ...formData, designation: val });
                  setFormErrors({
                    ...formErrors,
                    designation: val ? "" : "Designation is required",
                  });
                  if (val && !allDesignations.includes(val)) {
                    addDesignationMutation.mutate(val);
                  }
                }}
                onInputChange={(_, newInputValue) => {
                  setFormData({ ...formData, designation: newInputValue });
                  setFormErrors({
                    ...formErrors,
                    designation: newInputValue ? "" : "Designation is required",
                  });
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
              <Autocomplete
                freeSolo
                options={departmentOptions}
                value={formData.department || null}
                onChange={(_, value) => {
                  const val = typeof value === "string" ? value : value || "";
                  setFormData({ ...formData, department: val });
                  setFormErrors({
                    ...formErrors,
                    department: val ? "" : "Department is required",
                  });
                  if (val && !allDepartments.includes(val)) {
                    addDepartmentMutation.mutate(val);
                  }
                }}
                onInputChange={(_, newInputValue) => {
                  setFormData({ ...formData, department: newInputValue });
                  setFormErrors({
                    ...formErrors,
                    department: newInputValue ? "" : "Department is required",
                  });
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
              <TextField
                label="Joining Date"
                type="date"
                fullWidth
                required
                value={formData.joining_date}
                onChange={(e) =>
                  setFormData({ ...formData, joining_date: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
                error={!!formErrors.joining_date}
                helperText={formErrors.joining_date}
                sx={inputStyles}
              />
            </Grid>

            {/* CTC Section */}
            <Grid item xs={12}>
              <Typography
                variant="subtitle2"
                sx={{
                  color: "var(--color-primary-hover)",
                  fontWeight: 600,
                  mt: 1,
                }}
              >
                CTC DETAILS
              </Typography>
              <Divider sx={{ borderColor: "var(--color-border)", mt: 1 }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Monthly CTC"
                type="number"
                fullWidth
                value={formData.monthly_ctc}
                onChange={(e) => {
                  const monthly = e.target.value;
                  const ctcNum = Number(monthly);
                  setFormData({
                    ...formData,
                    monthly_ctc: monthly,
                    pf_deduction:
                      monthly === "" || ctcNum > 15000
                        ? false
                        : formData.pf_deduction,
                  });
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
                value={
                  formData.monthly_ctc
                    ? String(Number(formData.monthly_ctc) * 12)
                    : ""
                }
                InputProps={{ readOnly: true }}
                disabled
                inputProps={{ min: 0 }}
                sx={inputStyles}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Employer PF"
                fullWidth
                value={String(
                  computeEmployerPf(
                    formData.monthly_ctc,
                    formData.pf_deduction || isPfRequiredByWageLimit(formData.monthly_ctc),
                  ),
                )}
                InputProps={{ readOnly: true }}
                disabled
                sx={inputStyles}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Employer ESI"
                fullWidth
                value={String(computeEmployerEsi(formData.monthly_ctc))}
                InputProps={{ readOnly: true }}
                disabled
                sx={inputStyles}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={
                      formData.pf_deduction ||
                      isPfRequiredByWageLimit(formData.monthly_ctc)
                    }
                    disabled={isPfRequiredByWageLimit(formData.monthly_ctc)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pf_deduction:
                          isPfRequiredByWageLimit(formData.monthly_ctc) ||
                          e.target.checked,
                      })
                    }
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": {
                        color: "var(--color-primary)",
                      },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                        { bgcolor: "var(--color-primary)" },
                    }}
                  />
                }
                label="PF Deduction"
                sx={{ mt: 1.5, color: "var(--color-text-secondary)" }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label={`PF No. / UAN${formData.pf_deduction || isPfRequiredByWageLimit(formData.monthly_ctc) ? " *" : ""}`}
                fullWidth
                value={formData.pf_uan}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 12);
                  setFormData({ ...formData, pf_uan: val });
                }}
                error={!!formErrors.pf_uan}
                helperText={formErrors.pf_uan}
                inputProps={{ maxLength: 12, pattern: "[0-9]*" }}
                sx={inputStyles}
              />
            </Grid>

            {/* Bank Details Sub-header */}
            <Grid item xs={12}>
              <Typography
                variant="subtitle2"
                sx={{
                  color: "var(--color-primary-hover)",
                  fontWeight: 600,
                  mt: 1,
                }}
              >
                BANK ACCOUNT INFORMATION
              </Typography>
              <Divider sx={{ borderColor: "var(--color-border)", mt: 1 }} />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label="Bank Name"
                fullWidth
                required
                value={formData.bank_name}
                onChange={(e) =>
                  setFormData({ ...formData, bank_name: e.target.value })
                }
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
                onChange={(e) =>
                  setFormData({ ...formData, account_number: e.target.value })
                }
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
                onChange={(e) =>
                  setFormData({ ...formData, ifsc: e.target.value.toUpperCase().slice(0, 11) })
                }
                error={!!formErrors.ifsc}
                helperText={formErrors.ifsc}
                inputProps={{ maxLength: 11 }}
                sx={inputStyles}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions
          sx={{ p: 3, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}
        >
          <Button
            onClick={onClose}
            sx={{
              color: "var(--color-text-secondary)",
              textTransform: "none",
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            sx={{
              background: "var(--color-primary)",
              borderRadius: "var(--radius-control)",
              px: 3,
              textTransform: "none",
            }}
          >
            {selectedEmp ? "Save Changes" : "Register Employee"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
