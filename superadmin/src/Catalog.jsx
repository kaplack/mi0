import { useEffect, useState } from 'react'
import { IconSettings } from './IconSettings'
import { CategorySettings } from './CategorySettings'

export function Catalog({ api, moduleId }) {
  const [categories, setCategories] = useState([])
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const [selectedModule, setSelectedModule] = useState(moduleId || '')
  async function load() {
    const [c, m] = await Promise.all([api('/admin/categories'), api('/admin/modules')])
    setCategories(c.categories); setModules(m.modules)
  }
  useEffect(() => {
    let active = true
    Promise.all([api('/admin/categories'), api('/admin/modules')]).then(([c, m]) => { if (active) { setCategories(c.categories); setModules(m.modules) } }).catch(e => { if (active) setError(e.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [api])
  async function perform(action, success) {
    setBusy(true); setError(''); setMessage('')
    try { await action(); await load(); setMessage(success) } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  function saveCategory(event) {
    event.preventDefault()
    perform(async () => {
      await api('/admin/categories' + (editing ? '/' + editing : ''), { method: editing ? 'PUT' : 'POST', body: JSON.stringify({ name }) })
      setName(''); setEditing(null)
    }, 'Categoría guardada.')
  }
  return <section className="data-panel" aria-labelledby="catalog-heading">
    {moduleId && modules.find(module => module.id === moduleId) && <IconSettings api={api} module={modules.find(module => module.id === moduleId)} onChange={load} />}
    {!moduleId && <><h2 id="catalog-heading">Catálogo y categorías</h2><p>Una microapp puede aparecer en varias categorías. Gratis es un filtro independiente.</p></>}
    {error && <p className="error" role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    {loading ? <p>Cargando catálogo…</p> : <>
      {!moduleId && <>
      <form onSubmit={saveCategory} className="catalog-category-form">
        <label>Nombre de categoría<input required maxLength={80} value={name} onChange={e => setName(e.target.value)} disabled={busy} /></label>
        <button disabled={busy}>{editing ? 'Guardar categoría' : 'Crear categoría'}</button>
        {editing && <button type="button" className="secondary" disabled={busy} onClick={() => { setEditing(null); setName('') }}>Cancelar edición</button>}
      </form>
      {!categories.length && <p>No hay categorías. Crea la primera.</p>}
      {categories.map(c => <div className="list-row" key={c.id}>
        <div><strong>{c.name}</strong><small>{c._count.modules} microapps</small></div>
        <div className="catalog-actions"><button type="button" className="secondary" disabled={busy} onClick={() => { setEditing(c.id); setName(c.name) }}>Editar {c.name}</button>
        <button type="button" className="secondary" disabled={busy || c._count.modules > 0} title={c._count.modules ? 'Reasigna sus microapps antes de eliminar' : undefined} onClick={() => {
          if (window.confirm('¿Eliminar la categoría ' + c.name + '?')) perform(async () => { await api('/admin/categories/' + c.id, { method: 'DELETE' }); if (editing === c.id) { setEditing(null); setName('') } }, 'Categoría eliminada.')
        }}>Eliminar {c.name}</button></div>
      </div>)}
      </>}
      {!moduleId && <h3>Categorías de las microapps</h3>}
      {!modules.length && <p>No hay microapps registradas.</p>}
      {!moduleId && <label>Microapp<select aria-label="Microapp" value={selectedModule} disabled={busy} onChange={event => setSelectedModule(event.target.value)}><option value="">Selecciona una microapp</option>{modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>}
      {moduleId && modules.filter(module => module.id === moduleId).map(module => <CategorySettings key={module.id} api={api} module={module} categories={categories} onSaved={load} />)}
      {!moduleId && modules.filter(m => m.id === selectedModule).map(m => <form className="catalog-module" key={m.id + ':' + m.categories.map(c => c.id).sort().join(',') + ':' + m.free} onSubmit={event => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        perform(() => api('/admin/modules/' + m.id + '/catalog', { method: 'PATCH', body: JSON.stringify({ categoryIds: form.getAll('categoryIds'), free: form.has('free') }) }), 'Clasificación de ' + m.name + ' guardada.')
      }}>
        <fieldset disabled={busy}><legend>{m.name}</legend>
          <div className="catalog-options">{categories.map(c => <label className="catalog-check" key={c.id}><input type="checkbox" name="categoryIds" value={c.id} defaultChecked={m.categories.some(item => item.id === c.id)} />{c.name}</label>)}</div>
          <label className="catalog-check"><input type="checkbox" name="free" defaultChecked={m.free} />Totalmente gratis</label>
          <small>Marca esta opción solo si no incluye funciones de pago. Sin categorías aparecerá en Todas.</small>
          <button disabled={busy}>Guardar clasificación de {m.name}</button>
        </fieldset>
      </form>)}
    </>}
  </section>
}
