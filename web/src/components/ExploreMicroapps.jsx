import { useEffect, useRef, useState } from 'react'
import { tools } from '../data/catalog'
import { addMicroapp, listWorkspaces } from '../services/workspaces'
const features = {
  'mi-cita': ['Recibe solicitudes de citas desde tu QR.', 'Organiza profesionales, horarios y tu agenda.', 'Confirma o cancela solicitudes y comparte acceso con tu equipo.'],
  'mi-turno': ['Tus clientes toman un turno desde el QR.', 'Atiende desde varias ventanillas.', 'Comparte la pantalla pública y el acceso de tus operadores.'],
  sorteos: ['Pega tu lista de participantes.', 'Elige un ganador al azar.', 'Úsalo rápidamente, sin configurar un negocio.'],
  'sorteos-avanzado': ['Organiza sorteos con varios premios.', 'Guarda tus resultados en tu espacio.', 'Publica y comparte el resultado por S/4.90.'],
}
function Modal({ title, children, onClose, busy }) {
  const ref = useRef(null)
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close() }, [])
  return <dialog className="explore-dialog" ref={ref} aria-labelledby="explore-dialog-title" onCancel={event => { if (busy) event.preventDefault(); else onClose() }}>
    <div className="explore-dialog-heading"><h2 id="explore-dialog-title">{title}</h2><button type="button" disabled={busy} onClick={onClose} aria-label="Cerrar">×</button></div>{children}
  </dialog>
}
export function ExploreMicroapps({ workspaces, onWorkspacesChange, onOpen }) {
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const eligible = workspaces.filter(space => ['OWNER', 'ADMIN'].includes(space.role))
  const choices = modal?.kind === 'open' ? workspaces.filter(space => space.modules.some(module => module.code === modal.tool.code)) : eligible
  const installed = modal && workspaces.find(space => space.id === selected)?.modules.some(module => module.code === modal.tool.code)
  function show(tool, kind) {
    const options = kind === 'open' ? workspaces.filter(space => space.modules.some(module => module.code === tool.code)) : eligible
    setSelected((options.find(space => space.type === 'PERSONAL' && space.role === 'OWNER') || options[0])?.id || '')
    setError(''); setNotice(''); setModal({ tool, kind })
  }
  function open(tool) {
    if (tool.code === 'sorteos') { onOpen(tool.code); return }
    const installedSpaces = workspaces.filter(space => space.modules.some(module => module.code === tool.code))
    if (installedSpaces.length === 1) onOpen(tool.code, installedSpaces[0])
    else show(tool, installedSpaces.length ? 'open' : 'add')
  }
  async function submit(event) {
    event.preventDefault()
    if (modal.kind === 'open') { onOpen(modal.tool.code, choices.find(space => space.id === selected)); return }
    setBusy(true); setError('')
    try {
      await addMicroapp(selected, modal.tool.code)
      const data = await listWorkspaces()
      onWorkspacesChange(data.workspaces || [])
      setNotice(modal.tool.title + ' agregada a ' + choices.find(space => space.id === selected).name + '.')
      setModal(null)
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  return <>
    <label className="explore-search">Buscar microapps<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nombre o categoría" /></label>
    {notice && <p role="status">{notice}</p>}
    <div className="explore-grid">{tools.filter(tool => (tool.title + ' ' + tool.category).toLocaleLowerCase().includes(query.toLocaleLowerCase().trim())).map(tool => <article className="tool-card explore-card" key={tool.code} aria-label={tool.title}>
      <div className={'tool-icon ' + tool.tone} aria-hidden="true">{tool.icon}</div><span className={'tag ' + tool.tone}>{tool.category}</span><h2>{tool.title}</h2><p>{tool.description}</p>
      <div className="explore-actions"><button className="primary-button" onClick={() => open(tool)}>Abrir</button><button onClick={() => show(tool, 'info')}>Más información</button><button onClick={() => show(tool, 'add')}>Agregar a mi espacio</button></div>
    </article>)}</div>
    {!tools.some(tool => (tool.title + ' ' + tool.category).toLocaleLowerCase().includes(query.toLocaleLowerCase().trim())) && <p>No encontramos microapps con ese nombre.</p>}
    {modal && <Modal title={modal.kind === 'info' ? modal.tool.title : (modal.kind === 'open' ? 'Abrir ' : 'Agregar ') + modal.tool.title} onClose={() => setModal(null)} busy={busy}>
      {modal.kind === 'info' ? <><p>{modal.tool.description}</p><ul>{features[modal.tool.code].map(feature => <li key={feature}>{feature}</li>)}</ul>{<figure><img className="explore-preview" src={'/microapps/' + modal.tool.code + '.png'} alt={'Vista de ' + modal.tool.title + ' con datos de ejemplo'} /><figcaption>Vista de ejemplo de {modal.tool.title}.</figcaption></figure>}<button className="primary-button" onClick={() => open(modal.tool)}>Abrir</button></> : <form onSubmit={submit}>
        <p>{modal.kind === 'open' ? 'Elige el espacio que quieres abrir.' : 'La herramienta aparecerá junto a las demás microapps de ese espacio.'}</p>
        {choices.length ? <><label className="explore-search">Espacio<select aria-label="Espacio" value={selected} disabled={busy} onChange={event => { setSelected(event.target.value); setError('') }}>{choices.map(space => <option key={space.id} value={space.id}>{space.name}</option>)}</select></label>{modal.kind === 'add' && installed && <p>Esta microapp ya está en este espacio. Puedes seleccionar otro.</p>}</> : <p>No tienes espacios donde puedas agregar microapps. Solo el propietario o administrador puede hacerlo.</p>}
        {error && <p role="alert">{error}</p>}<div className="explore-actions"><button type="button" disabled={busy} onClick={() => setModal(null)}>Cancelar</button><button className="primary-button" disabled={busy || !selected || (modal.kind === 'add' && installed)}>{busy ? 'Agregando…' : modal.kind === 'open' ? 'Abrir' : 'Agregar'}</button></div>
      </form>}
    </Modal>}
  </>
}
