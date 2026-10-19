const prisma=require('../prisma');
const v=require('./validation');
async function request(userId,workspaceId,body){
 v.id(workspaceId);const slug=v.slug(body?.requestedSlug);const reason=v.text(body?.reason,300,'el motivo del cambio',true);
 await prisma.$transaction(async db=>{
 await db.$queryRaw`SELECT id FROM workspaces WHERE id=${workspaceId}::uuid FOR UPDATE`;
 const m=await db.membership.findUnique({where:{userId_workspaceId:{userId,workspaceId}},include:{workspace:{include:{qrCatalog:true}}}});
 if(!m || m.role!=='OWNER' || m.workspace.status!=='ACTIVE')throw v.fail(403,'Solo el propietario puede solicitar el cambio');
 if(!m.workspace.qrCatalog?.linkLocked)throw v.fail(409,'Puedes editar el enlace mientras sea borrador');
 if(slug===m.workspace.publicSlug)throw v.fail(400,'Ingresa un enlace diferente al actual');
 const reserved=await db.workspacePublicAddress.findUnique({where:{slug}});if(reserved && reserved.workspaceId!==workspaceId)throw v.fail(409,'Ese enlace pertenece a otro negocio');
 if(await db.catalogLinkRequest.findFirst({where:{workspaceId,status:'PENDING'}}))throw v.fail(409,'Ya tienes una solicitud pendiente');
 await db.catalogLinkRequest.create({data:{workspaceId,requestedById:userId,requestedSlug:slug,reason}});
 });
 return require('./service').get(userId,workspaceId);
}
async function list(){return prisma.catalogLinkRequest.findMany({where:{status:'PENDING'},orderBy:{createdAt:'asc'},include:{workspace:{select:{name:true,publicSlug:true,qrCatalog:{select:{name:true}}}}},take:200});}
async function review(reviewerId,id,body){
 v.id(id);if(!['APPROVED','REJECTED'].includes(body?.status))throw v.fail(400,'Selecciona aprobar o rechazar');
 const found=await prisma.catalogLinkRequest.findUnique({where:{id}});if(!found)throw v.fail(404,'Solicitud no encontrada');
 await prisma.$transaction(async db=>{
 await db.$queryRaw`SELECT id FROM workspaces WHERE id=${found.workspaceId}::uuid FOR UPDATE`;
 const r=await db.catalogLinkRequest.findUnique({where:{id}});if(r.status!=='PENDING')throw v.fail(409,'Esta solicitud ya fue revisada');
 if(body.status==='APPROVED'){
 const address=await db.workspacePublicAddress.findUnique({where:{slug:r.requestedSlug}});if(address&&address.workspaceId!==r.workspaceId)throw v.fail(409,'El enlace ya está reservado por otro negocio');
 if(!address)await db.workspacePublicAddress.create({data:{slug:r.requestedSlug,workspaceId:r.workspaceId}});
 await db.workspace.update({where:{id:r.workspaceId},data:{publicSlug:r.requestedSlug}});
 }
 await db.catalogLinkRequest.update({where:{id},data:{status:body.status,reviewedAt:new Date(),reviewedById:reviewerId}});
 });return {ok:true};
}
module.exports={request,list,review};
