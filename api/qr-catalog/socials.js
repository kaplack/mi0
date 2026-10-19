const defs={
 instagram:{label:'Instagram',host:'instagram.com',base:'https://www.instagram.com/'},
 facebook:{label:'Facebook',host:'facebook.com',base:'https://www.facebook.com/'},
 tiktok:{label:'TikTok',host:'tiktok.com',base:'https://www.tiktok.com/@'},
 youtube:{label:'YouTube',host:'youtube.com',base:'https://www.youtube.com/@'},
 x:{label:'X',host:'x.com',base:'https://x.com/'},
 website:{label:'Sitio web'}
};
const fail=message=>Object.assign(new Error(message),{status:400});
function infer(url){try{const host=new URL(url).hostname.toLowerCase();return Object.keys(defs).find(k=>defs[k].host&&(host===defs[k].host||host.endsWith('.'+defs[k].host)))||(host==='twitter.com'?'x':host==='youtu.be'?'youtube':'website');}catch{return 'website';}}
function normalize(link){
 if(!link||typeof link!=='object')throw fail('Revisa las redes sociales');
 const platform=link.platform || infer(link.url);
 const def=defs[platform];if(!def)throw fail('Selecciona una red social válida');
 const value=String(link.value??link.url??'').trim();if(!value||value.length>500)throw fail('Ingresa el usuario o enlace de '+def.label);
 let target=value;
 if(!/^https?:\/\//i.test(target)){
 if(platform==='website')target='https://'+target;
 else if(/^www\./i.test(target)||target.includes('/'))target='https://'+target;
 else {const handle=value.replace(/^@/,'');if(!/^[a-zA-Z0-9._-]{1,100}$/.test(handle))throw fail('Usa un usuario válido o pega el enlace completo de '+def.label);target=def.base+handle;}
 }
 let url;try{url=new URL(target)}catch{throw fail('Ingresa un enlace válido de '+def.label)}
 if(url.protocol!=='https:'||url.username||url.password||url.href.length>500||!url.hostname.includes('.'))throw fail('Usa un enlace HTTPS válido');
 if(platform!=='website'){
 const host=url.hostname.toLowerCase();const extra=platform==='x'?['twitter.com']:platform==='youtube'?['youtu.be']:[];
 if(![def.host,...extra].some(domain=>host===domain||host.endsWith('.'+domain)))throw fail('El enlace no corresponde a '+def.label);
 }
 return {platform,label:def.label,url:url.href,value};
}
module.exports={normalize};
