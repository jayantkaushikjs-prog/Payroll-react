import React from 'react';
import {
  Box,
  Paper,
  TextField,
  CircularProgress,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Tooltip,
  IconButton,
  TablePagination,
} from '@mui/material';
import {
  Search as SearchIcon,
  Archive as ArchiveIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { Employee } from '../../utils/employeeUtils';

interface EmployeeDirectoryProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  page: number;
  setPage: (page: number) => void;
  rowsPerPage: number;
  setRowsPerPage: (rows: number) => void;
  isLoading: boolean;
  filteredEmployees: Employee[];
  isHRorAdmin: boolean | null | undefined;
  setEmployeeToChangeStatus: (emp: Employee) => void;
  setStatusDialogOpen: (open: boolean) => void;
  setEmployeeToArchive: (emp: Employee) => void;
  setArchiveDialogOpen: (open: boolean) => void;
  handleOpenProfileDialog: (emp: Employee) => void;
  handleOpenEditDialog: (emp: Employee) => void;
}

export const EmployeeDirectory: React.FC<EmployeeDirectoryProps> = ({
  searchTerm,
  setSearchTerm,
  page,
  setPage,
  rowsPerPage,
  setRowsPerPage,
  isLoading,
  filteredEmployees,
  isHRorAdmin,
  setEmployeeToChangeStatus,
  setStatusDialogOpen,
  setEmployeeToArchive,
  setArchiveDialogOpen,
  handleOpenProfileDialog,
  handleOpenEditDialog,
}) => {
  return (
    <Paper
      sx={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-card)",
        overflow: "hidden",
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
          startAdornment: (
            <SearchIcon sx={{ color: "var(--color-text-muted)", mr: 1 }} />
          ),
        }}
        sx={{
          mb: 3,
          "& .MuiOutlinedInput-root": {
            color: "var(--color-text-primary)",
            borderRadius: "var(--radius-control)",
            "& fieldset": { borderColor: "var(--color-border)" },
            "&.Mui-focused fieldset": {
              borderColor: "var(--color-primary)",
            },
          },
        }}
      />

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={40} sx={{ color: "var(--color-primary)" }} />
        </Box>
      ) : filteredEmployees.length === 0 ? (
        <Box
          sx={{
            py: 4,
            textAlign: "center",
            color: "var(--color-text-muted)",
          }}
        >
          No employees found matching the search criteria.
        </Box>
      ) : (
        <>
          <TableContainer>
            <Table sx={{ minWidth: 650 }}>
              <TableHead sx={{ bgcolor: "var(--color-surface-subtle)" }}>
                <TableRow>
                  <TableCell sx={{ color: "var(--color-text-secondary)", fontWeight: 600 }}>Code</TableCell>
                  <TableCell sx={{ color: "var(--color-text-secondary)", fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ color: "var(--color-text-secondary)", fontWeight: 600 }}>Official Email</TableCell>
                  <TableCell sx={{ color: "var(--color-text-secondary)", fontWeight: 600 }}>Department</TableCell>
                  <TableCell sx={{ color: "var(--color-text-secondary)", fontWeight: 600 }}>Designation</TableCell>
                  <TableCell sx={{ color: "var(--color-text-secondary)", fontWeight: 600 }}>Status</TableCell>
                  <TableCell align="right" sx={{ color: "var(--color-text-secondary)", fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEmployees
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((emp: Employee) => (
                    <TableRow
                      key={emp.id}
                      onClick={() => handleOpenProfileDialog(emp)}
                      sx={{
                        "&:last-child td, &:last-child th": { border: 0 },
                        cursor: "pointer",
                        "&:hover": { bgcolor: "var(--color-row-hover)" },
                        transition: "background-color 140ms ease",
                      }}
                    >
                      <TableCell component="th" scope="row" sx={{ color: "var(--color-text-primary)" }}>
                        {emp.employee_code}
                      </TableCell>
                      <TableCell sx={{ color: "var(--color-text-primary)" }}>{emp.name}</TableCell>
                      <TableCell sx={{ color: "var(--color-text-primary)" }}>{emp.email}</TableCell>
                      <TableCell sx={{ color: "var(--color-text-primary)" }}>{emp.department}</TableCell>
                      <TableCell sx={{ color: "var(--color-text-primary)" }}>{emp.designation}</TableCell>
                      <TableCell>
                        <Box
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isHRorAdmin) {
                              setEmployeeToChangeStatus(emp);
                              setStatusDialogOpen(true);
                            }
                          }}
                          sx={{
                            display: "inline-block",
                            px: 1.5,
                            py: 0.5,
                            borderRadius: "12px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            cursor: isHRorAdmin ? "pointer" : "default",
                            bgcolor: emp.active_status
                              ? "rgba(16, 185, 129, 0.12)"
                              : "rgba(239, 68, 68, 0.12)",
                            color: emp.active_status
                              ? "var(--color-success)"
                              : "var(--color-error)",
                            transition: "background-color 0.2s",
                            "&:hover": isHRorAdmin
                              ? {
                                  bgcolor: emp.active_status
                                    ? "rgba(16, 185, 129, 0.22)"
                                    : "rgba(239, 68, 68, 0.22)",
                                }
                              : {},
                          }}
                        >
                          {emp.active_status ? "Active" : "Inactive"}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        {isHRorAdmin && (
                          <Tooltip title="Archive">
                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                setEmployeeToArchive(emp);
                                setArchiveDialogOpen(true);
                              }}
                              sx={{
                                color: "var(--color-text-secondary)",
                                "&:hover": { color: "var(--color-error)" },
                                mr: 0.5,
                              }}
                            >
                              <ArchiveIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Edit Details">
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditDialog(emp);
                            }}
                            sx={{
                              color: "var(--color-text-secondary)",
                              "&:hover": { color: "var(--color-primary)" },
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
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
              color: "var(--color-text-primary)",
              borderTop: "1px solid var(--color-border)",
              "& .MuiTablePagination-actions": { color: "var(--color-text-primary)" },
              "& .MuiTablePagination-select": { color: "var(--color-text-primary)" },
            }}
          />
        </>
      )}
    </Paper>
  );
};
