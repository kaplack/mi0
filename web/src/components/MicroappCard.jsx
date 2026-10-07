import { useState } from 'react'
import { api } from '../services/api'

export function MicroappCard({ tool, user, onAdded }) {
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)

  async function addToMi0() {
    if (!user) return
    setAdding(true)
    try {
      const data = await api('/workspaces')
      const workspace = data.workspaces?.find((item) => item.type === 'PERSONAL') || data.workspaces?.[0]
      if (!workspace) throw new Error('No encontramos tu espacio')
      await api('/workspaces/' + workspace.id + '/modules/' + tool.code, { method: 'POST' })
      setAdded(true)
      onAdded?.()
    } catch (error) {
      alert(error.message)
    } finally {
      setAdding(false)
    }
  }

  return (
    <article className="tool-card">
      <div className={'tool-icon ' + tool.tone}>{tool.icon}</div>
      <span className={'tag ' + tool.tone}>{tool.category}</span>
      <h3>{tool.title}</h3>
      <p>{tool.description}</p>
      {user ? (
        <button className={'tool-add-button' + (added ? ' added' : '')} onClick={addToMi0} disabled={adding || added}>
          {added ? '✓ Agregada' : adding ? 'Agregando…' : '+ Agregar a Mi0'}
        </button>
      ) : (
        <button className="circle-button" aria-label={'Abrir ' + tool.title}>→</button>
      )}
    </article>
  )
}
