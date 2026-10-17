import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { tools as visuals } from './catalog'
export function useCatalog() {
  const [state, setState] = useState({ tools: [], categories: [], loading: true, error: '' })
  useEffect(() => {
    const controller = new AbortController()
    api('/catalog', { signal: controller.signal }).then(data => {
      if (controller.signal.aborted) return
      const tools = visuals.flatMap(visual => data.modules.filter(module => module.code === visual.code)).map(module => ({
        ...(visuals.find(item => item.code === module.code) || { icon: '+', tone: 'mint', available: false }),
        iconUrl: module.iconUrl, code: module.code, title: module.name, description: module.description || '', free: module.free,
        categories: module.categories, category: module.categories.map(c => c.name).join(' · ') || 'Sin categoría',
      }))
      setState({ tools, categories: data.categories, loading: false, error: '' })
    }).catch(e => { if (!controller.signal.aborted) setState({ tools: [], categories: [], loading: false, error: e.message }) })
    return () => controller.abort()
  }, [])
  return state
}
