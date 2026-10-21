import { useCallback, useEffect, useRef, useState } from 'react'
export function useBingo(load, key, polling = true) {
  const loader = useRef(load)
  useEffect(() => { loader.current = load }, [load])
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const reload = useCallback(async () => {
    try { const result = await loader.current(); setData(result); setError(''); return result }
    catch (failure) { setError(failure.message); return null }
  }, [])
  useEffect(() => {
    let disposed = false, timer
    async function tick() {
      try {
        const result = await loader.current()
        if (disposed) return
        setData(result); setError('')
        if (polling && result.room && result.room.status !== 'FINISHED') timer = setTimeout(tick, document.hidden ? 6000 : 1500)
      } catch (failure) {
        if (!disposed) { setError(failure.message); if (polling) timer = setTimeout(tick, 5000) }
      }
    }
    tick()
    return () => { disposed = true; clearTimeout(timer) }
  }, [key, polling])
  return { data, error, reload }
}
