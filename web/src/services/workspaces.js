import { api } from './api'
export const listWorkspaces = options => api('/workspaces', options)
export const addMicroapp = (workspaceId, code) => api('/workspaces/' + encodeURIComponent(workspaceId) + '/modules/' + encodeURIComponent(code), { method: 'POST' })

export const createWorkspace = name => api('/workspaces', {method:'POST',body:JSON.stringify({name})})
export const renameWorkspace = (id,name) => api('/workspaces/'+id, {method:'PATCH',body:JSON.stringify({name})})
export const deleteWorkspace = id => api('/workspaces/'+id, {method:'DELETE'})
