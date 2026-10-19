const express = require('express');
const router=express.Router();
const {requireAuth}=require('../middleware/auth');
const service=require('../qr-catalog/service');
const run=fn=>async(req,res,next)=>{try{res.json({ok:true,...await fn(req)});}catch(error){next(error);}};
router.get('/by-space/:slug',run(req=>service.publicBySlug(req.params.slug)));
router.get('/public/:code',run(req=>service.publicCatalog(req.params.code)));
// Manager previews use authenticated image fetches; unpublished bytes never become public.
router.get('/public/:code/images/:imageId',image(false));
router.get('/public/:code/banner',image(false,'banner'));
router.get('/preview/:code/banner',requireAuth,image(true,'banner'));
router.get('/public/:code/logo',image(false,'logo'));
router.get('/preview/:code/images/:imageId',requireAuth,image(true));
router.get('/preview/:code/logo',requireAuth,image(true,'logo'));
function image(manager,kind) {return async(req,res,next)=>{try{
  const file=await service.readImage(req.params.code,kind||req.params.imageId,manager?req.auth.user.id:null);
  res.set({'Content-Type':file.type,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'}).send(await req.app.locals.storage.read(file.key));
}catch(error){next(error);}};}
router.use(requireAuth);
router.post('/:workspaceId/link-request',run(req=>require('../qr-catalog/linkRequests').request(req.auth.user.id,req.params.workspaceId,req.body)));
router.get('/:workspaceId',run(req=>service.get(req.auth.user.id,req.params.workspaceId)));
router.put('/:workspaceId',run(req=>service.saveSettings(req.auth.user.id,req.params.workspaceId,req.body)));
router.post('/:workspaceId/categories',run(req=>service.saveCategory(req.auth.user.id,req.params.workspaceId,req.body)));
router.put('/:workspaceId/categories/:id',run(req=>service.saveCategory(req.auth.user.id,req.params.workspaceId,req.body,req.params.id)));
router.delete('/:workspaceId/categories/:id',run(req=>service.deleteCategory(req.auth.user.id,req.params.workspaceId,req.params.id)));
router.post('/:workspaceId/products',run(req=>service.saveProduct(req.auth.user.id,req.params.workspaceId,req.body)));
router.put('/:workspaceId/products/:id',run(req=>service.saveProduct(req.auth.user.id,req.params.workspaceId,req.body,req.params.id)));
router.delete('/:workspaceId/products/:id',run(req=>service.deleteProduct(req.auth.user.id,req.params.workspaceId,req.params.id,req.app.locals.storage)));
const raw=express.raw({type:['image/png','image/jpeg','image/webp'],limit:'5mb'});
router.post('/:workspaceId/banner',raw,run(req=>service.upload(req.auth.user.id,req.params.workspaceId,null,req.body,req.app.locals.storage,'banner')));
router.delete('/:workspaceId/banner',run(req=>service.removeLogo(req.auth.user.id,req.params.workspaceId,req.app.locals.storage,'banner')));
router.post('/:workspaceId/logo',raw,run(req=>service.upload(req.auth.user.id,req.params.workspaceId,null,req.body,req.app.locals.storage)));
router.delete('/:workspaceId/logo',run(req=>service.removeLogo(req.auth.user.id,req.params.workspaceId,req.app.locals.storage)));
router.post('/:workspaceId/products/:id/images',raw,run(req=>service.upload(req.auth.user.id,req.params.workspaceId,req.params.id,req.body,req.app.locals.storage)));
router.delete('/:workspaceId/images/:id',run(req=>service.removeImage(req.auth.user.id,req.params.workspaceId,req.params.id,req.app.locals.storage)));
module.exports=router;
