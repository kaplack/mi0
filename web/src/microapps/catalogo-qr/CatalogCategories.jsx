import { useState } from 'react'
import { saveCatalogCategory, deleteCatalogCategory } from '../../services/qrCatalog'
function CategoryForm({ category, workspaceId, state, position, onDone }) {
  const [name, setName] = useState(category?.name || '')
  const [order, setOrder] = useState(category?.position ?? position)
  return <form className="cq-category-form" onSubmit={async e => { e.preventDefault(); const result = await state.act(() => saveCatalogCategory(workspaceId, { name, position: Number(order) }, category?.id), 'Categoría guardada.'); if (result) { setName(''); onDone?.() } }}>
    <label>{category ? 'Editar categoría' : 'Nueva categoría'}<input required maxLength="80" value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Postres" /></label>
    <label>Orden<input type="number" min="0" max="100000" required value={order} onChange={e => setOrder(e.target.value)} /></label>
    <button disabled={state.busy}>{category ? 'Guardar categoría' : 'Crear categoría'}</button>{category && <button type="button" onClick={onDone}>Cancelar</button>}
  </form>
}

export function CatalogCategories({workspaceId,data,state}) {
 const [editing,setEditing]=useState(null)
 return <section className="cq-category-manager"><h2>Categorías</h2><p>Organiza cómo se presentan tus productos. El orden menor aparece primero.</p><CategoryForm workspaceId={workspaceId} state={state} position={data.categories.length}/>
 {!data.categories.length?<div className="cq-empty"><h3>Empieza por tu primera categoría</h3><p>Por ejemplo: Pizzas, Bebidas o Postres.</p></div>:<ul className="cq-category-list">{data.categories.map(c=><li key={c.id}>{editing===c.id?<CategoryForm category={c} workspaceId={workspaceId} state={state} onDone={()=>setEditing(null)}/>:<><div><strong>{c.name}</strong><small>Orden {c.position} · {data.products.filter(p=>p.categoryId===c.id).length} productos</small></div><div className="cq-actions"><button disabled={state.busy} aria-label={'Editar categoría '+c.name} onClick={()=>setEditing(c.id)}>Editar</button><button disabled={state.busy} className="cq-danger" aria-label={'Eliminar categoría '+c.name} onClick={()=>{if(window.confirm('¿Eliminar esta categoría? Sus productos se conservarán sin categoría.'))state.act(()=>deleteCatalogCategory(workspaceId,c.id),'Categoría eliminada. Sus productos se conservaron.')}}>Eliminar</button></div></>}</li>)}</ul>}
 </section>
}
