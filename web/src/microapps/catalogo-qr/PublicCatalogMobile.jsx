import { useEffect, useRef, useState } from 'react'
import { CatalogNavIcon } from './CatalogNavIcon'
import { WhatsAppIcon } from './WhatsAppIcon'
function SearchIcon(){return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>}
export function PublicCatalogMobile({query,onQuery,categories,category,onCategory,whatsapp,resultsRef}){
 const [searchOpen,setSearchOpen]=useState(false)
 const [keyboard,setKeyboard]=useState(false)
 const [keyboardOffset,setKeyboardOffset]=useState(0)
 const [categoriesOpen,setCategoriesOpen]=useState(false)
 const searchPanel=useRef(null),input=useRef(null),sheet=useRef(null)
 useEffect(()=>{const viewport=window.visualViewport;if(!viewport)return;const update=()=>{const offset=Math.max(0,window.innerHeight-viewport.height-viewport.offsetTop);const open=offset>130;setKeyboard(open);setKeyboardOffset(open?offset:0)};update();viewport.addEventListener('resize',update);viewport.addEventListener('scroll',update);return()=>{viewport.removeEventListener('resize',update);viewport.removeEventListener('scroll',update)}},[])
 function closeCategories(){sheet.current.close();setCategoriesOpen(false)}
 function toggleCategories(){if(categoriesOpen){closeCategories();return}closeSearch();sheet.current.show();setCategoriesOpen(true)}
 useEffect(()=>{if(!categoriesOpen)return;const close=e=>{if(e.key==='Escape'){sheet.current.close();setCategoriesOpen(false)}};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[categoriesOpen])
 function search(){closeCategories();setSearchOpen(true);searchPanel.current.hidden=false;resultsRef.current?.scrollIntoView({block:'start'});input.current.focus()}
 function closeSearch(){input.current.blur();setSearchOpen(false)}
 function choose(id){onCategory(id);closeCategories();resultsRef.current?.scrollIntoView({block:'start',behavior:'smooth'})}
 return <div className="cq-public-mobile-tools"><div ref={searchPanel} className="cq-mobile-search" style={keyboard?{bottom:keyboardOffset}:undefined} hidden={!searchOpen}><label><span className="cq-sr-only">Buscar productos</span><SearchIcon/><input ref={input} type="search" inputMode="search" autoComplete="off" placeholder="Buscar productos…" value={query} onChange={e=>onQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();input.current.blur()}if(e.key==='Escape')closeSearch()}}/></label><button type="button" aria-label="Cerrar buscador" onClick={closeSearch}>×</button></div>
 <nav className={'cq-public-bottom-nav'+(keyboard?' keyboard-open':'')} aria-label="Acciones del catálogo"><button type="button" onClick={search} aria-pressed={searchOpen}><SearchIcon/><span>Buscar</span></button><button type="button" onClick={toggleCategories} aria-label="Elegir categoría" aria-haspopup="dialog" aria-expanded={categoriesOpen} aria-controls="cq-public-categories"><CatalogNavIcon name="categories"/><span>Categorías{category?' ·':''}</span></button>{whatsapp?<a href={'https://wa.me/'+whatsapp} target="_blank" rel="noreferrer" aria-label="Consultar por WhatsApp"><WhatsAppIcon/><span>WhatsApp</span></a>:<button type="button" disabled aria-label="WhatsApp no disponible"><WhatsAppIcon/><span>WhatsApp</span></button>}</nav>
 {categoriesOpen&&<button type="button" className="cq-category-backdrop" aria-label="Cerrar categorías" onClick={closeCategories}/>}
 <dialog id="cq-public-categories" ref={sheet} className="cq cq-category-sheet" aria-labelledby="cq-public-category-title"><header><h2 id="cq-public-category-title">Categorías</h2><button type="button" aria-label="Cerrar categorías" onClick={closeCategories}>×</button></header><div><button type="button" aria-pressed={!category} onClick={()=>choose('')}>Todos los productos{!category&&<span aria-hidden="true">✓</span>}</button>{categories.map(c=><button type="button" key={c.id} aria-pressed={category===c.id} onClick={()=>choose(c.id)}>{c.name}{category===c.id&&<span aria-hidden="true">✓</span>}</button>)}</div></dialog>
 </div>
}
