import { useCallback, useEffect, useState } from 'react'
import { getQrCatalog } from '../../services/qrCatalog'

export function useQrCatalog(workspaceId, initialData = null) {
  const [data, setData] = useState(initialData)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const reload = useCallback(() => {
    if (!workspaceId) return Promise.resolve(null)
    setError('')
    return getQrCatalog(workspaceId).then(setData).catch(e => setError(e.message))
  }, [workspaceId])

  useEffect(() => {
    if (!workspaceId) {
      if (initialData) setData(initialData)
      return
    }
    let alive = true
    getQrCatalog(workspaceId).then(d => { if (alive) setData(d) }).catch(e => { if (alive) setError(e.message) })
    return () => { alive = false }
  }, [workspaceId, initialData])

  async function act(operation, message) {
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await operation()
      if (result) setData(result)
      if (message) setNotice(message)
      return result
    } catch (e) {
      setError(e.message)
      return null
    } finally {
      setBusy(false)
    }
  }

  return { data, error, busy, notice, reload, act, setData }
}
