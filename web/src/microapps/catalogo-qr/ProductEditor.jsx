import { useEffect, useRef, useState } from 'react'
import { ProductActionIcon } from './ProductActionIcon'
import { ProductPhotos } from './ProductPhotos'
import { saveCatalogProduct, uploadCatalogImage, removeCatalogImage } from '../../services/qrCatalog'
export function ProductEditor({ product, workspaceId, data, state, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({ name: product?.name || '', description: product?.description || '', price: product ? (product.priceCents / 100).toFixed(2) : '', categoryId: product?.categoryId || '', status: product?.status || 'AVAILABLE', position: product?.position ?? data.products.length }))
  const [photos,setPhotos]=useState([])
  const [removed,setRemoved]=useState([])
  const urls=useRef(new Set())
  const savedId=useRef(product?.id || null)
  const uploaded=useRef(new Set())
  const deleted=useRef(new Set())
  useEffect(()=>{const current=urls.current;return()=>{for(const url of current)URL.revokeObjectURL(url)}},[])
  const [localError, setLocalError] = useState('')
  const dialog = useRef(null)
  useEffect(() => { const d = dialog.current; d.showModal(); return () => d.close() }, [])
  const edit = (key, value) => setForm(current => ({ ...current, [key]: value }))
  async function save(e) {
    e.preventDefault(); setLocalError('')
    if (!/^\d+(\.\d{1,2})?$/.test(form.price)) { setLocalError('Ingresa un precio con hasta dos decimales.'); return }
    const result = await state.act(async()=>{
      let result=await saveCatalogProduct(workspaceId,{...form,priceCents:Math.round(Number(form.price)*100),position:Number(form.position)},savedId.current)
      if(!savedId.current)savedId.current=result.products.find(p=>!data.products.some(old=>old.id===p.id))?.id
      if(!savedId.current)throw new Error('No pudimos identificar el producto guardado. Recarga la lista antes de continuar.')
      try {
        for(const id of removed)if(!deleted.current.has(id)){result=await removeCatalogImage(workspaceId,id);deleted.current.add(id)}
        for(const photo of photos)if(!uploaded.current.has(photo.id)){result=await uploadCatalogImage(workspaceId,photo.file,savedId.current);uploaded.current.add(photo.id)}
      }catch(error){throw new Error('Los datos del producto se guardaron, pero no se completaron las fotos. '+error.message+' Puedes volver a guardar para reintentar.')}
      return result
    },'Producto y fotos guardados.')
    if(result){onSaved(result.products.find(p=>p.id===savedId.current));onClose()}

  }
  const current = data.products.find(p => p.id === product?.id)
  function addPhotos(selected){
    setLocalError('')
    const available=data.catalog.imageLimit-(current?.images||[]).filter(i=>!removed.includes(i.id)).length-photos.length
    if(selected.length>available){setLocalError('Puedes agregar '+available+' foto(s) más.');return}
    if(selected.some(f=>!['image/png','image/jpeg','image/webp'].includes(f.type)||!f.size||f.size>5*1024*1024)){setLocalError('Selecciona imágenes PNG, JPEG o WebP de hasta 5 MB cada una.');return}
    const next=selected.map(file=>{const url=URL.createObjectURL(file);urls.current.add(url);return {id:crypto.randomUUID(),file,url}})
    setPhotos(current=>[...current,...next])
  }
  function removePhoto(id){setPhotos(current=>current.filter(photo=>{if(photo.id!==id)return true;URL.revokeObjectURL(photo.url);urls.current.delete(photo.url);return false}))}
  function close(){if(!state.busy){if(savedId.current&&!product)state.reload();onClose()}}

  return <dialog className="cq-dialog cq" ref={dialog} aria-labelledby="cq-product-title" onCancel={e => { if (state.busy) e.preventDefault(); else close() }}>
    <header><h2 id="cq-product-title">{product ? 'Editar producto' : 'Nuevo producto'}</h2><button type="button" disabled={state.busy} aria-label="Cerrar producto" onClick={close}>×</button></header>
    <form onSubmit={save}><label>Nombre del producto<input autoFocus required maxLength="120" value={form.name} onChange={e => edit('name', e.target.value)} /></label>
      <label>Descripción<textarea rows="3" maxLength="1000" value={form.description} onChange={e => edit('description', e.target.value)} /></label>
      <div className="cq-fields"><label>Precio ({data.catalog.currency})<input inputMode="decimal" required value={form.price} onChange={e => edit('price', e.target.value)} placeholder="0.00" /></label>
      <label>Categoría<select aria-label="Categoría" value={form.categoryId} onChange={e => edit('categoryId', e.target.value)}><option value="">Sin categoría</option>{data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>Estado<select aria-label="Estado" value={form.status} onChange={e => edit('status', e.target.value)}><option value="AVAILABLE">Disponible</option><option value="SOLD_OUT">Agotado</option><option value="HIDDEN">Oculto</option></select></label>
      <label>Orden<input type="number" min="0" max="100000" required value={form.position} onChange={e => edit('position', e.target.value)} /></label></div>
      <ProductPhotos images={current?.images || []} files={photos} removed={removed} limit={data.catalog.imageLimit} busy={state.busy} onAdd={addPhotos} onRemoveExisting={id=>setRemoved(current=>[...current,id])} onRemoveFile={removePhoto} onUndo={()=>setRemoved([])}/>
      {localError && <p role="alert" className="cq-error">{localError}</p>}
      <div className="cq-actions cq-product-actions"><button type="button" className="cq-product-action" aria-label="Cancelar" data-tooltip="Cancelar" disabled={state.busy} onClick={close}><ProductActionIcon kind="cancel"/><span>Cancelar</span></button><button className="primary-button cq-product-action" aria-label={state.busy?'Guardando producto':'Guardar producto'} data-tooltip="Guardar producto" disabled={state.busy}><ProductActionIcon kind="save"/><span>{state.busy?'Guardando…':'Guardar producto'}</span></button>{state.busy&&<small role="status">Guardando…</small>}</div>
    </form>
    {state.error && <p role="alert" className="cq-error">{state.error}</p>}{state.notice && <p role="status">{state.notice}</p>}
  </dialog>
}
