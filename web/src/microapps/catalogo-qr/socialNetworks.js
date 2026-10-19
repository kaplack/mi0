export const socialNetworks=[{id:'instagram',name:'Instagram',placeholder:'@tu.negocio o enlace de Instagram',host:'instagram.com'},{id:'facebook',name:'Facebook',placeholder:'Usuario o enlace de tu página',host:'facebook.com'},{id:'tiktok',name:'TikTok',placeholder:'@tu.negocio o enlace de TikTok',host:'tiktok.com'},{id:'youtube',name:'YouTube',placeholder:'@tucanal o enlace de YouTube',host:'youtube.com'},{id:'x',name:'X',placeholder:'@tuusuario o enlace de X',host:'x.com'},{id:'website',name:'Sitio web',placeholder:'https://tu-negocio.com'}]
export function socialPlatform(link){
 if(socialNetworks.some(n=>n.id===link.platform))return link.platform
 try{const host=new URL(link.url).hostname.toLowerCase();return socialNetworks.find(n=>n.host&&(host===n.host||host.endsWith('.'+n.host)))?.id||(host==='twitter.com'?'x':host==='youtu.be'?'youtube':'website')}catch{return 'website'}
}
export const socialDrafts=links=>links.map(link=>({...link,platform:socialPlatform(link),value:link.value??link.url??''}))
