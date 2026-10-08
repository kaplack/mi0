import { api } from './api'
const root = id => '/citas/workspace/' + id
export const citaService = {
  saveSettings: (id, body) => api(root(id) + '/settings', { method: 'PUT', body: JSON.stringify(body) }),
  saveProfessional: (id, professionalId, body) => api(root(id) + '/professionals' + (professionalId ? '/' + professionalId : ''), { method: professionalId ? 'PUT' : 'POST', body: JSON.stringify(body) }),
  updateStatus: (id, appointmentId, status) => api(root(id) + '/appointments/' + appointmentId, { method: 'PATCH', body: JSON.stringify({ status }) }),
  async request(code, body) {
    try { return await api('/citas/public/' + code + '/appointments', { method: 'POST', body: JSON.stringify(body) }) }
    catch (failure) {
      // A response can be lost after the server commits; recover this exact request.
      try {
        const result = await api('/citas/public/' + code + '/receipt', { method: 'POST', body: JSON.stringify({ requestKey: body.requestKey }) })
        if (result.receipt?.startsAt === body.startsAt) return result
      } catch { /* Preserve the original error when there is no stored receipt. */ }
      throw failure
    }
  },
}
