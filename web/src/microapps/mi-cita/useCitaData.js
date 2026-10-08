import { useCallback, useEffect, useState } from 'react'
import { api } from '../../services/api'
import { citaService } from '../../services/citas'
export function useCitaResource(path, poll = 0, options = {}) {
  const [result, setResult] = useState({ path: null, data: null, error: '' })
  const [version, setVersion] = useState(0)
  const method = options.method || 'GET'
  const body = options.body
  const reload = useCallback(() => setVersion(value => value + 1), [])
  useEffect(() => {
    if (!path) return
    const controller = new AbortController()
    let running = false
    async function load() {
      if (running) return
      running = true
      try {
        const data = await api(path, { signal: controller.signal, method, ...(body ? { body } : {}) })
        if (!controller.signal.aborted) setResult({ path, data, error: '' })
      } catch (failure) {
        if (!controller.signal.aborted) setResult(previous => ({ path, data: previous.path === path ? previous.data : null, error: failure.message }))
      } finally { running = false }
    }
    load()
    const timer = poll ? setInterval(load, poll) : null
    return () => { controller.abort(); if (timer) clearInterval(timer) }
  }, [path, poll, version, method, body])
  return { data: result.path === path ? result.data : null, error: result.path === path ? result.error : '', reload }
}
export function useCitaMutation() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function mutate(action, ...args) {
    setBusy(true); setError('')
    try { return await citaService[action](...args) } catch (failure) { setError(failure.message); return null } finally { setBusy(false) }
  }
  return { mutate, busy, error }
}
