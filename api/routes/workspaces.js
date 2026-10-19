const express = require('express');
const prisma = require('../prisma');
const { requireAuth } = require('../middleware/auth');
const { access } = require('../raffles/service');

const router = express.Router();

router.use(requireAuth);
const management = require('../workspaces/service');
router.post('/', async(req,res,next)=>{try{res.status(201).json({workspace:await management.create(req.auth.user.id,req.body)});}catch(error){next(error);}});
router.patch('/:workspaceId', async(req,res,next)=>{try{res.json({workspace:await management.rename(req.auth.user.id,req.params.workspaceId,req.body)});}catch(error){next(error);}});
router.delete('/:workspaceId', async(req,res,next)=>{try{await management.remove(req.auth.user.id,req.params.workspaceId);res.json({ok:true});}catch(error){next(error);}});


router.get('/', async (req, res, next) => {
  try {
    const memberships = await prisma.membership.findMany({
      where: { userId: req.auth.user.id },
      orderBy: { createdAt: 'asc' },
      include: {
        workspace: {
          include: {
            citaClinic: { select: { name: true, accesses: { where: { userId: req.auth.user.id, active: true }, select: { id: true } } } },
            turnQueue: { select: { name: true, operators: { where: { userId: req.auth.user.id }, select: { counter: true } } } },
            modules: {
              where: { active: true },
              include: { module: true },
            },
          },
        },
      },
    });

    const workspaces = memberships
      .filter(({ workspace }) => workspace.status === 'ACTIVE')
      .map(({ role, workspace }) => ({
        id: workspace.id,
        name: workspace.name,
        type: workspace.type,
        role,
        accessLabel: role === 'OWNER' ? 'Propietario' : role === 'ADMIN' ? 'Administrador invitado' : workspace.citaClinic?.accesses.length ? 'Profesional' : workspace.turnQueue?.operators.length ? 'Operador' : 'Acceso invitado',
        modules: workspace.modules
          .map(({ module }) => ({
            id: module.id,
            code: module.code,
            name: module.name,
            description: module.description,
          })),
      }));

    res.json({ ok: true, workspaces });
  } catch (error) {
    next(error);
  }
});


router.post('/:workspaceId/modules/:moduleCode', async (req, res, next) => {
  try {
    await access(prisma, req.auth.user.id, req.params.workspaceId, true);

    const module = await require('../catalog/service').requireAvailable(prisma, req.params.moduleCode, req.params.workspaceId);

    const workspaceModule = await prisma.workspaceModule.upsert({
      where: {
        workspaceId_moduleId: {
          workspaceId: req.params.workspaceId,
          moduleId: module.id,
        },
      },
      update: { active: true },
      create: {
        workspaceId: req.params.workspaceId,
        moduleId: module.id,
        active: true,
      },
    });

    res.status(201).json({
      ok: true,
      workspaceModule,
      module: {
        id: module.id,
        code: module.code,
        name: module.name,
        description: module.description,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
