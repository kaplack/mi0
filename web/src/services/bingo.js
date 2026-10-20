import { api } from './api'
const post = (path, body) => api('/bingo' + path, { method: 'POST', body: JSON.stringify(body) })
export const bingo = {
  spaces: () => api('/workspaces'),
  list: id => api('/bingo?workspaceId=' + id),
  create: body => post('', body),
  info: code => api('/bingo/' + code),
  state: (code, token) => token ? post('/public/' + code + '/me', { token }) : api('/bingo/public/' + code),
  join: (code, body) => post('/public/' + code + '/join', body),
  claim: (code, body) => post('/public/' + code + '/claim', body),
  action: (code, action, body = {}) => post('/' + code + '/' + action, body),
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
