import api from './api';

export const EmployeeService = {
  // Employees CRUD & List
  getAll: async () => {
    const res = await api.get('/employees');
    return res.data;
  },
  create: async (data: any) => {
    const res = await api.post('/employees', data);
    return res.data;
  },
  update: async (id: number, data: any) => {
    const res = await api.put(`/employees/${id}`, data);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/employees/${id}`);
    return res.data;
  },
  updateStatus: async (id: number, statusData: any) => {
    const res = await api.put(`/employees/status/${id}`, statusData);
    return res.data;
  },
  getNextCode: async () => {
    const res = await api.get('/employees/next-code');
    return res.data;
  },
  downloadCsv: async () => {
    const res = await api.get('/employees/csv', { responseType: 'blob' });
    return res.data;
  },
  exportFinancials: async (id: number, start: string, end: string) => {
    const res = await api.get(`/employees/${id}/export-financials?startDate=${start}&endDate=${end}`, { responseType: 'blob' });
    return res.data;
  },
  importCsv: async (employees: any[]) => {
    const res = await api.post('/employees/import', { employees });
    return res.data;
  },

  // Departments & Designations
  getDepartments: async () => {
    const res = await api.get('/employees/departments');
    return res.data;
  },
  addDepartment: async (name: string) => {
    const res = await api.post('/employees/departments', { name });
    return res.data;
  },
  deleteDepartment: async (id: number) => {
    const res = await api.delete(`/employees/departments/${id}`);
    return res.data;
  },
  getDesignations: async () => {
    const res = await api.get('/employees/designations');
    return res.data;
  },
  addDesignation: async (name: string) => {
    const res = await api.post('/employees/designations', { name });
    return res.data;
  },
  deleteDesignation: async (id: number) => {
    const res = await api.delete(`/employees/designations/${id}`);
    return res.data;
  },

  // Previews & Reviews
  getPreview: async (month: string) => {
    const res = await api.get(`/employees/preview/${month}`);
    return res.data;
  },
  patchPreview: async (id: number, month: string, data: any) => {
    const res = await api.patch(`/employees/${id}/preview/${month}`, data);
    return res.data;
  },
  getPreviewReview: async (month: string) => {
    const res = await api.get(`/employees/preview-review?month=${month}`);
    return res.data;
  },
  updatePreviewReviewStatus: async (month: string, status: string) => {
    const res = await api.put('/employees/preview-review/status', { month, status });
    return res.data;
  },
  updatePreviewFinanceRemarks: async (month: string, remarks: string) => {
    const res = await api.put('/employees/preview-review/finance-remarks', { month, remarks });
    return res.data;
  },

  // Financial Summary
  getFinancialSummary: async (employeeId: number, startDate: string, endDate: string) => {
    const res = await api.get(`/employees/${employeeId}/financial-summary?startDate=${startDate}&endDate=${endDate}`);
    return res.data;
  },

  // Related Modules (Non-Payable & Payroll for Context)
  getNonPayableDays: async (month: number, year: number) => {
    const res = await api.get(`/non-payable-days/filter?month=${month}&year=${year}`);
    return res.data;
  },
  getPayrolls: async (month: number, year: number) => {
    const res = await api.get(`/payroll?month=${month}&year=${year}`);
    return res.data;
  }
};
