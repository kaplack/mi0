import { useEffect, useRef, useState } from 'react'
import { ProductActionIcon } from './ProductActionIcon'
import { ProductPhotos } from './ProductPhotos'
import { saveCatalogProduct, uploadCatalogImage, removeCatalogImage } from '../../services/qrCatalog'

export function ProductEditor({ product, workspaceId, data, state, onClose, onSaved }) {
  const initialOptions = Array.isArray(product?.priceOptions)
    ? product.priceOptions.map(opt => ({
        name: opt.name || '',
        price: Number.isFinite(opt.priceCents) ? (opt.priceCents / 100).toFixed(2) : ''
      }))
    : []

  const [form, setForm] = useState(() => ({
    name: product?.name || '',
    description: product?.description || '',
    price: product ? (product.priceCents / 100).toFixed(2) : '',
    priceOptions: initialOptions,
    categoryId: product?.categoryId || '',
    status: product?.status || 'AVAILABLE',
    position: product?.position ?? data.products.length
  }))
  const [hasOptions, setHasOptions] = useState(() => initialOptions.length > 0)
  const [photos, setPhotos] = useState([])
  const [removed, setRemoved] = useState([])
  const urls = useRef(new Set())
  const savedId = useRef(product?.id || null)
  const uploaded = useRef(new Set())
  const deleted = useRef(new Set())

  useEffect(() => {
    const current = urls.current
    return () => {
      for (const url of current) URL.revokeObjectURL(url)
    }
  }, [])

  const [localError, setLocalError] = useState('')
  const dialog = useRef(null)

  useEffect(() => {
    const d = dialog.current
    d.showModal()
    return () => d.close()
  }, [])

  const edit = (key, value) => setForm(current => ({ ...current, [key]: value }))

  async function save(e) {
    e.preventDefault()
    setLocalError('')

    let cleanOptions = []
    let priceCents = 0

    if (hasOptions) {
      if (!form.priceOptions.length) {
        setLocalError('Agrega al menos una opción de precio o vuelve a precio único.')
        return
      }
      for (const opt of form.priceOptions) {
        if (!opt.name.trim()) {
          setLocalError('Ingresa el nombre de cada opción de compra (ej. Conjunto, Solo Biker).')
          return
        }
        if (!/^\d+(\.\d{1,2})?$/.test(opt.price)) {
          setLocalError('Ingresa un precio numérico válido para cada opción.')
          return
        }
      }
      cleanOptions = form.priceOptions.map(opt => ({
        name: opt.name.trim(),
        priceCents: Math.round(Number(opt.price) * 100)
      }))
      priceCents = cleanOptions[0].priceCents
    } else {
      if (!/^\d+(\.\d{1,2})?$/.test(form.price)) {
        setLocalError('Ingresa un precio con hasta dos decimales.')
        return
      }
      priceCents = Math.round(Number(form.price) * 100)
    }

    const payload = {
      ...form,
      priceCents,
      priceOptions: cleanOptions,
      position: Number(form.position)
    }

    const result = await state.act(async () => {
      let res = await saveCatalogProduct(workspaceId, payload, savedId.current)
      if (!savedId.current) savedId.current = res.products.find(p => !data.products.some(old => old.id === p.id))?.id
      if (!savedId.current) throw new Error('No pudimos identificar el producto guardado. Recarga la lista.')
      try {
        for (const id of removed) {
          if (!deleted.current.has(id)) {
            res = await removeCatalogImage(workspaceId, id)
            deleted.current.add(id)
          }
        }
        for (const photo of photos) {
          if (!uploaded.current.has(photo.id)) {
            res = await uploadCatalogImage(workspaceId, photo.file, savedId.current)
            uploaded.current.add(photo.id)
          }
        }
      } catch (error) {
        throw new Error('Los datos se guardaron, pero hubo un problema con las fotos: ' + error.message)
      }
      return res
    }, 'Producto guardado.')

    if (result) {
      onSaved(result.products.find(p => p.id === savedId.current))
      onClose()
    }
  }

  const current = data.products.find(p => p.id === product?.id)

  function addPhotos(selected) {
    setLocalError('')
    const available = data.catalog.imageLimit - (current?.images || []).filter(i => !removed.includes(i.id)).length - photos.length
    if (selected.length > available) {
      setLocalError('Puedes agregar ' + available + ' foto(s) más.')
      return
    }
    if (selected.some(f => !['image/png', 'image/jpeg', 'image/webp'].includes(f.type) || !f.size || f.size > 5 * 1024 * 1024)) {
      setLocalError('Selecciona imágenes PNG, JPEG o WebP de hasta 5 MB cada una.')
      return
    }
    const next = selected.map(file => {
      const url = URL.createObjectURL(file)
      urls.current.add(url)
      return { id: crypto.randomUUID(), file, url }
    })
    setPhotos(curr => [...curr, ...next])
  }

  function removePhoto(id) {
    setPhotos(curr => curr.filter(photo => {
      if (photo.id !== id) return true
      URL.revokeObjectURL(photo.url)
      urls.current.delete(photo.url)
      return false
    }))
  }

  function close() {
    if (!state.busy) {
      if (savedId.current && !product) state.reload()
      onClose()
    }
  }

  return (
    <dialog className="cq-dialog cq" ref={dialog} aria-labelledby="cq-product-title" onCancel={e => { if (state.busy) e.preventDefault(); else close() }}>
      <header>
        <h2 id="cq-product-title">{product ? 'Editar producto' : 'Nuevo producto'}</h2>
        <button type="button" disabled={state.busy} aria-label="Cerrar producto" onClick={close}>×</button>
      </header>
      <form onSubmit={save}>
        <label>
          Nombre del producto
          <input autoFocus required maxLength="120" value={form.name} onChange={e => edit('name', e.target.value)} />
        </label>
        <label>
          Descripción
          <textarea rows="3" maxLength="1000" placeholder="Material, tallas, cuidados, detalles…" value={form.description} onChange={e => edit('description', e.target.value)} />
        </label>

        {!hasOptions ? (
          <div className="cq-fields">
            <label>
              Precio ({data.catalog.currency})
              <input inputMode="decimal" required value={form.price} onChange={e => edit('price', e.target.value)} placeholder="0.00" />
            </label>
            <label>
              Categoría
              <select aria-label="Categoría" value={form.categoryId} onChange={e => edit('categoryId', e.target.value)}>
                <option value="">Sin categoría</option>
                {data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label>
              Estado
              <select aria-label="Estado" value={form.status} onChange={e => edit('status', e.target.value)}>
                <option value="AVAILABLE">Disponible</option>
                <option value="SOLD_OUT">Agotado</option>
                <option value="HIDDEN">Oculto</option>
              </select>
            </label>
            <label>
              Orden
              <input type="number" min="0" max="100000" required value={form.position} onChange={e => edit('position', e.target.value)} />
            </label>
          </div>
        ) : (
          <div className="cq-options-builder">
            <div className="cq-options-builder-top">
              <div>
                <strong>Opciones de compra y precio</strong>
                <p>Configura precios separados para conjunto, prendas sueltas o tamaños.</p>
              </div>
              <button
                type="button"
                className="cq-btn-link-remove"
                onClick={() => {
                  setHasOptions(false)
                  edit('priceOptions', [])
                }}
              >
                Volver a precio único
              </button>
            </div>

            <div className="cq-options-list">
              {form.priceOptions.map((opt, i) => (
                <div key={i} className="cq-option-row">
                  <input
                    required
                    maxLength="60"
                    placeholder="Ej. Conjunto completo / Solo Biker"
                    value={opt.name}
                    onChange={e =>
                      edit(
                        'priceOptions',
                        form.priceOptions.map((o, idx) => (idx === i ? { ...o, name: e.target.value } : o))
                      )
                    }
                    className="cq-option-name-input"
                  />
                  <div className="cq-option-price-wrapper">
                    <span>{data.catalog.currency}</span>
                    <input
                      required
                      inputMode="decimal"
                      placeholder="0.00"
                      value={opt.price}
                      onChange={e =>
                        edit(
                          'priceOptions',
                          form.priceOptions.map((o, idx) => (idx === i ? { ...o, price: e.target.value } : o))
                        )
                      }
                      className="cq-option-price-input"
                    />
                  </div>
                  <button
                    type="button"
                    className="cq-option-del-btn"
                    title="Eliminar opción"
                    onClick={() => {
                      const next = form.priceOptions.filter((_, idx) => idx !== i)
                      if (!next.length) setHasOptions(false)
                      edit('priceOptions', next)
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {form.priceOptions.length < 10 && (
              <button
                type="button"
                className="cq-btn-add-more-option"
                onClick={() =>
                  edit('priceOptions', [...form.priceOptions, { name: '', price: '' }])
                }
              >
                + Agregar otra opción de compra
              </button>
            )}

            <div className="cq-fields" style={{ marginTop: 16 }}>
              <label>
                Categoría
                <select aria-label="Categoría" value={form.categoryId} onChange={e => edit('categoryId', e.target.value)}>
                  <option value="">Sin categoría</option>
                  {data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label>
                Estado
                <select aria-label="Estado" value={form.status} onChange={e => edit('status', e.target.value)}>
                  <option value="AVAILABLE">Disponible</option>
                  <option value="SOLD_OUT">Agotado</option>
                  <option value="HIDDEN">Oculto</option>
                </select>
              </label>
              <label>
                Orden
                <input type="number" min="0" max="100000" required value={form.position} onChange={e => edit('position', e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {!hasOptions && (
          <div style={{ marginTop: -4, marginBottom: 16 }}>
            <button
              type="button"
              className="cq-btn-toggle-options"
              onClick={() => {
                setHasOptions(true)
                edit('priceOptions', [
                  { name: 'Conjunto completo', price: form.price || '' },
                  { name: 'Solo prenda superior', price: '' },
                  { name: 'Solo prenda inferior', price: '' }
                ])
              }}
            >
              + ¿Vendes en conjunto o piezas separadas? Agregar opciones de precio
            </button>
          </div>
        )}

        <ProductPhotos
          images={current?.images || []}
          files={photos}
          removed={removed}
          limit={data.catalog.imageLimit}
          busy={state.busy}
          onAdd={addPhotos}
          onRemoveExisting={id => setRemoved(curr => [...curr, id])}
          onRemoveFile={removePhoto}
          onUndo={() => setRemoved([])}
        />
        {localError && <p role="alert" className="cq-error">{localError}</p>}
        <div className="cq-actions cq-product-actions">
          <button type="button" className="cq-product-action" aria-label="Cancelar" disabled={state.busy} onClick={close}>
            <ProductActionIcon kind="cancel" />
            <span>Cancelar</span>
          </button>
          <button className="primary-button cq-product-action" aria-label={state.busy ? 'Guardando producto' : 'Guardar producto'} disabled={state.busy}>
            <ProductActionIcon kind="save" />
            <span>{state.busy ? 'Guardando…' : 'Guardar producto'}</span>
          </button>
        </div>
      </form>
      {state.error && <p role="alert" className="cq-error">{state.error}</p>}
      {state.notice && <p role="status">{state.notice}</p>}
    </dialog>
  )
}
