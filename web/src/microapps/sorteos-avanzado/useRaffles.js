import { useEffect, useState } from 'react'
import { rafflesApi } from '../../services/raffles'
export function useRaffles(workspaceId) {
  const [raffles, setRaffles] = useState([])
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    Promise.all([rafflesApi.list(workspaceId, controller.signal), rafflesApi.config(controller.signal)])
      .then(([list, settings]) => { setRaffles(list.raffles); setConfig(settings.publication) })
      .catch(err => { if (!controller.signal.aborted) setError(err.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [workspaceId])
  async function action(operation) {
    if (busy) return null
    setBusy(true)
    setError('')
    try {
      const { raffle } = await operation()
      setRaffles(previous => [raffle, ...previous.filter(item => item.id !== raffle.id)])
      return raffle
    } catch (err) {
      setError(err.message)
      return null
    } finally { setBusy(false) }
  }
  return { raffles, config, loading, busy, error, setError,
    save: (payload, id) => action(() => rafflesApi.save({ ...payload, workspaceId }, id)),
    draw: (id) => action(() => rafflesApi.draw(id)),
    refresh: (id) => action(() => rafflesApi.get(id)),
    publish: (id, reference) => action(() => rafflesApi.requestPublication(id, reference)) }
}
