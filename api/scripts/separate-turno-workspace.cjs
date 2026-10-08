// Explicit local maintenance: separates a named queue from a clinic's workspace.
const path = require('node:path');
const assert = require('node:assert/strict');
require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
const prisma = require('../prisma');
async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(['localhost','127.0.0.1','[::1]'].includes(url.hostname));
  assert.equal(url.pathname,'/mi0'); assert.equal(url.searchParams.get('schema') || 'public','public');
  const [workspaceId, queueName] = process.argv.slice(2);
  assert.match(workspaceId || '', /^[a-f0-9-]{36}$/); assert.ok(queueName);
  const result = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${workspaceId}::text))`;
    const source = await tx.workspace.findUnique({where:{id:workspaceId},include:{citaClinic:true,turnQueue:{include:{operators:true}},memberships:true}});
    assert.ok(source?.status === 'ACTIVE' && source.citaClinic, 'Se requiere un consultorio activo en el origen');
    assert.equal(source.turnQueue?.name,queueName,'La cola debe coincidir exactamente con el negocio solicitado');
    const queue = source.turnQueue;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${queue.id}::text))`;
    const owners = source.memberships.filter(m=>['OWNER','ADMIN'].includes(m.role)); assert.ok(owners.some(m=>m.role==='OWNER'));
    const operatorIds = new Set(queue.operators.map(o=>o.userId));
    const memberships = source.memberships.filter(m=>['OWNER','ADMIN'].includes(m.role) || operatorIds.has(m.userId));
    assert.ok([...operatorIds].every(id=>memberships.some(m=>m.userId===id)));
    const counts = await Promise.all([tx.turnTicket.count({where:{queueId:queue.id}}),tx.turnInvitation.count({where:{queueId:queue.id}}),tx.citaAppointment.count({where:{clinicId:source.citaClinic.id}})]);
    const destination = await tx.workspace.create({data:{name:queue.name,type:'ORGANIZATION',memberships:{create:memberships.map(m=>({userId:m.userId,role:m.role}))}}});
    await tx.turnQueue.update({where:{id:queue.id},data:{workspaceId:destination.id}});
    const module = await tx.module.findUniqueOrThrow({where:{code:'mi-turno'}});
    const enabled = await tx.workspaceModule.findUnique({where:{workspaceId_moduleId:{workspaceId,moduleId:module.id}}});
    await tx.workspaceModule.create({data:{workspaceId:destination.id,moduleId:module.id,active:enabled?.active ?? true}});
    await tx.workspaceModule.deleteMany({where:{workspaceId,moduleId:module.id}});
    if(source.name==='Mi espacio') await tx.workspace.update({where:{id:workspaceId},data:{name:source.citaClinic.name}});
    assert.deepEqual(await Promise.all([tx.turnTicket.count({where:{queueId:queue.id}}),tx.turnInvitation.count({where:{queueId:queue.id}}),tx.citaAppointment.count({where:{clinicId:source.citaClinic.id}})]),counts);
    assert.deepEqual((await tx.turnOperator.findMany({where:{queueId:queue.id},orderBy:{id:'asc'}})).map(o=>({id:o.id,userId:o.userId,counter:o.counter})),queue.operators.sort((a,b)=>a.id.localeCompare(b.id)).map(o=>({id:o.id,userId:o.userId,counter:o.counter})));
    return {clinicWorkspaceId:workspaceId,turnoWorkspaceId:destination.id,turnoName:destination.name,countsPreserved:counts,operatorsPreserved:queue.operators.length};
  },{timeout:10000});
  console.log(JSON.stringify(result));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>prisma.$disconnect());
