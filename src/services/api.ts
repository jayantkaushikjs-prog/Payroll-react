import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
});

// Request interceptor to add the authorization token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('payroll_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
