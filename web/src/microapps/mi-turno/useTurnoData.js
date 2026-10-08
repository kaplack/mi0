import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../services/api'

export function useTurnoData(path) {
  const [result, setResult] = useState(null)
  const [failure, setFailure] = useState(null)
  const sequence = useRef(0)
  const reload = useCallback(async () => {
    if (!path) return
    const request = ++sequence.current
    try {
      const data = await api(path)
      if (request === sequence.current) { setResult({ path, data }); setFailure(null) }
      return data
    } catch (error) {
      if (request === sequence.current) setFailure({ path, message: error.message })
    }
  }, [path])
  const invalidate = useCallback(() => { sequence.current++ }, [])
  useEffect(() => {
    let stopped = false
    let timer
    async function poll() {
      await reload()
      if (!stopped) timer = setTimeout(poll, 3000)
    }
    poll()
    return () => { stopped = true; clearTimeout(timer); invalidate() }
  }, [reload, invalidate])
  const replace = data => { sequence.current++; setResult({ path, data }) }
  return { data: result?.path === path ? result.data : null, error: failure?.path === path ? failure.message : '', reload, replace }
}
