import { api } from './api'
const post = (path, body) => api('/bingo' + path, { method: 'POST', body: JSON.stringify(body) })
export const bingo = {
  guestCurrent: adminToken => post('/guest/current', { adminToken }),
  guestCreate: body => post('/guest/create', body),
  guestInfo: (code, adminToken) => post('/guest/' + code + '/info', { adminToken }),
  guestAction: (code, action, body) => post('/guest/' + code + '/' + action, body),
  recovery: (code, body) => post('/guest/' + code + '/recovery', body),
  recover: body => post('/guest/recover', body),
  attach: (code, body) => post('/' + code + '/attach', body),
  spaces: () => api('/workspaces'),
  list: id => api('/bingo?workspaceId=' + id),
  create: body => post('', body),
  info: code => api('/bingo/' + code),
  state: (code, token) => token ? post('/public/' + code + '/me', { token }) : api('/bingo/public/' + code),
  join: (code, body) => post('/public/' + code + '/join', body),
  claim: (code, body) => post('/public/' + code + '/claim', body),
  action: (code, action, body = {}) => post('/' + code + '/' + action, body),
}
export const GUEST_KEY = 'mi0_bingo_guest'
export const UPGRADE_KEY = 'mi0_bingo_upgrade'
export const randomSecret = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join('')
export function guestAccess() {
  try { return JSON.parse(localStorage.getItem(GUEST_KEY) || 'null') } catch { return null }
}
export function pendingRecovery() {
  const fragment = new URLSearchParams(location.hash.slice(1)).get('recuperar')
  if (fragment) {
    // Consume before any network request; secrets never enter paths or queries.
    history.replaceState(null, '', location.pathname + location.search)
    if (/^[a-f0-9]{32}\.[a-f0-9]{64}$/.test(fragment)) {
      const [code, recoveryToken] = fragment.split('.')
      sessionStorage.setItem('mi0_bingo_recovery', JSON.stringify({ code, recoveryToken, newAdminToken: randomSecret() }))
    } else { sessionStorage.setItem('mi0_bingo_recovery', JSON.stringify({ invalid: true })); return { invalid: true } }
  }
  try { return JSON.parse(sessionStorage.getItem('mi0_bingo_recovery') || 'null') } catch { return null }
}
export function playerToken(code) {
  const key = 'mi0_bingo_identity_' + code
  let token = localStorage.getItem(key)
  if (!token) {
    token = Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join('')
    localStorage.setItem(key, token)
  }
  return token
}
