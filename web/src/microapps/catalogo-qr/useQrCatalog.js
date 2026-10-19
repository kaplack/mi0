import { useCallback, useEffect, useState } from 'react'
import { getQrCatalog } from '../../services/qrCatalog'
export function useQrCatalog(workspaceId) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const reload = useCallback(() => { setError(''); return getQrCatalog(workspaceId).then(setData).catch(e => setError(e.message)) }, [workspaceId])
  useEffect(() => { let alive = true; getQrCatalog(workspaceId).then(d => { if (alive) setData(d) }).catch(e => { if (alive) setError(e.message) }); return () => { alive = false } }, [workspaceId])
  async function act(operation, message) {
    setBusy(true); setError(''); setNotice('')
    try { const result = await operation(); setData(result); setNotice(message); return result } catch (e) { setError(e.message); return null } finally { setBusy(false) }
  }
  return { data, error, busy, notice, reload, act }
}
