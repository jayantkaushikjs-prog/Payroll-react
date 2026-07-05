import React from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

interface ManageOptionsProps {
  departments: any[];
  newDeptName: string;
  setNewDeptName: (val: string) => void;
  handleAddDept: () => void;
  deleteDepartmentMutation: any;
  designations: any[];
  newDesigName: string;
  setNewDesigName: (val: string) => void;
  handleAddDesig: () => void;
  deleteDesignationMutation: any;
  inputStyles: any;
}

export const ManageOptions: React.FC<ManageOptionsProps> = ({
  departments,
  newDeptName,
  setNewDeptName,
  handleAddDept,
  deleteDepartmentMutation,
  designations,
  newDesigName,
  setNewDesigName,
  handleAddDesig,
  deleteDesignationMutation,
  inputStyles,
}) => {
  return (
    <Grid
      container
      spacing={3}
      className="animate-fade-in"
      sx={{
        "& .manage-options-title": { fontSize: "17px" },
        "& .manage-options-copy": { fontSize: "11px" },
        "& .manage-options-name": { fontSize: "13px" },
        "& .MuiInputBase-input": { fontSize: "13px" },
        "& .MuiButton-root": { fontSize: "11px" },
      }}
    >
      {/* Department management column */}
      <Grid item xs={12} md={6}>
        <Paper
          sx={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-card)",
            p: 4,
          }}
        >
          <Typography
            className="manage-options-title"
            variant="h6"
            fontFamily="Outfit"
            fontWeight={600}
            sx={{ color: "var(--color-text-primary)", mb: 1 }}
          >
            Manage Departments
          </Typography>
          <Typography
            className="manage-options-copy"
            variant="body2"
            sx={{ color: "var(--color-text-secondary)", mb: 3 }}
          >
            Add new departments or remove existing ones. Removed departments
            will no longer appear in employee forms.
          </Typography>

          <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
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
                background: "var(--color-primary)",
                borderRadius: "var(--radius-control)",
                textTransform: "none",
                px: 3,
              }}
            >
              Add
            </Button>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              maxHeight: "400px",
              overflowY: "auto",
            }}
          >
            {departments.map((dept: any) => (
              <Box
                key={dept.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 2,
                  borderRadius: "var(--radius-control)",
                  border: "1px solid var(--color-border)",
                  bgcolor: "var(--color-surface-subtle)",
                }}
              >
                <Typography
                  className="manage-options-name"
                  sx={{
                    color: "var(--color-text-primary)",
                    fontWeight: 500,
                  }}
                >
                  {dept.name}
                </Typography>
                <IconButton
                  onClick={() => deleteDepartmentMutation.mutate(dept.id)}
                  sx={{
                    color: "var(--color-text-secondary)",
                    "&:hover": { color: "var(--color-error)" },
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            {departments.length === 0 && (
              <Typography
                className="manage-options-name"
                sx={{
                  color: "var(--color-text-muted)",
                  py: 2,
                  textAlign: "center",
                }}
              >
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
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-card)",
            p: 4,
          }}
        >
          <Typography
            className="manage-options-title"
            variant="h6"
            fontFamily="Outfit"
            fontWeight={600}
            sx={{ color: "var(--color-text-primary)", mb: 1 }}
          >
            Manage Designations
          </Typography>
          <Typography
            className="manage-options-copy"
            variant="body2"
            sx={{ color: "var(--color-text-secondary)", mb: 3 }}
          >
            Add new designations or remove existing ones. Removed
            designations will no longer appear in employee forms.
          </Typography>

          <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
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
                background: "var(--color-primary)",
                borderRadius: "var(--radius-control)",
                textTransform: "none",
                px: 3,
              }}
            >
              Add
            </Button>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              maxHeight: "400px",
              overflowY: "auto",
            }}
          >
            {designations.map((desig: any) => (
              <Box
                key={desig.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 2,
                  borderRadius: "var(--radius-control)",
                  border: "1px solid var(--color-border)",
                  bgcolor: "var(--color-surface-subtle)",
                }}
              >
                <Typography
                  className="manage-options-name"
                  sx={{
                    color: "var(--color-text-primary)",
                    fontWeight: 500,
                  }}
                >
                  {desig.name}
                </Typography>
                <IconButton
                  onClick={() => deleteDesignationMutation.mutate(desig.id)}
                  sx={{
                    color: "var(--color-text-secondary)",
                    "&:hover": { color: "var(--color-error)" },
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            {designations.length === 0 && (
              <Typography
                className="manage-options-name"
                sx={{
                  color: "var(--color-text-muted)",
                  py: 2,
                  textAlign: "center",
                }}
              >
                No designations added yet.
              </Typography>
            )}
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
};
