import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
} from "@mui/material";
import { Employee } from "../../utils/employeeUtils";

// ──────────────────────────────────────────────
// Archive Confirmation Dialog
// ──────────────────────────────────────────────
interface ArchiveDialogProps {
  open: boolean;
  onClose: () => void;
  employee: Employee | null;
  onConfirm: (id: number) => void;
  isPending: boolean;
}

export const ArchiveDialog: React.FC<ArchiveDialogProps> = ({
  open,
  onClose,
  employee,
  onConfirm,
  isPending,
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    PaperProps={{
      sx: {
        borderRadius: "16px",
        bgcolor: "var(--color-surface)",
        backgroundImage: "none",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        border: "1px solid var(--color-border)",
        minWidth: "400px",
      },
    }}
  >
    <DialogTitle sx={{ color: "var(--color-text-primary)", pb: 1 }}>
      Archive Employee
    </DialogTitle>
    <DialogContent sx={{ color: "var(--color-text-secondary)" }}>
      Are you sure you want to archive{" "}
      <strong>{employee?.name}</strong>? They will be removed from this list
      and moved to the Archived section.
    </DialogContent>
    <DialogActions sx={{ p: 2.5, pt: 1.5 }}>
      <Button
        onClick={onClose}
        sx={{
          color: "var(--color-text-secondary)",
          textTransform: "none",
          fontWeight: 600,
        }}
      >
        Cancel
      </Button>
      <Button
        onClick={() => {
          if (employee) onConfirm(employee.id);
          onClose();
        }}
        variant="contained"
        disabled={isPending}
        sx={{
          bgcolor: "var(--color-error)",
          color: "#fff",
          textTransform: "none",
          fontWeight: 600,
          borderRadius: "8px",
          px: 3,
          "&:hover": { bgcolor: "rgba(239, 68, 68, 0.8)" },
        }}
      >
        {isPending ? <CircularProgress size={24} sx={{ color: "#fff" }} /> : "Archive"}
      </Button>
    </DialogActions>
  </Dialog>
);

// ──────────────────────────────────────────────
// Status Change Confirmation Dialog
// ──────────────────────────────────────────────
interface StatusDialogProps {
  open: boolean;
  onClose: () => void;
  employee: Employee | null;
  onConfirm: (id: number, currentStatus: boolean) => void;
  isPending: boolean;
}

export const StatusChangeDialog: React.FC<StatusDialogProps> = ({
  open,
  onClose,
  employee,
  onConfirm,
  isPending,
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    PaperProps={{
      sx: {
        borderRadius: "16px",
        bgcolor: "var(--color-surface)",
        backgroundImage: "none",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        border: "1px solid var(--color-border)",
        minWidth: "400px",
      },
    }}
  >
    <DialogTitle sx={{ color: "var(--color-text-primary)", pb: 1 }}>
      Change Employee Status
    </DialogTitle>
    <DialogContent sx={{ color: "var(--color-text-secondary)" }}>
      Are you sure you want to mark{" "}
      <strong>{employee?.name}</strong> as{" "}
      {employee?.active_status ? "Inactive" : "Active"}?
    </DialogContent>
    <DialogActions sx={{ p: 2.5, pt: 1.5 }}>
      <Button
        onClick={onClose}
        sx={{
          color: "var(--color-text-secondary)",
          textTransform: "none",
          fontWeight: 600,
        }}
      >
        Cancel
      </Button>
      <Button
        onClick={() => {
          if (employee) onConfirm(employee.id, employee.active_status);
          onClose();
        }}
        variant="contained"
        disabled={isPending}
        sx={{
          bgcolor: "var(--color-primary)",
          color: "#fff",
          textTransform: "none",
          fontWeight: 600,
          borderRadius: "8px",
          px: 3,
          "&:hover": { bgcolor: "var(--color-primary-hover)" },
        }}
      >
        {isPending ? <CircularProgress size={24} sx={{ color: "#fff" }} /> : "Confirm"}
      </Button>
    </DialogActions>
  </Dialog>
);
