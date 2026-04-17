let _authUser = null;

export function setAuthUser(user) {
  _authUser = user;
}

async function request(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (_authUser?.id) headers['x-user-id'] = String(_authUser.id);

  const response = await fetch(url, { ...options, headers });
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const body = isJson
    ? await response.json().catch(() => ({}))
    : await response.text().catch(() => '');

  if (!response.ok) {
    const message = isJson
      ? body.error || body.message
      : body || response.statusText || 'Request failed';
    throw new Error(message);
  }
  return body;
}

const json = { 'Content-Type': 'application/json' };

export const api = {
  // ── Auth ───────────────────────────────────────────────────
  login(payload) {
    return request('/api/auth/login', {
      method: 'POST', headers: json, body: JSON.stringify(payload)
    });
  },
  register(payload) {
    return request('/api/auth/register', {
      method: 'POST', headers: json, body: JSON.stringify(payload)
    });
  },
  me() {
    return request('/api/auth/me');
  },
  updateSettings(payload) {
    return request('/api/auth/me/settings', {
      method: 'PUT', headers: json, body: JSON.stringify(payload)
    });
  },

  // ── Tasks ──────────────────────────────────────────────────
  getTasks(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.set(k, v);
    });
    return request(`/api/tasks${query.size ? '?' + query : ''}`);
  },
  getTask(id)            { return request(`/api/tasks/${id}`); },
  createTask(payload)    { return request('/api/tasks', { method: 'POST', headers: json, body: JSON.stringify(payload) }); },
  updateTask(id, payload){ return request(`/api/tasks/${id}`, { method: 'PUT',  headers: json, body: JSON.stringify(payload) }); },
  deleteTask(id)         { return request(`/api/tasks/${id}`, { method: 'DELETE' }); },
  updateStatus(id, status) {
    return request(`/api/tasks/${id}/status`, { method: 'PATCH', headers: json, body: JSON.stringify({ status }) });
  },
  completeTask(id)   { return request(`/api/tasks/${id}/complete`,   { method: 'PATCH' }); },
  incompleteTask(id) { return request(`/api/tasks/${id}/incomplete`, { method: 'PATCH' }); },

  // ── Templates & Scheduling ─────────────────────────────────
  getTemplates()           { return request('/api/tasks/templates'); },
  createFromTemplate(id)   { return request(`/api/tasks/from-template/${id}`, { method: 'POST' }); },
  generateRecurring()      { return request('/api/tasks/recurring/generate'); },
  reschedule(holidays = []) {
    return request('/api/tasks/reschedule', { method: 'POST', headers: json, body: JSON.stringify({ holidays }) });
  },
  importCsv(file) {
    const fd = new FormData();
    fd.append('file', file);
    return request('/api/tasks/import-csv', { method: 'POST', body: fd });
  },

  // ── Analytics ──────────────────────────────────────────────
  getWeeklyAnalytics()  { return request('/api/analytics/weekly'); },
  getHeatmapAnalytics() { return request('/api/analytics/heatmap'); },
  getStatsAnalytics()   { return request('/api/analytics/stats'); },

  // ── Admin ──────────────────────────────────────────────────
  adminOverview() { return request('/api/admin/overview'); },
  adminUsers()    { return request('/api/admin/users'); }
};