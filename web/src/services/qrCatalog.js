import { api, TOKEN_KEY } from './api'
const root = '/qr-catalog/'
export const getQrCatalog = workspaceId => api(root + workspaceId)
export const getPublicQrCatalog = (code, options, slug) => api(root + (slug ? 'by-space/' + slug : 'public/' + code), options)
export const saveQrCatalog = (workspaceId, data) => api(root + workspaceId, { method: 'PUT', body: JSON.stringify(data) })
export const saveCatalogCategory = (workspaceId, data, id) => api(root + workspaceId + '/categories' + (id ? '/' + id : ''), { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) })
export const deleteCatalogCategory = (workspaceId, id) => api(root + workspaceId + '/categories/' + id, { method: 'DELETE' })
export const saveCatalogProduct = (workspaceId, data, id) => api(root + workspaceId + '/products' + (id ? '/' + id : ''), { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) })
export const deleteCatalogProduct = (workspaceId, id) => api(root + workspaceId + '/products/' + id, { method: 'DELETE' })
export const removeCatalogImage = (workspaceId, id) => api(root + workspaceId + '/images/' + id, { method: 'DELETE' })
export const removeCatalogLogo = workspaceId => api(root + workspaceId + '/logo', { method: 'DELETE' })
const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
export const catalogImageUrl = url => base + url
export async function uploadCatalogImage(workspaceId, file, productId) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error('Selecciona una imagen PNG, JPEG o WebP de hasta 5 MB.')
  return api(root + workspaceId + (productId ? '/products/' + productId + '/images' : '/logo'), { method: 'POST', headers: { 'Content-Type': file.type }, body: file })
}
export async function catalogPreviewImage(url, signal) {
  const response = await fetch(catalogImageUrl(url.replace('/public/', '/preview/')), { signal, headers: { Authorization: 'Bearer ' + localStorage.getItem(TOKEN_KEY) } })
  if (!response.ok) throw new Error('No pudimos cargar la imagen')
  return URL.createObjectURL(await response.blob())
}

export const requestCatalogLink = (workspaceId, body) => api(root + workspaceId + '/link-request', {method:'POST',body:JSON.stringify(body)})

export const removeCatalogBanner = workspaceId => api(root + workspaceId + '/banner', {method:'DELETE'})
export async function uploadCatalogBanner(workspaceId,file) {
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||!file.size||file.size>5*1024*1024)throw new Error('Selecciona una portada PNG, JPEG o WebP de hasta 5 MB.')
 return api(root+workspaceId+'/banner',{method:'POST',headers:{'Content-Type':file.type},body:file})
}
