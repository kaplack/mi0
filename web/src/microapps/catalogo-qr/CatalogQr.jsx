import { useEffect, useRef, useState } from 'react'
import { listWorkspaces } from '../../services/workspaces'
import { useQrCatalog } from './useQrCatalog'
import { CatalogSettings } from './CatalogSettings'
import { CatalogProducts } from './CatalogProducts'
import { CatalogCategories } from './CatalogCategories'
import { CatalogSidebar, CatalogNavigation, CatalogBrand } from './CatalogSidebar'
import { CatalogNavIcon } from './CatalogNavIcon'
import { CatalogShare } from './CatalogShare'
import './CatalogQr.css'
export function CatalogQr({ workspaceId, onLogin, page, onNavigate }) {
  const [spaces, setSpaces] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { let alive = true; listWorkspaces().then(result => { if (alive) setSpaces(result.workspaces.filter(w => ['OWNER', 'ADMIN'].includes(w.role))) }).catch(e => { if (alive) setError(e.message) }); return () => { alive = false } }, [])
  if (error) return <main className="cq cq-shell"><a href="/">← Inicio de mi0</a><h1>Catálogo QR</h1><p role="alert">{error}</p><button className="primary-button" onClick={onLogin}>Iniciar sesión</button></main>
  if (!spaces) return <main className="cq cq-shell"><p role="status">Cargando espacios…</p></main>
  const workspace = spaces.find(w => w.id === workspaceId)
  if (workspaceId && !workspace) return <main className="cq cq-shell"><a href="/">← Inicio de mi0</a><p role="alert">No tienes permisos para gestionar este espacio.</p></main>
  if (!workspace) return <main className="cq cq-shell"><a href="/">← Inicio de mi0</a><span className="cq-eyebrow">CATÁLOGO QR</span><h1>Elige el espacio de tu catálogo</h1><p>Un catálogo por espacio, con tus productos y datos del negocio.</p><div className="cq-space-grid">{spaces.map(w => <a className="cq-panel" key={w.id} href={'/catalogo-qr/' + w.id}><h2>{w.name}</h2><span>Configurar catálogo →</span></a>)}</div>{!spaces.length && <p>No tienes espacios con permisos de administración.</p>}</main>
  return <CatalogManager key={workspace.id} workspace={workspace} page={page} onNavigate={onNavigate} />
}
const pageKeys={productos:'products',categorias:'categories',negocio:'settings',qr:'share'}
function CatalogManager({ workspace, page, onNavigate }) {
  const state=useQrCatalog(workspace.id)
  const {data}=state
  const [collapsed,setCollapsed]=useState(()=>localStorage.getItem('mi0_catalog_sidebar')==='collapsed')
  const [keyboardOpen,setKeyboardOpen]=useState(false)
  const heading=useRef(null)
  useEffect(()=>{
    const viewport=window.visualViewport
    if(!viewport)return
    const update=()=>setKeyboardOpen(window.innerHeight-viewport.height>150)
    viewport.addEventListener('resize',update)
    return()=>viewport.removeEventListener('resize',update)
  },[])
  const active=data&&!data.catalog?'settings':pageKeys[page]||'products'
  const catalog=data?.catalog
  const business=catalog?.name||'Tu negocio'
  const tool=catalog?.presentation==='MENU'?'Carta QR':'Catálogo QR'
  function navigate(key,path){
    if(state.busy || (!data?.catalog && key!=='settings'))return
    const url='/catalogo-qr/'+workspace.id+'/'+path
    if(onNavigate){onNavigate(url);window.scrollTo({top:0,behavior:'instant'});requestAnimationFrame(()=>{const title=heading.current?.querySelector('section:not([hidden]) h2');if(title){title.tabIndex=-1;title.focus({preventScroll:true})}})}
    else location.href=url
  }
  function collapse(){setCollapsed(value=>{localStorage.setItem('mi0_catalog_sidebar',value?'expanded':'collapsed');return !value})}
  return <main className={'cq cq-app-shell'+(collapsed?' cq-app-collapsed':'')+(keyboardOpen?' cq-keyboard-open':'')}>
    <CatalogSidebar workspace={workspace} data={data} active={active} busy={state.busy} onNavigate={navigate} collapsed={collapsed} onCollapse={collapse}/>
    <div ref={heading} className="cq-app-main"><header className="cq-app-mobile-header"><CatalogBrand name={business} logo={catalog?.logoUrl} tool={tool}/><a href="/" className="cq-mobile-return" aria-label="Volver a mi0"><CatalogNavIcon name="back"/><span>mi0</span></a></header>

      {state.error&&<p className="cq-error" role="alert">{state.error} <button onClick={state.reload} disabled={state.busy}>Actualizar</button></p>}{state.notice&&<p className="cq-notice" role="status">{state.notice}</p>}
      {!data?!state.error&&<p role="status">Cargando tu negocio…</p>:<>
      <section className="cq-app-section cq-panel" aria-label="Productos" hidden={active!=='products'}>{catalog&&<CatalogProducts workspaceId={workspace.id} data={data} state={state}/>}</section>
      <section className="cq-app-section cq-panel" aria-label="Categorías" hidden={active!=='categories'}>{catalog&&<CatalogCategories workspaceId={workspace.id} data={data} state={state}/>}</section>
      <section className="cq-app-section cq-panel cq-settings-panel" aria-label="Mi negocio" hidden={active!=='settings'}><CatalogSettings key={catalog?.code||'new'} workspaceId={workspace.id} data={data} state={state}/></section>
      <section className="cq-app-section cq-panel" aria-label="QR y enlace" hidden={active!=='share'}>{catalog&&<CatalogShare catalog={catalog}/>}</section>
      </>}
    </div><CatalogNavigation workspaceId={workspace.id} active={active} disabled={!catalog} busy={state.busy} onNavigate={navigate} mobile/>
  </main>
}
