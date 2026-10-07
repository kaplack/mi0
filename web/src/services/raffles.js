import { api } from './api'
export const rafflesApi = {
  get: (id) => api('/raffles/' + id),
  list: (workspaceId, signal) => api('/raffles?workspaceId=' + encodeURIComponent(workspaceId), { signal }),
  config: (signal) => api('/raffles/config', { signal }),
  save: (payload, id) => api(id ? '/raffles/' + id : '/raffles', { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }),
  draw: (id) => api('/raffles/' + id + '/draw', { method: 'POST' }),
  requestPublication: (id, reference) => api('/raffles/' + id + '/publication', { method: 'POST', body: JSON.stringify({ reference }) }),
  publicResults: (code, signal) => api('/raffles/public/' + encodeURIComponent(code), { signal }),
}
