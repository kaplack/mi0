import { useCallback, useEffect, useState } from 'react'
export function CatalogLinkRequests({ api }) {
 const [items,setItems]=useState(null)
 const [error,setError]=useState('')
 const [busy,setBusy]=useState(false)
 const [notice,setNotice]=useState('')
 const load=useCallback(()=>api('/admin/catalog-link-requests').then(d=>setItems(d.requests)).catch(e=>setError(e.message)),[api])
 useEffect(()=>{load()},[load])
 async function review(item,status){
  if(!window.confirm(status==='APPROVED'?'¿Aprobar el cambio a /'+item.requestedSlug+'? Los enlaces anteriores seguirán funcionando.':'¿Rechazar esta solicitud?'))return
  setBusy(true);setError('');setNotice('')
  try{await api('/admin/catalog-link-requests/'+item.id,{method:'PATCH',body:JSON.stringify({status})});await load();setNotice(status==='APPROVED'?'Cambio aprobado.':'Solicitud rechazada.')}catch(e){setError(e.message)}finally{setBusy(false)}
 }
 return <section className="data-panel"><div className="panel-heading"><h2>Cambios de enlace de negocios</h2><button disabled={busy} onClick={load}>Actualizar</button></div><p>Revisa los cambios solicitados después de publicar. Los enlaces anteriores se conservan para proteger los QR compartidos.</p>{error&&<p className="error" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}{!items?<p role="status">Cargando solicitudes…</p>:!items.length?<p>No hay solicitudes pendientes.</p>:<div className="item-list">{items.map(item=><article className="list-row" key={item.id}><div><strong>{item.workspace.qrCatalog?.name || item.workspace.name}</strong><small>Espacio: {item.workspace.name}</small><p>/{item.workspace.publicSlug} → <strong>/{item.requestedSlug}</strong></p><p>{item.reason}</p></div><div><button disabled={busy} onClick={()=>review(item,'APPROVED')}>Aprobar</button><button disabled={busy} onClick={()=>review(item,'REJECTED')}>Rechazar</button></div></article>)}</div>}</section>
}
