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
  updateProfession(payload) {
    return request('/api/auth/me/profession', {
      method: 'PUT', headers: json, body: JSON.stringify(payload)
    });
  },
  updateProfile(payload) {
    return request('/api/auth/me/profile', {
      method: 'PUT', headers: json, body: JSON.stringify(payload)
    });
  },
  updatePassword(payload) {
    return request('/api/auth/me/password', {
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
  bulkDelete(ids)        { return request('/api/tasks/bulk', { method: 'DELETE', headers: json, body: JSON.stringify({ ids }) }); },
  duplicateTask(id)      { return request(`/api/tasks/${id}/duplicate`, { method: 'POST' }); },
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

  // ── Comments ───────────────────────────────────────────────
  getComments(taskId)            { return request(`/api/tasks/${taskId}/comments`); },
  addComment(taskId, body)       { return request(`/api/tasks/${taskId}/comments`, { method: 'POST', headers: json, body: JSON.stringify({ body }) }); },
  deleteComment(id)              { return request(`/api/comments/${id}`, { method: 'DELETE' }); },

  // ── Time Tracking ──────────────────────────────────────────
  getTime(taskId)                { return request(`/api/tasks/${taskId}/time`); },
  startTime(taskId)              { return request(`/api/tasks/${taskId}/time/start`, { method: 'POST' }); },
  stopTime(taskId)               { return request(`/api/tasks/${taskId}/time/stop`, { method: 'POST' }); },

  // ── AI ─────────────────────────────────────────────────────
  askAi(message, context) {
    return request('/api/ai/chat', { method: 'POST', headers: json, body: JSON.stringify({ message, context }) });
  },

  // ── Analytics ──────────────────────────────────────────────
  getWeeklyAnalytics()       { return request('/api/analytics/weekly'); },
  getHeatmapAnalytics()      { return request('/api/analytics/heatmap'); },
  getStatsAnalytics()        { return request('/api/analytics/stats'); },
  getPriorityDistribution()  { return request('/api/analytics/priority-distribution'); },

  // ── Admin ──────────────────────────────────────────────────
  adminOverview()            { return request('/api/admin/overview'); },
  adminUsers()               { return request('/api/admin/users'); },
  adminCreateUser(payload)   { return request('/api/admin/users', { method: 'POST', headers: json, body: JSON.stringify(payload) }); },
  adminDeleteUser(id)        { return request(`/api/admin/users/${id}`, { method: 'DELETE' }); },
  adminUserProfile(id)       { return request(`/api/admin/users/${id}/profile`); },
  adminUserTasks(id)         { return request(`/api/admin/users/${id}/tasks`); }
};