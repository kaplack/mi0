import { useRef, useState } from 'react'
import { CatalogImage } from './CatalogUi'
function ImageIcon({kind}) {
 return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind==='remove'?<><path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/></>:kind==='undo'?<><path d="m8 4-5 5 5 5M3 9h11a6 6 0 0 1 0 12"/></>:<><path d="M8 6l2-3h4l2 3h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="4"/></>}</svg>
}
function ImageButton({label,kind,onClick,disabled}) {
 return <button type="button" className={'cq-image-action '+(kind==='remove'?'cq-image-action-danger':kind==='undo'?'cq-image-action-undo':'')} aria-label={label} data-tooltip={label} disabled={disabled} onClick={onClick}><ImageIcon kind={kind}/></button>
}
export function LogoPicker({currentUrl,previewUrl,pending,removed,busy,error,onSelect,onRemove,onUndo}) {
 const input=useRef(null)
 const [dragging,setDragging]=useState(false)
 const hasImage=Boolean((currentUrl&&!removed)||pending)
 const action=hasImage?'Cambiar logo':'Cargar logo'
 function pick(files){setDragging(false);if(!busy&&files?.[0])onSelect(files[0])}
 return <div className="cq-logo-field"><span id="cq-logo-title" className="cq-logo-title">Logo del negocio</span><section aria-labelledby="cq-logo-title" className={'cq-logo-picker'+(dragging?' is-dragging':'')} aria-label="Logo del negocio" onDragOver={e=>{e.preventDefault();if(!busy)setDragging(true)}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragging(false)}} onDrop={e=>{e.preventDefault();pick(e.dataTransfer.files)}}>
   <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden disabled={busy} aria-label="Archivo del logo" onChange={e=>{pick(e.target.files);e.target.value=''}}/>
   <div className="cq-logo-picker-main"><div className="cq-logo-frame"><div className="cq-logo-thumbnail">{pending&&previewUrl?<img src={previewUrl} alt="Vista previa del logo seleccionado" width="112" height="112"/>:currentUrl&&!removed?<CatalogImage preview url={currentUrl} alt="Logo actual del negocio" width="112" height="112"/>:<span className="cq-logo-empty">Sin logo</span>}</div><ImageButton label={action} kind="camera" disabled={busy} onClick={()=>input.current?.click()}/>{hasImage&&<ImageButton label="Retirar logo" kind="remove" disabled={busy} onClick={onRemove}/>}{removed&&<ImageButton label="Deshacer cambio de logo" kind="undo" disabled={busy} onClick={onUndo}/>}</div>
   <div className="cq-logo-picker-copy"><p id="cq-logo-help" className="cq-logo-formats">PNG, JPEG o WebP<br/>Hasta 5 MB</p></div></div>
   {(dragging||pending||removed)&&<p className="cq-logo-status" role="status">{dragging?'Suelta la imagen aquí.':removed?'El logo se retirará al guardar.':'Nuevo logo seleccionado. Guarda el formulario para aplicarlo.'}</p>}{error&&<p role="alert" className="cq-error">{error}</p>}
 </section></div>
}
