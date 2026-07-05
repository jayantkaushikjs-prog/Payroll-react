import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth, Role } from '../context/AuthContext';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Chip,
  Tabs,
  Tab,
} from '@mui/material';
import { useToast } from '../context/ToastContext';
import { Save as SaveIcon } from '@mui/icons-material';
import TaxSlabs from './TaxSlabs';

interface PFSettingsRecord {
  id: number;
  employee_contribution_rate: number;
  employer_contribution_rate: number;
  esi_contribution_rate: number;
  esi_employee_contribution_rate: number;
  professional_tax: number;
  max_pf_cap: number;
  effective_date: string;
}

const PFSettings: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const isFinanceOrAdmin = user && (user.role === Role.SUPER_ADMIN || user.role === Role.FINANCE);

  // Fetch all PF Settings
  const { data: pfList = [], isLoading } = useQuery(['pfSettings'], async () => {
    const res = await api.get('/pf');
    return res.data;
  });

  // Get the latest (most recent by effective_date) settings row
  const latestSettings: PFSettingsRecord | null = pfList.length > 0
    ? pfList.reduce((latest: PFSettingsRecord, curr: PFSettingsRecord) =>
        curr.effective_date > latest.effective_date ? curr : latest
      , pfList[0])
    : null;

  // Editable inline state
  const [pfEmployeeRate, setPfEmployeeRate] = useState<number | ''>(latestSettings?.employee_contribution_rate ?? 12);
  const [pfEmployerRate, setPfEmployerRate] = useState<number | ''>(latestSettings?.employer_contribution_rate ?? 12);
  const [esiEmployeeRate, setEsiEmployeeRate] = useState<number | ''>(latestSettings?.esi_employee_contribution_rate !== undefined ? Number(latestSettings.esi_employee_contribution_rate) : 0.75);
  const [esiEmployerRate, setEsiEmployerRate] = useState<number | ''>(latestSettings?.esi_contribution_rate !== undefined ? Number(latestSettings.esi_contribution_rate) : 3.25);
  const [professionalTax, setProfessionalTax] = useState<number | ''>(latestSettings?.professional_tax !== undefined ? Number(latestSettings.professional_tax) : 200);

  const [isEditing, setIsEditing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Sync state when data loads
  React.useEffect(() => {
    if (pfList.length > 0 && !loaded) {
      setPfEmployeeRate(Number(latestSettings?.employee_contribution_rate ?? 12));
      setPfEmployerRate(Number(latestSettings?.employer_contribution_rate ?? 12));
      setEsiEmployeeRate(latestSettings?.esi_employee_contribution_rate !== undefined ? Number(latestSettings.esi_employee_contribution_rate) : 0.75);
      setEsiEmployerRate(latestSettings?.esi_contribution_rate !== undefined ? Number(latestSettings.esi_contribution_rate) : 3.25);
      setProfessionalTax(latestSettings?.professional_tax !== undefined ? Number(latestSettings.professional_tax) : 200);
      setLoaded(true);
    }
  }, [pfList, latestSettings, loaded]);

  // Update mutation
  const updateMutation = useMutation(
    async (payload: {
      employee_contribution_rate: number;
      employer_contribution_rate: number;
      esi_contribution_rate: number;
      esi_employee_contribution_rate: number;
      professional_tax: number;
      effective_date: string;
    }) => {
      if (latestSettings) {
        const res = await api.put(`/pf/${latestSettings.id}`, payload);
        return res.data;
      }
      const res = await api.post('/pf', payload);
      return res.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['pfSettings']);
        showToast('Settings saved successfully!', 'success');
        setIsEditing(false);
      },
      onError: (err: any) => {
        showToast(err.response?.data?.message || 'Failed to save settings', 'error');
      },
    }
  );

  const handleSave = () => {
    updateMutation.mutate({
      employee_contribution_rate: Number(pfEmployeeRate) || 0,
      employer_contribution_rate: Number(pfEmployerRate) || 0,
      esi_contribution_rate: Number(esiEmployerRate) || 0,
      esi_employee_contribution_rate: Number(esiEmployeeRate) || 0,
      professional_tax: Number(professionalTax) || 0,
      effective_date: new Date().toISOString().split('T')[0],
    });
  };

  const renderField = (
    label: string,
    value: number | '',
    onChange: (val: number | '') => void,
    suffix: string,
    color: string,
    bgColor: string,
    disabled: boolean,
    description?: string
  ) => (
    <Grid item xs={12}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Chip
            label={label}
            size="small"
            sx={{
              fontWeight: 700,
              height: 28,
              fontSize: '0.8rem',
              color: color,
              bgcolor: bgColor,
              border: `1px solid ${color}40`,
              width: 220,
              justifyContent: 'flex-start'
            }}
          />
          {isEditing || !latestSettings ? (
            <TextField
              type="number"
              size="small"
              value={value}
              onChange={(e) => {
                const raw = e.target.value;
                onChange(raw === '' ? '' : parseFloat(raw));
              }}
              inputProps={{ step: suffix === '%' ? 0.1 : 1, min: 0 }}
              disabled={disabled}
              sx={{
                width: 100,
                '& .MuiOutlinedInput-root': {
                  color: 'var(--color-text-primary)',
                  borderRadius: 'var(--radius-control)',
                  '& fieldset': { borderColor: 'var(--color-border)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--color-primary)' },
                },
              }}
            />
          ) : (
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{ color: 'var(--color-text-primary)', cursor: disabled ? 'default' : 'pointer', width: 100 }}
              onClick={() => !disabled && setIsEditing(true)}
            >
              {suffix === '₹' ? `₹${value}` : `${value}%`}
            </Typography>
          )}
        </Box>
        {description && (
          <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)', ml: '236px' }}>
            {description}
          </Typography>
        )}
      </Box>
    </Grid>
  );

  return (
    <Box>
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={30} sx={{ color: 'var(--color-primary)' }} />
        </Box>
      ) : (
        <Paper
          sx={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-card)',
            p: 4,
            maxWidth: 600,
          }}
        >
          <Typography variant="subtitle1" fontWeight={600} fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)', mb: 1 }}>
            Statutory Rates & Deductions
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mb: 3 }}>
            Settings apply globally to all employees for payroll calculations.
          </Typography>

          <Grid container spacing={3}>
            {renderField('PF Employer Benefit', pfEmployerRate, setPfEmployerRate, '%', 'var(--color-primary-hover)', 'rgba(59, 130, 246, 0.12)', !isFinanceOrAdmin, 'Calculated on Basic Salary (Max PF Cap of 1800 typically applies)')}
            {renderField('PF Employee Contribution', pfEmployeeRate, setPfEmployeeRate, '%', 'var(--color-primary-hover)', 'rgba(59, 130, 246, 0.12)', !isFinanceOrAdmin, 'Deducted from Basic Salary (Max PF Cap of 1800 typically applies)')}
            {renderField('ESI Employer Benefit', esiEmployerRate, setEsiEmployerRate, '%', 'var(--color-success)', 'rgba(16, 185, 129, 0.12)', !isFinanceOrAdmin, 'Applies only when Basic Salary is ≤ ₹21,000')}
            {renderField('ESI Employee Contribution', esiEmployeeRate, setEsiEmployeeRate, '%', 'var(--color-success)', 'rgba(16, 185, 129, 0.12)', !isFinanceOrAdmin, 'Applies only when Basic Salary is ≤ ₹21,000')}
            {renderField('Professional Tax Amount', professionalTax, setProfessionalTax, '₹', 'var(--color-warning)', 'rgba(245, 158, 11, 0.12)', !isFinanceOrAdmin, 'Deducted annually/monthly if CTC > ₹250,000')}

            {isFinanceOrAdmin && (isEditing || !latestSettings) && (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 1.5, mt: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    disabled={updateMutation.isLoading}
                    sx={{
                      background: 'var(--color-primary)',
                      borderRadius: 'var(--radius-control)',
                      textTransform: 'none',
                      fontWeight: 600,
                    }}
                  >
                    {updateMutation.isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setIsEditing(false);
                      if (latestSettings) {
                        setPfEmployeeRate(Number(latestSettings.employee_contribution_rate));
                        setPfEmployerRate(Number(latestSettings.employer_contribution_rate));
                        setEsiEmployeeRate(Number(latestSettings.esi_employee_contribution_rate || 0.75));
                        setEsiEmployerRate(Number(latestSettings.esi_contribution_rate || 3.25));
                        setProfessionalTax(Number(latestSettings.professional_tax || 200));
                      }
                    }}
                    sx={{
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-secondary)',
                      borderRadius: 'var(--radius-control)',
                      textTransform: 'none',
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              </Grid>
            )}

            {isFinanceOrAdmin && !isEditing && latestSettings && (
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  onClick={() => setIsEditing(true)}
                  sx={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                    borderRadius: 'var(--radius-control)',
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  Edit Rates
                </Button>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}

      {/* History table */}
      {pfList.length > 0 && (
        <Paper
          sx={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-card)',
            overflow: 'hidden',
            p: 3,
            mt: 3,
          }}
        >
          <Typography variant="subtitle2" fontWeight={600} sx={{ color: 'var(--color-text-secondary)', mb: 2 }}>
            Rate Change History
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {pfList.map((rec: PFSettingsRecord) => (
              <Box
                key={rec.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 1.5,
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-control)',
                  bgcolor: 'var(--color-surface-subtle)',
                  flexWrap: 'wrap'
                }}
              >
                <Chip
                  label={rec.effective_date}
                  size="small"
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    color: 'var(--color-text-primary)',
                    bgcolor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}
                />
                <Typography variant="body2" sx={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
                  PF (Employer: {rec.employer_contribution_rate}%, Employee: {rec.employee_contribution_rate}%)
                </Typography>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                  ESI (Employer: {rec.esi_contribution_rate}%, Employee: {rec.esi_employee_contribution_rate}%)
                </Typography>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                  PT: ₹{rec.professional_tax}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

const ComplianceSettings: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight="bold" fontFamily="Outfit" sx={{ color: 'var(--color-text-primary)' }}>
          Compliance & Tax Settings
        </Typography>
        <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mt: 0.5 }}>
          Manage statutory compliance settings including Provident Fund (PF), ESI, and progressive Income Tax Slabs. These settings directly influence payroll processing and financial summaries.
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: 1, borderColor: 'var(--color-border)', mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
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
          <Tab label="PF & ESI Configuration" />
          <Tab label="Income Tax Slabs" />
        </Tabs>
        <Box id="compliance-actions" sx={{ display: 'flex', alignItems: 'center', gap: 2, pb: 0.5 }} />
      </Box>

      {currentTab === 0 && <PFSettings />}
      {currentTab === 1 && <TaxSlabs />}
    </Box>
  );
};

export default ComplianceSettings;
