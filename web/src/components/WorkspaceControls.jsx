import { useEffect, useRef, useState } from 'react'
function IconButton({label,kind,onClick,disabled}) {
 return <button type="button" className="workspace-icon-button" aria-label={label} data-tooltip={label} disabled={disabled} onClick={onClick}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind==='edit'?<><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z"/></>:<><path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/></>}</svg></button>
}
export function WorkspaceHeading({space,busy,onRename,onDelete}) {
 const [editing,setEditing]=useState(false)
 const [name,setName]=useState(space.name)
 return <div className="console-space-heading"><div className="workspace-heading-row">{editing ? <form className="workspace-rename" onSubmit={async e=>{e.preventDefault();if(await onRename(space.id,name))setEditing(false)}}>
 <input autoFocus aria-label="Nombre del espacio" maxLength="120" required disabled={busy} value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Escape'&&!busy){e.preventDefault();setEditing(false)}}}/><button disabled={busy} aria-label="Guardar nombre" className="workspace-icon-button" data-tooltip="Guardar nombre">✓</button><button type="button" disabled={busy} aria-label="Cancelar edición" className="workspace-icon-button" data-tooltip="Cancelar edición" onClick={()=>setEditing(false)}>×</button></form> : <><h3>{space.name}</h3>{space.role==='OWNER'&&<div className="workspace-card-actions"><IconButton label={'Renombrar '+space.name} kind="edit" disabled={busy} onClick={()=>{setName(space.name);setEditing(true)}}/><IconButton label={'Eliminar '+space.name} kind="delete" disabled={busy} onClick={()=>{if(window.confirm('¿Eliminar el espacio “'+space.name+'”? Solo se puede eliminar si está vacío.'))onDelete(space.id)}}/></div>}</>}</div><span>{space.accessLabel || (space.role==='OWNER'?'Propietario':'Acceso invitado')}</span></div>
}
export function CreateWorkspace({busy,error,onCreate}) {
 const [open,setOpen]=useState(false)
 return <><button className="workspace-create" aria-label="Crear espacio" onClick={()=>setOpen(true)} disabled={busy}><span aria-hidden="true">＋</span><span className="workspace-create-text">Crear espacio</span></button>{open&&<CreateDialog busy={busy} error={error} onClose={()=>setOpen(false)} onCreate={onCreate}/>}</>
}
function CreateDialog({busy,error,onClose,onCreate}) {
 const ref=useRef(null)
 const [name,setName]=useState('')
 useEffect(()=>{const d=ref.current;d.showModal();return()=>d.close()},[])
 return <dialog ref={ref} className="workspace-dialog" aria-labelledby="workspace-create-title" onCancel={e=>{if(busy)e.preventDefault();else onClose()}}><h2 id="workspace-create-title">Crear espacio</h2><p>Organiza tus microapps. Puedes llamarlo «Mi espacio», «Alan» o como prefieras.</p><form onSubmit={async e=>{e.preventDefault();if(await onCreate(name))onClose()}}><label>Nombre del espacio<input autoFocus required maxLength="120" disabled={busy} value={name} onChange={e=>setName(e.target.value)} placeholder="Mi espacio personal"/></label>{error&&<p role="alert">{error}</p>}<div><button type="button" disabled={busy} onClick={onClose}>Cancelar</button><button className="primary-button" disabled={busy}>{busy?'Creando…':'Crear espacio'}</button></div></form></dialog>
}
