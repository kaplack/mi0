import { useState } from 'react'
import { CatalogImage } from './CatalogUi'
import { money, statusLabel } from './catalogUtils'
import { ProductEditor } from './ProductEditor'
import { deleteCatalogProduct } from '../../services/qrCatalog'
export function CatalogProducts({ workspaceId, data, state }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [editor, setEditor] = useState(null)
  const filtered = data.products.filter(p => p.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()) && (!category || p.categoryId === category))
  return <>
    <div className="cq-section-heading"><div><h2>Productos</h2><p>{data.products.length} de {data.catalog.productLimit} productos · {data.catalog.plan === 'FREE' ? 'Plan gratis' : 'Plan Pro'}</p></div><button className="primary-button" disabled={state.busy || data.products.length >= data.catalog.productLimit} onClick={() => setEditor({})}>+ Nuevo producto</button></div>
    <div className="cq-toolbar"><label>Buscar producto<input type="search" placeholder="Nombre del producto" value={query} onChange={e => setQuery(e.target.value)} /></label><label>Filtrar por categoría<select value={category} onChange={e => setCategory(e.target.value)}><option value="">Todas las categorías</option>{data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div>
    {!filtered.length ? <div className="cq-empty"><h3>{data.products.length ? 'No hay coincidencias' : 'Tu catálogo empieza con un producto'}</h3><p>{data.products.length ? 'Prueba otra búsqueda o categoría.' : 'Agrega una foto, un precio y una descripción para que tus clientes lo conozcan.'}</p></div> : <table className="cq-product-table"><thead><tr><th>Producto</th><th>Precio</th><th>Estado</th><th>Orden</th><th>Acciones</th></tr></thead><tbody>{filtered.map(product => <tr key={product.id}><td><div className="cq-product-name"><CatalogImage preview url={product.images[0]?.url} alt={product.name} width="60" height="60" /><div><strong>{product.name}</strong><small>{data.categories.find(c => c.id === product.categoryId)?.name || 'Sin categoría'}</small></div></div></td><td data-label="Precio">{money(product.priceCents, data.catalog.currency)}</td><td data-label="Estado"><span className={'cq-badge ' + product.status.toLowerCase()}>{statusLabel[product.status]}</span></td><td data-label="Orden">{product.position}</td><td><div className="cq-actions"><button disabled={state.busy} aria-label={'Editar ' + product.name} onClick={() => setEditor(product)}>Editar</button><button disabled={state.busy} className="cq-danger" aria-label={'Eliminar ' + product.name} onClick={() => { if (window.confirm('¿Eliminar “' + product.name + '” y sus fotos?')) state.act(() => deleteCatalogProduct(workspaceId, product.id), 'Producto eliminado.') }}>Eliminar</button></div></td></tr>)}</tbody></table>}
    {editor && <ProductEditor key={editor.id || 'new'} product={editor.id ? editor : null} workspaceId={workspaceId} data={data} state={state} onClose={() => setEditor(null)} onSaved={setEditor} />}
  </>
}
