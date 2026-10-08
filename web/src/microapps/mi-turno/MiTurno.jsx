import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import './MiTurno.css'

export function MiTurno({ code, onBack }) {
  const [workspaces,setWorkspaces]=useState([])
  const [workspaceId,setWorkspaceId]=useState('')
  const [queue,setQueue]=useState(null)
  const [tickets,setTickets]=useState([])
  const [name,setName]=useState('')
  const [counter,setCounter]=useState(1)
  const [customer,setCustomer]=useState('')
  const [mine,setMine]=useState(null)
  const [ahead,setAhead]=useState(0)
  const [error,setError]=useState('')
  const [display,setDisplay]=useState(false)
  const [busy,setBusy]=useState(false)
  const keyName=code?'mi0_turno_'+code:''
  useEffect(()=>{if(code)return;api('/workspaces').then(d=>{const list=d.workspaces||[];setWorkspaces(list);setWorkspaceId(list[0]?.id||'')}).catch(e=>setError(e.message))},[code])
  useEffect(()=>{
    if(!code&&!workspaceId)return
    let alive=true
    async function refresh(){
      try {
        if(code){
          const data=await api('/turnos/public/'+encodeURIComponent(code))
          if(!alive)return
          setQueue(data)
          const key=localStorage.getItem(keyName)
          if(key){const state=await api('/turnos/public/'+encodeURIComponent(code)+'/mine?key='+encodeURIComponent(key));if(alive){setMine(state.ticket);setAhead(state.ahead)}}
        } else {
          const data=await api('/turnos/workspace/'+workspaceId)
          if(alive){setQueue(data.queue);setTickets(data.tickets)}
        }
      }catch(e){if(alive)setError(e.message)}
    }
    refresh();const interval=setInterval(refresh,3000)
    return()=>{alive=false;clearInterval(interval)}
  },[code,workspaceId,keyName])
  async function create(){
    setBusy(true);setError('')
    try{const result=await api('/turnos/setup',{method:'POST',body:JSON.stringify({workspaceId,name})});setQueue(result.queue)}catch(e){setError(e.message)}finally{setBusy(false)}
  }
  async function join(){
    setBusy(true);setError('')
    try{
      let key=localStorage.getItem(keyName)
      if(!key){key=crypto.randomUUID();localStorage.setItem(keyName,key)}
      const result=await api('/turnos/public/'+encodeURIComponent(code)+'/join',{method:'POST',body:JSON.stringify({name:customer,key})})
      setMine(result.ticket);setCustomer('')
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }
  async function next(){
    setBusy(true);setError('')
    try{
      await api('/turnos/workspace/'+workspaceId+'/next',{method:'POST',body:JSON.stringify({counter})})
      const result=await api('/turnos/workspace/'+workspaceId)
      setTickets(result.tickets)
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }
  const called=tickets.filter(t=>t.status==='CALLED')
  const waiting=tickets.filter(t=>t.status==='WAITING')
  return <main className="turno">
    <header className="turno-header"><strong>mi0.app <span>· Mi Turno</span></strong>{onBack&&<button onClick={onBack}>← Volver</button>}</header>
    {error&&<p role="alert" className="turno-error">{error}</p>}
    {code ? <section className="turno-panel">
      <h1>{queue?.name||'Mi Turno'}</h1>
      {mine?<><p>{mine.status==='CALLED'?'¡Es tu turno!':'Tu turno es'}</p><div className="turno-number">{String(mine.number).padStart(3,'0')}</div>
        <h2>{mine.status==='CALLED'?'Dirígete a caja '+mine.counter:'Personas delante: '+ahead}</h2>
        <p>Esta página se actualiza automáticamente.</p></>
      :<><p>Ingresa tu nombre para entrar a la cola.</p><input maxLength={80} placeholder="Tu nombre" value={customer} onChange={e=>setCustomer(e.target.value)}/>
        <button disabled={busy||!customer.trim()} onClick={join}>Tomar mi turno</button></>}
    </section> : <section className="turno-panel">
      <h1>Mi Turno</h1>
      {workspaces.length>1&&<select value={workspaceId} onChange={e=>setWorkspaceId(e.target.value)}>{workspaces.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select>}
      {!workspaceId?<p>Inicia sesión para configurar tu negocio.</p>:!queue?<><p>¿Cómo se llama tu negocio?</p><input placeholder="Nombre del negocio" maxLength={120} value={name} onChange={e=>setName(e.target.value)}/><button disabled={busy||!name.trim()} onClick={create}>Crear cola</button></>:
      <><h2>{queue.name}</h2><p>Comparte este enlace como QR con tus clientes:</p><a href={location.origin+'/turno/'+queue.code} target="_blank" rel="noreferrer">{location.origin+'/turno/'+queue.code}</a>
      <label>Caja <input type="number" min="1" max="99" value={counter} onChange={e=>setCounter(Number(e.target.value))}/></label>
      {!display&&<><button disabled={busy||waiting.length===0} onClick={next}>Llamar siguiente</button><p>{waiting.length} personas esperando</p><button className="turno-secondary" onClick={()=>setDisplay(true)}>Pantalla pública</button></>}
      {display&&<button className="turno-secondary" onClick={()=>setDisplay(false)}>Volver al control</button>}
      <div className="turno-calls">{called.map(t=><div key={t.id}><b>{String(t.number).padStart(3,'0')}</b><span>Caja {t.counter}</span></div>)}</div>
      {!display&&<div className="turno-waiting">{waiting.map(t=><p key={t.id}>{String(t.number).padStart(3,'0')} · {t.name}</p>)}</div>}
      </>}
    </section>}
  </main>
}
