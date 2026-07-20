import api from './axios';

const asMultipart = (formData) => ({ headers: { 'Content-Type': 'multipart/form-data' } });

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  googleLogin: (credential) => api.post('/auth/google', { credential }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.patch('/auth/change-password', data)
};

export const userApi = {
  list: (params) => api.get('/users', { params }),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.patch(`/users/${id}`, data),
  toggleActive: (id) => api.patch(`/users/${id}/disable`),
  resetPassword: (id) => api.post(`/users/${id}/reset-password`),
  remove: (id) => api.delete(`/users/${id}`),
  bulkImport: (formData) => api.post('/users/bulk-import', formData, asMultipart(formData))
};

export const companyApi = {
  list: () => api.get('/companies'),
  create: (data) => api.post('/companies', data),
  update: (id, data) => api.patch(`/companies/${id}`, data),
  remove: (id) => api.delete(`/companies/${id}`)
};

export const officeApi = {
  list: (params) => api.get('/offices', { params }),
  create: (data) => api.post('/offices', data),
  update: (id, data) => api.patch(`/offices/${id}`, data),
  remove: (id) => api.delete(`/offices/${id}`)
};

export const departmentApi = {
  list: (params) => api.get('/departments', { params }),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.patch(`/departments/${id}`, data),
  remove: (id) => api.delete(`/departments/${id}`)
};

export const vendorApi = {
  list: (params) => api.get('/vendors', { params }),
  create: (data) => api.post('/vendors', data),
  update: (id, data) => api.patch(`/vendors/${id}`, data),
  remove: (id) => api.delete(`/vendors/${id}`),
  bulkImport: (formData) => api.post('/vendors/bulk-import', formData, asMultipart(formData))
};

export const categoryApi = {
  list: () => api.get('/item-categories'),
  create: (data) => api.post('/item-categories', data),
  update: (id, data) => api.patch(`/item-categories/${id}`, data),
  remove: (id) => api.delete(`/item-categories/${id}`),
  bulkImport: (formData) => api.post('/item-categories/bulk-import', formData, asMultipart(formData))
};

export const purchaseApi = {
  list: (params) => api.get('/purchases', { params }),
  get: (id) => api.get(`/purchases/${id}`),
  create: (data) => api.post('/purchases', data),
  update: (id, data) => api.patch(`/purchases/${id}`, data),
  remove: (id) => api.delete(`/purchases/${id}`),
  bulkImport: (formData) => api.post('/purchases/bulk-import', formData, asMultipart(formData))
};

export const inventoryApi = {
  list: (params) => api.get('/inventory/items', { params }),
  get: (id) => api.get(`/inventory/items/${id}`),
  createUnits: (data) => api.post('/inventory/items', data),
  update: (id, data) => api.patch(`/inventory/items/${id}`, data),
  qrCode: (id) => api.get(`/inventory/items/${id}/qrcode`),
  issue: (data) => api.post('/inventory/items/issue', data),
  return: (data) => api.post('/inventory/items/return', data),
  transfer: (id, data) => api.post(`/inventory/items/${id}/transfer`, data),
  scrap: (id, data) => api.post(`/inventory/items/${id}/scrap`, data),
  updateStatus: (id, data) => api.patch(`/inventory/items/${id}/status`, data),
  bulkImport: (formData) => api.post('/inventory/items/bulk-import', formData, asMultipart(formData)),
  bulkExport: (format) => api.get('/inventory/items/bulk-export', { params: { format }, responseType: 'blob' })
};

export const ticketApi = {
  list: (params) => api.get('/tickets', { params }),
  get: (id) => api.get(`/tickets/${id}`),
  create: (formData) => api.post('/tickets', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.patch(`/tickets/${id}`, data),
  approve: (id) => api.patch(`/tickets/${id}/approve`),
  reject: (id, data) => api.patch(`/tickets/${id}/reject`, data),
  assign: (id, data) => api.patch(`/tickets/${id}/assign`, data),
  resolve: (id) => api.patch(`/tickets/${id}/resolve`),
  close: (id) => api.patch(`/tickets/${id}/close`),
  reopen: (id) => api.patch(`/tickets/${id}/reopen`),
  comments: (id) => api.get(`/tickets/${id}/comments`),
  addComment: (id, data) => api.post(`/tickets/${id}/comments`, data)
};

export const dashboardApi = {
  summary: () => api.get('/dashboard/summary'),
  charts: () => api.get('/dashboard/charts')
};

export const reportApi = {
  download: (type, format) => api.get(`/reports/${type}`, { params: { format }, responseType: 'blob' })
};

export const searchApi = {
  global: (q) => api.get('/search', { params: { q } })
};

export const notificationApi = {
  list: () => api.get('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all')
};
