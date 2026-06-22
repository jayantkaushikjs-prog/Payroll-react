import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import PFSettings from './PFSettings';
import TaxSlabs from './TaxSlabs';

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
