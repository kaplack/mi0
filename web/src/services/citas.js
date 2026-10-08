import { api } from './api'
const root = id => '/citas/workspace/' + id
export const citaService = {
  inviteProfessional: (id, professionalId, email) => api(root(id) + '/professionals/' + professionalId + '/invitation', { method: 'POST', body: JSON.stringify({ email }) }),
  revokeProfessional: (id, professionalId) => api(root(id) + '/professionals/' + professionalId + '/access', { method: 'DELETE' }),
  invitation: (token, options) => api('/citas/invitations/' + encodeURIComponent(token), options),
  acceptInvitation: token => api('/citas/invitations/' + encodeURIComponent(token) + '/accept', { method: 'POST' }),
  currentAccount: options => api('/auth/me', options),
  logout: () => api('/auth/logout', { method: 'POST' }),
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
