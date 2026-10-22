/**
 * Backend API Client Service for Hadi Petrol Pump Management System
 * Handles communication with Express REST API over /api
 */

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://hadi-petrol-pump.onrender.com/api').replace(/\/+$/, '');

const TOKEN_KEY = 'hadi_auth_token';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token, remember = true) {
  if (token) {
    if (remember) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
    }
  } else {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  }
}

export async function apiFetch(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Resolve complete backend URL avoiding double '/api' segments
  let url = endpoint;
  if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (API_BASE_URL.endsWith('/api') && cleanEndpoint.startsWith('/api/')) {
      url = `${API_BASE_URL}${cleanEndpoint.slice(4)}`;
    } else if (API_BASE_URL.endsWith('/api') && cleanEndpoint === '/api') {
      url = API_BASE_URL;
    } else {
      url = `${API_BASE_URL}${cleanEndpoint}`;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Include HTTP-only cookie
  });

  const contentType = response.headers.get('content-type');
  let data = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data?.error || (typeof data === 'string' ? data : `Request failed with status ${response.status}`);
    const error = new Error(errorMsg);
    error.status = response.status;
    error.details = data?.details;
    throw error;
  }

  return data;
}

// 1. Auth API
export const authApi = {
  login: async ({ username, pin, role }) => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, pin, role }),
    });
    if (res.token) {
      setStoredToken(res.token);
    }
    return res;
  },
  logout: async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setStoredToken(null);
    }
  },
  getMe: () => apiFetch('/api/auth/me'),
};

// 2. Station API
export const stationApi = {
  getBootstrap: () => apiFetch('/api/station/bootstrap'),
  updateRates: (rates) => apiFetch('/api/station/rates', {
    method: 'PUT',
    body: JSON.stringify(rates),
  }),
  previewMigration: (data) => apiFetch('/api/station/migrate?dryRun=true', {
    method: 'POST',
    body: JSON.stringify({ data, dryRun: true, excludeDemo: true }),
  }),
  executeMigration: (data) => apiFetch('/api/station/migrate?dryRun=false', {
    method: 'POST',
    body: JSON.stringify({ data, dryRun: false, excludeDemo: true }),
  }),
};

// 3. Procurement Loads API
export const loadsApi = {
  getAll: () => apiFetch('/api/loads'),
  create: (loadData) => apiFetch('/api/loads', {
    method: 'POST',
    body: JSON.stringify(loadData),
  }),
  addExpense: (loadId, expenseData) => apiFetch(`/api/loads/${loadId}/expenses`, {
    method: 'POST',
    body: JSON.stringify(expenseData),
  }),
};

// 4. Retail Sales API
export const salesApi = {
  getAll: (limit = 150) => apiFetch(`/api/sales?limit=${limit}`),
  create: (saleData) => apiFetch('/api/sales', {
    method: 'POST',
    body: JSON.stringify(saleData),
  }),
  delete: (saleId) => apiFetch(`/api/sales/${saleId}`, {
    method: 'DELETE',
  }),
};

// 5. Bulk Dumping Sales API
export const bulkApi = {
  getAll: (limit = 150) => apiFetch(`/api/bulk?limit=${limit}`),
  create: (bulkData) => apiFetch('/api/bulk', {
    method: 'POST',
    body: JSON.stringify(bulkData),
  }),
  delete: (bulkId) => apiFetch(`/api/bulk/${bulkId}`, {
    method: 'DELETE',
  }),
};

// 6. Customers API
export const customersApi = {
  getAll: () => apiFetch('/api/customers'),
  create: (custData) => apiFetch('/api/customers', {
    method: 'POST',
    body: JSON.stringify(custData),
  }),
  update: (id, custData) => apiFetch(`/api/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(custData),
  }),
};

// 7. Khata Ledger API
export const khataApi = {
  getTransactions: (customerId = null) => {
    const q = customerId ? `?customerId=${encodeURIComponent(customerId)}` : '';
    return apiFetch(`/api/khata/transactions${q}`);
  },
  recordPayment: (paymentData) => apiFetch('/api/khata/payments', {
    method: 'POST',
    body: JSON.stringify(paymentData),
  }),
  deleteTransaction: (txId) => apiFetch(`/api/khata/transactions/${txId}`, {
    method: 'DELETE',
  }),
};

// 8. General Operational Expenses API
export const expensesApi = {
  getAll: () => apiFetch('/api/expenses'),
  create: (expData) => apiFetch('/api/expenses', {
    method: 'POST',
    body: JSON.stringify(expData),
  }),
  delete: (expId) => apiFetch(`/api/expenses/${expId}`, {
    method: 'DELETE',
  }),
};

// 9. Shifts API
export const shiftsApi = {
  getAll: () => apiFetch('/api/shifts'),
  close: (shiftData) => apiFetch('/api/shifts/close', {
    method: 'POST',
    body: JSON.stringify(shiftData),
  }),
};

// 10. Financial Reports API
export const reportsApi = {
  getSummary: () => apiFetch('/api/reports/summary'),
};
