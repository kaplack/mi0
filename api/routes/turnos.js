const express = require('express');
const crypto = require('crypto');
const prisma = require('../prisma');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
const fail = (status,message) => Object.assign(new Error(message),{status});
const validKey = v => typeof v === 'string' && /^[a-zA-Z0-9-]{16,80}$/.test(v);
async function owned(userId,workspaceId) {
  const membership = await prisma.membership.findUnique({where:{userId_workspaceId:{userId,workspaceId}}});
  if (!membership) throw fail(403,'No tienes acceso a este espacio');
}
async function publicQueue(code) {
  const q=await prisma.turnQueue.findUnique({where:{code}});
  if (!q) throw fail(404,'Negocio no encontrado');
  return q;
}
router.get('/public/:code',async(req,res,next)=>{try{
  const q=await publicQueue(req.params.code);
  const tickets=await prisma.turnTicket.findMany({where:{queueId:q.id,status:{in:['WAITING','CALLED']}},orderBy:{number:'asc'},select:{number:true,status:true,counter:true}});
  res.set('Cache-Control','no-store').json({name:q.name,code:q.code,waiting:tickets.filter(t=>t.status==='WAITING').length,called:tickets.filter(t=>t.status==='CALLED')});
}catch(e){next(e)}});
router.get('/public/:code/mine',async(req,res,next)=>{try{
 const q=await publicQueue(req.params.code);
 if(!validKey(req.query.key)) throw fail(400,'Identificador inválido');
 const ticket=await prisma.turnTicket.findFirst({where:{queueId:q.id,clientKey:req.query.key,status:{in:['WAITING','CALLED']}},orderBy:{number:'desc'}});
 const ahead=ticket?.status==='WAITING'?await prisma.turnTicket.count({where:{queueId:q.id,status:'WAITING',number:{lt:ticket.number}}}):0;
 res.set('Cache-Control','no-store').json({ticket,ahead,name:q.name});
}catch(e){next(e)}});
router.post('/public/:code/join',async(req,res,next)=>{try{
 const q=await publicQueue(req.params.code);
 const name=String(req.body?.name||'').trim();
 const key=req.body?.key;
 if(!name||name.length>80||!validKey(key)) throw fail(400,'Nombre o identificador inválido');
 const ticket=await prisma.$transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${q.id}::text))`;
   const existing=await tx.turnTicket.findFirst({where:{queueId:q.id,clientKey:key,status:{in:['WAITING','CALLED']}}});
   if(existing) return existing;
   const updated=await tx.turnQueue.update({where:{id:q.id},data:{lastNumber:{increment:1}}});
   return tx.turnTicket.create({data:{queueId:q.id,number:updated.lastNumber,name,clientKey:key}});
 });
 res.status(201).json({ticket});
}catch(e){next(e)}});
router.use(requireAuth);
router.post('/setup',async(req,res,next)=>{try{
 const {workspaceId,name}=req.body||{};
 await owned(req.auth.user.id,workspaceId);
 const label=String(name||'').trim();
 if(!label||label.length>120) throw fail(400,'Ingresa el nombre del negocio');
 const existing=await prisma.turnQueue.findUnique({where:{workspaceId}});
 if(existing) return res.json({queue:existing});
 const queue=await prisma.turnQueue.create({data:{workspaceId,name:label,code:crypto.randomBytes(6).toString('hex')}});
 res.status(201).json({queue});
}catch(e){next(e)}});
router.get('/workspace/:workspaceId',async(req,res,next)=>{try{
 await owned(req.auth.user.id,req.params.workspaceId);
 const queue=await prisma.turnQueue.findUnique({where:{workspaceId:req.params.workspaceId}});
 const tickets=queue?await prisma.turnTicket.findMany({where:{queueId:queue.id,status:{in:['WAITING','CALLED']}},orderBy:{number:'asc'},select:{id:true,number:true,name:true,status:true,counter:true}}):[];
 res.set('Cache-Control','no-store').json({queue,tickets});
}catch(e){next(e)}});
router.post('/workspace/:workspaceId/next',async(req,res,next)=>{try{
 await owned(req.auth.user.id,req.params.workspaceId);
 const counter=Number(req.body?.counter);
 if(!Number.isInteger(counter)||counter<1||counter>99) throw fail(400,'Caja inválida');
 const q=await prisma.turnQueue.findUnique({where:{workspaceId:req.params.workspaceId}});
 if(!q) throw fail(404,'Configura el negocio primero');
 const ticket=await prisma.$transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${q.id}::text))`;
   await tx.turnTicket.updateMany({where:{queueId:q.id,counter,status:'CALLED'},data:{status:'SERVED',servedAt:new Date()}});
   const next=await tx.turnTicket.findFirst({where:{queueId:q.id,status:'WAITING'},orderBy:{number:'asc'}});
   return next?tx.turnTicket.update({where:{id:next.id},data:{status:'CALLED',counter,calledAt:new Date()}}):null;
 });
 res.json({ticket});
}catch(e){next(e)}});
module.exports=router;
