import { api, TOKEN_KEY } from './api'
const root = '/qr-catalog/'

export const GUEST_CATALOG_KEY = 'mi0_catalog_guest'

export function getGuestToken(workspaceId) {
  try {
    const raw = localStorage.getItem(GUEST_CATALOG_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (workspaceId && parsed[workspaceId]) return parsed[workspaceId]
    return parsed.token || null
  } catch {
    return null
  }
}

export function getLastGuestWorkspaceId() {
  try {
    const raw = localStorage.getItem(GUEST_CATALOG_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed.lastWorkspaceId || null
  } catch {
    return null
  }
}

export function saveGuestToken(workspaceId, token) {
  try {
    const raw = localStorage.getItem(GUEST_CATALOG_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    if (workspaceId) parsed[workspaceId] = token
    parsed.lastWorkspaceId = workspaceId
    parsed.token = token
    localStorage.setItem(GUEST_CATALOG_KEY, JSON.stringify(parsed))
  } catch {}
}

export function clearGuestToken(workspaceId) {
  try {
    const raw = localStorage.getItem(GUEST_CATALOG_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (workspaceId) delete parsed[workspaceId]
    if (parsed.lastWorkspaceId === workspaceId) {
      delete parsed.lastWorkspaceId
      delete parsed.token
    }
    localStorage.setItem(GUEST_CATALOG_KEY, JSON.stringify(parsed))
  } catch {}
}

function req(path, options = {}, workspaceId) {
  const token = workspaceId ? getGuestToken(workspaceId) : getGuestToken()
  const headers = { ...options.headers }
  if (token) {
    headers['X-Admin-Token'] = token
  }
  return api(path, { ...options, headers })
}

export const getQrCatalog = workspaceId => req(root + workspaceId, {}, workspaceId)
export const getPublicQrCatalog = (code, options, slug) => api(root + (slug ? 'by-space/' + slug : 'public/' + code), options)
export const saveQrCatalog = (workspaceId, data) => req(root + workspaceId, { method: 'PUT', body: JSON.stringify(data) }, workspaceId)
export const saveCatalogCategory = (workspaceId, data, id) => req(root + workspaceId + '/categories' + (id ? '/' + id : ''), { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) }, workspaceId)
export const deleteCatalogCategory = (workspaceId, id) => req(root + workspaceId + '/categories/' + id, { method: 'DELETE' }, workspaceId)
export const saveCatalogProduct = (workspaceId, data, id) => req(root + workspaceId + '/products' + (id ? '/' + id : ''), { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) }, workspaceId)
export const deleteCatalogProduct = (workspaceId, id) => req(root + workspaceId + '/products/' + id, { method: 'DELETE' }, workspaceId)
export const removeCatalogImage = (workspaceId, id) => req(root + workspaceId + '/images/' + id, { method: 'DELETE' }, workspaceId)
export const removeCatalogLogo = workspaceId => req(root + workspaceId + '/logo', { method: 'DELETE' }, workspaceId)

const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
export const catalogImageUrl = url => base + url

export async function uploadCatalogImage(workspaceId, file, productId) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error('Selecciona una imagen PNG, JPEG o WebP de hasta 5 MB.')
  return req(root + workspaceId + (productId ? '/products/' + productId + '/images' : '/logo'), { method: 'POST', headers: { 'Content-Type': file.type }, body: file }, workspaceId)
}

export async function catalogPreviewImage(url, signal) {
  const userToken = localStorage.getItem(TOKEN_KEY)
  const guestToken = getGuestToken()
  const headers = {}
  if (userToken) headers.Authorization = 'Bearer ' + userToken
  if (guestToken) headers['X-Admin-Token'] = guestToken
  const response = await fetch(catalogImageUrl(url.replace('/public/', '/preview/')), { signal, headers })
  if (!response.ok) throw new Error('No pudimos cargar la imagen')
  return URL.createObjectURL(await response.blob())
}

export const requestCatalogLink = (workspaceId, body) => req(root + workspaceId + '/link-request', { method: 'POST', body: JSON.stringify(body) }, workspaceId)
export const removeCatalogBanner = workspaceId => req(root + workspaceId + '/banner', { method: 'DELETE' }, workspaceId)
export async function uploadCatalogBanner(workspaceId, file) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024) throw new Error('Selecciona una portada PNG, JPEG o WebP de hasta 5 MB.')
  return req(root + workspaceId + '/banner', { method: 'POST', headers: { 'Content-Type': file.type }, body: file }, workspaceId)
}

export const createGuestCatalog = data => api(root + 'guest/create', { method: 'POST', body: JSON.stringify(data) })
export const attachCatalog = (workspaceId, adminToken) => api(root + workspaceId + '/attach', { method: 'POST', body: JSON.stringify({ adminToken }) })
export const checkCatalogSlug = (slug, workspaceId) => api(root + 'check-slug/' + encodeURIComponent(slug) + (workspaceId ? '?workspaceId=' + encodeURIComponent(workspaceId) : ''))
