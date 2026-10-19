import { useEffect, useState } from 'react'
import { SocialIcon } from './SocialIcon'
import { socialNetworks, socialDrafts } from './socialNetworks'
import { BannerPicker } from './BannerPicker'
import { LogoPicker } from './LogoPicker'
import { saveQrCatalog, uploadCatalogImage, removeCatalogLogo, requestCatalogLink, uploadCatalogBanner, removeCatalogBanner } from '../../services/qrCatalog'
export function CatalogSettings({ workspaceId, data, state }) {
  const [form, setForm] = useState(() => data.catalog ? { ...data.catalog, socialLinks:socialDrafts(data.catalog.socialLinks) } : { presentation:'CATALOG', name:data.workspace.name,description:'',publicSlug:data.workspace.publicSlug || data.workspace.suggestedSlug,currency:'PEN',whatsapp:'',socialLinks:[],published:false })
  const [banner,setBanner]=useState(null)
  const [bannerPreview,setBannerPreview]=useState('')
  const [removeBanner,setRemoveBanner]=useState(false)
  const [bannerError,setBannerError]=useState('')
  const [slugEdited,setSlugEdited]=useState(false)
  const [logo,setLogo]=useState(null)
  const [logoPreview,setLogoPreview]=useState('')
  const [removeLogo,setRemoveLogo]=useState(false)
  const [fileError,setFileError]=useState('')
  const [request,setRequest]=useState({requestedSlug:'',reason:''})
  const locked=Boolean(data.catalog?.linkLocked)
  const published=Boolean(data.catalog?.published)
  const suffix=form.presentation==='MENU'?'carta':'catalogo'
  const label=form.presentation==='MENU'?'carta':'catálogo'
  const fullUrl=location.origin+'/'+(form.publicSlug || 'tu-negocio')+'/'+suffix
  useEffect(()=>{if(!logo)return;const url=URL.createObjectURL(logo);setLogoPreview(url);return()=>URL.revokeObjectURL(url)},[logo])
  useEffect(()=>{if(!banner)return;const url=URL.createObjectURL(banner);setBannerPreview(url);return()=>URL.revokeObjectURL(url)},[banner])
  function edit(key,value){setForm(current=>{
    const next={...current,[key]:value}
    if(key==='name'&&!locked&&!slugEdited)next.publicSlug=value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,50).replace(/-$/,'')
    return next
  })}
  async function submit(event){
    event.preventDefault()
    const action=event.nativeEvent.submitter?.value || 'save'
    const nextPublished=action==='publish'?true:published
    if(action==='publish'&&!window.confirm('¿Publicar tu '+label+' y confirmar este enlace?\n'+fullUrl+'\nDespués solo el administrador podrá cambiarlo.'))return
    const result=await state.act(async()=>{
      let result=await saveQrCatalog(workspaceId,{...form,published:(logo||removeLogo||banner||removeBanner)?published:nextPublished})
      if(logo)result=await uploadCatalogImage(workspaceId,logo)
      else if(removeLogo&&data.catalog?.logoUrl)result=await removeCatalogLogo(workspaceId)
      if(banner)result=await uploadCatalogBanner(workspaceId,banner)
      else if(removeBanner&&data.catalog?.bannerUrl)result=await removeCatalogBanner(workspaceId)
      if((logo||removeLogo||banner||removeBanner)&&nextPublished!==published)result=await saveQrCatalog(workspaceId,{...form,published:nextPublished})
      return result
    },action==='publish'?'Publicación lista. Tu enlace y QR ya pueden compartirse.':published?'Cambios guardados.':'Borrador guardado. Todavía no es visible para tus clientes.')
    if(result){setForm({...result.catalog,socialLinks:socialDrafts(result.catalog.socialLinks)});setLogo(null);setLogoPreview('');setRemoveLogo(false);setBanner(null);setBannerPreview('');setRemoveBanner(false)}
  }
  return <div className="cq-settings"><div className="cq-settings-heading"><div><h2>Mi negocio</h2><p>Prepara la presentación de tu negocio y elige cómo compartirla.</p></div><div className="cq-settings-status"><span className={'cq-badge '+(published?'available':'hidden')}>{published?'Publicado':'Borrador'}</span>{published&&<a className="cq-view-public" href={data.catalog.publicPath} target="_blank" rel="noreferrer">Ver {data.catalog.presentation==='MENU'?'carta':'catálogo'} ↗</a>}</div></div>
  <form onSubmit={submit}>
    <fieldset className="cq-business-group"><legend>1. Tu negocio</legend>
      <label>Nombre del negocio<input required maxLength="120" value={form.name} onChange={e=>edit('name',e.target.value)}/><small>Lo verán tus clientes. No cambia el nombre de tu espacio.</small></label>
      <LogoPicker currentUrl={data.catalog?.logoUrl} previewUrl={logoPreview} pending={Boolean(logo)} removed={removeLogo} busy={state.busy} error={fileError} onSelect={f=>{if(!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>5*1024*1024){setFileError('Selecciona una imagen PNG, JPEG o WebP de hasta 5 MB.');return}setFileError('');setLogo(f);setRemoveLogo(false)}} onRemove={()=>{setLogo(null);setLogoPreview('');setRemoveLogo(true);setFileError('')}} onUndo={()=>{setLogo(null);setLogoPreview('');setRemoveLogo(false);setFileError('')}}/>
      <BannerPicker url={data.catalog?.bannerUrl} preview={bannerPreview} pending={Boolean(banner)} removed={removeBanner} busy={state.busy} error={bannerError} onSelect={file=>{if(!['image/png','image/jpeg','image/webp'].includes(file.type)||!file.size||file.size>5*1024*1024){setBannerError('Selecciona una portada PNG, JPEG o WebP de hasta 5 MB.');return}setBannerError('');setBanner(file);setRemoveBanner(false)}} onRemove={()=>{setBanner(null);setBannerPreview('');setRemoveBanner(true);setBannerError('')}} onUndo={()=>{setBanner(null);setBannerPreview('');setRemoveBanner(false);setBannerError('')}}/>
      <label>Descripción breve<textarea rows="3" maxLength="500" value={form.description} onChange={e=>edit('description',e.target.value)}/></label>
    </fieldset>
    <fieldset className="cq-link-group"><legend>2. Tu enlace y QR</legend>
      <label>Mostrar como<select aria-label="Mostrar como" value={form.presentation} onChange={e=>edit('presentation',e.target.value)}><option value="CATALOG">Catálogo</option><option value="MENU">Carta</option></select></label>
      <label>Enlace de tu negocio<div className="cq-url-builder"><span aria-hidden="true">{location.host}/</span><input aria-label="Enlace de tu negocio" required minLength="3" maxLength="60" pattern="[a-z0-9]+(-[a-z0-9]+)*" readOnly={locked||!data.workspace.canRename} value={form.publicSlug??''} onChange={e=>{setSlugEdited(true);edit('publicSlug',e.target.value)}}/><span aria-hidden="true">/{suffix}</span></div></label>
      <div className="cq-url-result"><strong>Con este enlace se generará tu QR</strong><output aria-label="Enlace completo de tu negocio">{fullUrl}</output></div>
      <p>{locked?'Enlace confirmado. Para cambiarlo, envía una solicitud al administrador.':'Al publicar se confirma el enlace. Después, solo el administrador podrá cambiarlo.'}</p>
    </fieldset>
    <fieldset><legend>3. Moneda</legend><label>Moneda<select aria-label="Moneda" value={form.currency} onChange={e=>edit('currency',e.target.value)}><option value="PEN">Soles (PEN)</option><option value="USD">Dólares (USD)</option><option value="EUR">Euros (EUR)</option></select></label></fieldset>
    <fieldset><legend>4. Contacto y redes sociales</legend><label>WhatsApp<input aria-label="WhatsApp" inputMode="tel" maxLength="15" placeholder="51987654321" value={form.whatsapp} onChange={e=>edit('whatsapp',e.target.value)}/><small>Opcional. Código de país y número, sin espacios ni +.</small></label>
      <p>Elige la red y escribe tu usuario o pega el enlace. Nosotros armamos el acceso.</p>{form.socialLinks.map((link,index)=><div className="cq-social-row" key={index}><label className="cq-social-name">Red social<div className="cq-social-select"><SocialIcon platform={link.platform}/><select aria-label={'Red social '+(index+1)} value={link.platform} onChange={e=>edit('socialLinks',form.socialLinks.map((item,i)=>i===index?{...item,platform:e.target.value,value:'',url:''}:item))}>{socialNetworks.map(network=><option value={network.id} key={network.id}>{network.name}</option>)}</select></div></label><label className="cq-social-url">{link.platform==='website'?'Enlace':'Usuario o enlace'}<input type="text" required maxLength="500" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder={socialNetworks.find(n=>n.id===link.platform)?.placeholder} value={link.value} onChange={e=>edit('socialLinks',form.socialLinks.map((item,i)=>i===index?{...item,value:e.target.value}:item))}/></label><button type="button" className="cq-social-remove" disabled={state.busy} data-tooltip="Quitar red social" aria-label={'Quitar red social '+(index+1)} onClick={()=>edit('socialLinks',form.socialLinks.filter((_,i)=>i!==index))}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/></svg><span>Quitar</span></button></div>)}<button type="button" className="cq-social-add" disabled={state.busy||form.socialLinks.length>=8} onClick={()=>edit('socialLinks',[...form.socialLinks,{platform:'instagram',value:''}])}>+ Agregar red social</button>
    </fieldset>
    <div className="cq-publish-summary"><strong>{published?'Publicado · Visible para tus clientes':'Borrador · Solo tu equipo puede administrarlo'}</strong><p>{published?'Guardar cambios actualizará el contenido público.':'Guarda tu avance o publica cuando esté listo. Publicar habilita el acceso desde el enlace y el QR.'}</p><div className="cq-actions"><button type="submit" value="save" className="primary-button cq-save-button" aria-label={published?'Guardar cambios':'Guardar borrador'} data-tooltip={published?'Guardar cambios':'Guardar borrador'} disabled={state.busy}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 3h12l4 4v14H3V3zM7 3v6h9V3M7 21v-8h10v8"/></svg><span>{published?'Guardar cambios':'Guardar borrador'}</span></button>{!published?<button type="submit" value="publish" className="primary-button" disabled={state.busy}>Publicar {label}</button>:null}</div></div>
  </form>
  {locked&&data.workspace.canRename&&<details className="cq-change-request"><summary>Solicitar cambio de enlace al administrador</summary>{data.linkRequest?.status==='PENDING'?<p role="status">Solicitud pendiente: {data.linkRequest.requestedSlug}. El administrador revisará tu solicitud. Tu enlace actual sigue funcionando.</p>:<form onSubmit={e=>{e.preventDefault();state.act(()=>requestCatalogLink(workspaceId,request),'Solicitud enviada al administrador. Tu enlace actual continúa funcionando.')}}>{data.linkRequest&&<p>Última solicitud: {data.linkRequest.status==='APPROVED'?'aprobada':'rechazada'}.</p>}<label>Nuevo enlace solicitado<input required minLength="3" maxLength="60" pattern="[a-z0-9]+(-[a-z0-9]+)*" value={request.requestedSlug} onChange={e=>setRequest({...request,requestedSlug:e.target.value})}/></label><label>Motivo del cambio<textarea required maxLength="300" value={request.reason} onChange={e=>setRequest({...request,reason:e.target.value})}/></label><button disabled={state.busy}>Enviar solicitud</button></form>}</details>}
  </div>
}
