const prisma = require('../prisma');
const {id,text,fail}=require('../qr-catalog/validation');
const transact=fn=>prisma.$transaction(fn,{maxWait:15000,timeout:15000});
async function owned(db,userId,workspaceId){
 id(workspaceId);
 await db.$queryRaw`SELECT id FROM workspaces WHERE id=${workspaceId}::uuid FOR UPDATE`;
 const member=await db.membership.findUnique({where:{userId_workspaceId:{userId,workspaceId}},include:{workspace:true}});
 if(!member || member.role!=='OWNER' || member.workspace.status!=='ACTIVE')throw fail(403,'Solo el propietario puede gestionar este espacio');
 return member.workspace;
}
async function create(userId,body){
 const name=text(body?.name,120,'el nombre del espacio',true);
 return prisma.workspace.create({data:{name,type:'PERSONAL',memberships:{create:{userId,role:'OWNER'}}},select:{id:true,name:true}});
}
async function rename(userId,workspaceId,body){
 const name=text(body?.name,120,'el nombre del espacio',true);
 return transact(async db=>{await owned(db,userId,workspaceId);return db.workspace.update({where:{id:workspaceId},data:{name},select:{id:true,name:true}});});
}
async function remove(userId,workspaceId){
 return transact(async db=>{
  await owned(db,userId,workspaceId);
  const space=await db.workspace.findUnique({where:{id:workspaceId},include:{turnQueue:{select:{id:true}},citaClinic:{select:{id:true}},qrCatalog:{select:{id:true}},_count:{select:{modules:true,raffles:true,catalogProducts:true,catalogCategories:true,publicAddresses:true,memberships:true}}}});
  const c=space._count;
  if(await db.bingoRoom.count({where:{workspaceId}}))throw fail(409,'Este espacio conserva salas de bingo y no puede eliminarse');
  if(space.turnQueue||space.citaClinic||space.qrCatalog||c.modules||c.raffles||c.catalogProducts||c.catalogCategories||c.publicAddresses||c.memberships>1)throw fail(409,'Solo puedes eliminar espacios vacíos, sin microapps, datos, enlaces públicos ni personas invitadas');
  await db.workspace.delete({where:{id:workspaceId}});
 });
}
module.exports={create,rename,remove};
