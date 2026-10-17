import { useState } from 'react'
export function MicroappIcon({ url, fallback }) {
  const [failed, setFailed] = useState(null)
  return url && failed !== url ? <img className="microapp-icon-image" src={`${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}${url}`} alt="" onError={() => setFailed(url)} /> : fallback
}
