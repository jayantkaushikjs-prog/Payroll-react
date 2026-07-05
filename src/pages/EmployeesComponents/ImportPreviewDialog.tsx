import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from "@mui/material";

interface ImportPreviewDialogProps {
  openImportPreview: boolean;
  setOpenImportPreview: (open: boolean) => void;
  importing: boolean;
  previewRows: any[];
  handleConfirmImport: () => void;
}

export const ImportPreviewDialog: React.FC<ImportPreviewDialogProps> = ({
  openImportPreview,
  setOpenImportPreview,
  importing,
  previewRows,
  handleConfirmImport,
}) => {
  return (
    <Dialog
      open={openImportPreview}
      onClose={() => !importing && setOpenImportPreview(false)}
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
        }}
      >
        Preview Import Data ({previewRows.length} Employees)
      </DialogTitle>
      <DialogContent sx={{ py: 3, maxHeight: "60vh", overflowY: "auto" }}>
        <TableContainer
          component={Paper}
          sx={{
            bgcolor: "transparent",
            boxShadow: "none",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-control)",
          }}
        >
          <Table size="small">
            <TableHead sx={{ bgcolor: "var(--color-surface-subtle)" }}>
              <TableRow>
                <TableCell
                  sx={{
                    color: "var(--color-text-secondary)",
                    fontWeight: 600,
                  }}
                >
                  Code
                </TableCell>
                <TableCell
                  sx={{
                    color: "var(--color-text-secondary)",
                    fontWeight: 600,
                  }}
                >
                  Name
                </TableCell>
                <TableCell
                  sx={{
                    color: "var(--color-text-secondary)",
                    fontWeight: 600,
                  }}
                >
                  Prof. Email
                </TableCell>
                <TableCell
                  sx={{
                    color: "var(--color-text-secondary)",
                    fontWeight: 600,
                  }}
                >
                  Pers. Email
                </TableCell>
                <TableCell
                  sx={{
                    color: "var(--color-text-secondary)",
                    fontWeight: 600,
                  }}
                >
                  Phone
                </TableCell>
                <TableCell
                  sx={{
                    color: "var(--color-text-secondary)",
                    fontWeight: 600,
                  }}
                >
                  Dept.
                </TableCell>
                <TableCell
                  sx={{
                    color: "var(--color-text-secondary)",
                    fontWeight: 600,
                  }}
                >
                  Desig.
                </TableCell>
                <TableCell
                  sx={{
                    color: "var(--color-text-secondary)",
                    fontWeight: 600,
                  }}
                >
                  Joining Date
                </TableCell>
                <TableCell
                  sx={{
                    color: "var(--color-text-secondary)",
                    fontWeight: 600,
                  }}
                >
                  Bank
                </TableCell>
                <TableCell
                  sx={{
                    color: "var(--color-text-secondary)",
                    fontWeight: 600,
                  }}
                >
                  A/C No.
                </TableCell>
                <TableCell
                  sx={{
                    color: "var(--color-text-secondary)",
                    fontWeight: 600,
                  }}
                >
                  IFSC
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {previewRows.map((row, idx) => (
                <TableRow
                  key={idx}
                  sx={{ "&:hover": { bgcolor: "rgba(255, 255, 255, 0.02)" } }}
                >
                  <TableCell sx={{ color: "var(--color-text-primary)" }}>
                    {row.employee_code || (
                      <span
                        style={{
                          color: "var(--color-text-muted)",
                          fontStyle: "italic",
                        }}
                      >
                        empty
                      </span>
                    )}
                  </TableCell>
                  <TableCell
                    sx={{
                      color: "var(--color-text-primary)",
                      fontWeight: 500,
                    }}
                  >
                    {row.name || (
                      <span
                        style={{
                          color: "var(--color-text-muted)",
                          fontStyle: "italic",
                        }}
                      >
                        empty
                      </span>
                    )}
                  </TableCell>
                  <TableCell sx={{ color: "var(--color-text-primary)" }}>
                    {row.email || (
                      <span
                        style={{
                          color: "var(--color-text-muted)",
                          fontStyle: "italic",
                        }}
                      >
                        empty
                      </span>
                    )}
                  </TableCell>
                  <TableCell sx={{ color: "var(--color-text-primary)" }}>
                    {row.personal_email || (
                      <span
                        style={{
                          color: "var(--color-text-muted)",
                          fontStyle: "italic",
                        }}
                      >
                        —
                      </span>
                    )}
                  </TableCell>
                  <TableCell sx={{ color: "var(--color-text-primary)" }}>
                    {row.phone || (
                      <span
                        style={{
                          color: "var(--color-text-muted)",
                          fontStyle: "italic",
                        }}
                      >
                        —
                      </span>
                    )}
                  </TableCell>
                  <TableCell sx={{ color: "var(--color-text-primary)" }}>
                    {row.department}
                  </TableCell>
                  <TableCell sx={{ color: "var(--color-text-primary)" }}>
                    {row.designation}
                  </TableCell>
                  <TableCell sx={{ color: "var(--color-text-primary)" }}>
                    {row.joining_date}
                  </TableCell>
                  <TableCell sx={{ color: "var(--color-text-primary)" }}>
                    {row.bank_name}
                  </TableCell>
                  <TableCell sx={{ color: "var(--color-text-primary)" }}>
                    {row.account_number}
                  </TableCell>
                  <TableCell sx={{ color: "var(--color-text-primary)" }}>
                    {row.ifsc}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions
        sx={{ p: 3, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}
      >
        <Button
          onClick={() => setOpenImportPreview(false)}
          disabled={importing}
          sx={{ color: "var(--color-text-secondary)", textTransform: "none" }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirmImport}
          variant="contained"
          disabled={importing}
          sx={{
            background: "var(--color-success)",
            "&:hover": { background: "var(--color-success-pressed)" },
            borderRadius: "var(--radius-control)",
            px: 3,
            textTransform: "none",
          }}
        >
          {importing ? (
            <CircularProgress size={20} sx={{ color: "#fff" }} />
          ) : (
            "Confirm & Save"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
