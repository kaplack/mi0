import { api } from './api'
export const listWorkspaces = options => api('/workspaces', options)
export const addMicroapp = (workspaceId, code) => api('/workspaces/' + encodeURIComponent(workspaceId) + '/modules/' + encodeURIComponent(code), { method: 'POST' })
