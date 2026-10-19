import { CatalogImage } from './CatalogUi'
import { CatalogNavIcon } from './CatalogNavIcon'
const entries=[['products','productos','Productos'],['categories','categorias','Categorías'],['settings','negocio','Mi negocio'],['share','qr','QR y enlace']]
export function CatalogNavigation({workspaceId,active,disabled,busy,onNavigate,mobile=false,collapsed=false}) {
 return <nav className={mobile?'cq-bottom-nav':'cq-side-nav'} aria-label={mobile?'Navegación de la carta o catálogo':'Secciones de la carta o catálogo'}>{entries.map(([key,path,label])=><a key={key} href={'/catalogo-qr/'+workspaceId+'/'+path} aria-current={active===key?'page':undefined} aria-label={mobile&&key==='share'?'QR y enlace':label} aria-disabled={busy||(disabled&&key!=='settings')||undefined} data-tooltip={label} onClick={e=>{if(busy||(disabled&&key!=='settings')){e.preventDefault();return}if(e.button===0&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey){e.preventDefault();onNavigate(key,path)}}}><CatalogNavIcon name={key}/><span className={collapsed&&!mobile?'cq-nav-label is-hidden':'cq-nav-label'}>{mobile&&key==='share'?'QR':label}</span></a>)}</nav>
}
export function CatalogBrand({name,logo,tool,compact=false}) {
 return <div className={'cq-brand'+(compact?' compact':'')}><div className="cq-brand-mark">{logo?<CatalogImage preview url={logo} alt={'Logo de '+name} width="56" height="56"/>:<span aria-hidden="true">{name.slice(0,1).toUpperCase()}</span>}</div><div className="cq-brand-copy"><strong>{name}</strong><small>{tool}</small></div></div>
}
export function CatalogSidebar({workspace,data,active,busy,onNavigate,collapsed,onCollapse}) {
 const catalog=data?.catalog
 const name=catalog?.name || 'Tu negocio'
 return <aside className={'cq-app-sidebar'+(collapsed?' is-collapsed':'')} aria-label="Administración del negocio"><div className="cq-sidebar-top"><CatalogBrand name={name} logo={catalog?.logoUrl} tool={catalog?.presentation==='MENU'?'Carta QR':'Catálogo QR'} compact={collapsed}/><button className="cq-collapse" type="button" aria-label={collapsed?'Expandir menú':'Contraer menú'} title={collapsed?'Expandir menú':'Contraer menú'} onClick={onCollapse}><CatalogNavIcon name="collapse"/></button></div><CatalogNavigation workspaceId={workspace.id} active={active} disabled={!catalog} busy={busy} onNavigate={onNavigate} collapsed={collapsed}/><div className="cq-sidebar-footer">{!collapsed&&<div className="cq-workspace-context"><small>ESPACIO</small><span>{data?.workspace.name || workspace.name}</span><small>{workspace.role==='OWNER'?'Propietario':'Administrador'}</small></div>}<a href="/" className="cq-return" aria-label="Volver a mi0" title="Volver a mi0"><CatalogNavIcon name="back"/>{!collapsed&&<span>Volver a <strong>mi0</strong></span>}</a></div></aside>
}
