# mi0.app · Backlog

> Estado del proyecto y próximos pasos para convertir la demo de Matrículas en la primera MicroApp funcional de mi0.

**Actualizado:** 29 de septiembre de 2026  
**Fase actual:** Definición → MVP de Web de Matrículas

---

## Objetivo actual

Construir el **Core mínimo de mi0** necesario para transformar la demo existente de nidos en una **Web de Matrículas configurable, multi-tenant y funcional**, probarla con nidos reales y conseguir el primer cliente que pague.

```text
Core mínimo
    ↓
Web de Matrículas funcional
    ↓
Prueba con 10–20 nidos
    ↓
Primer cliente que pague
    ↓
Aprendizaje
    ↓
Siguiente MicroApp
```

---

## Estado general

| Área | Estado | Observación |
|---|---|---|
| Concepto de mi0 | ✅ Definido | Microherramientas simples, modulares y listas para usar |
| Modelo comercial inicial | ✅ Hipótesis definida | S/19.90/mes, S/199/año, 14 días de prueba |
| Stack inicial | ✅ Definido | React + Node/Express + PostgreSQL (PERN) |
| Demo visual Matrículas | ✅ Avanzada | Existe en `kaplack/demo-nido` |
| Landing del nido | ✅ Demo lista | Colores y Sonrisas |
| Formulario de matrícula | 🟡 Visual | Existe, pero aún no guarda datos |
| Dashboard de matrículas | 🟡 Visual | Existe con datos ficticios |
| Core multi-tenant | ⬜ Pendiente | Crear Business y resolución por slug |
| API | ⬜ Pendiente | Backend real de mi0 |
| Base de datos | ⬜ Pendiente | Esquema mínimo Core + Matrículas |
| Configuración por negocio | ⬜ Pendiente | Reemplazar contenido hardcodeado |
| Autenticación admin | ⬜ Pendiente | Solo la mínima necesaria para el piloto |
| Archivos/imágenes | ⬜ Pendiente | Definir almacenamiento inicial |
| Despliegue mi0 | ⬜ Pendiente | Vercel + Render + Neon inicialmente |
| Piloto comercial | ⬜ Pendiente | Contactar 10–20 nidos |

---

# P0 · MVP Matrículas

Estas tareas son necesarias para poder poner la primera MicroApp frente a un negocio real.

## 1. Base del proyecto mi0

- [ ] Definir estructura inicial del repositorio/monorepo.
- [ ] Crear frontend React/Vite.
- [ ] Crear API Node + Express.
- [ ] Configurar PostgreSQL.
- [ ] Configurar variables de entorno.
- [ ] Preparar configuración de desarrollo local.

**Resultado esperado:** frontend, API y base de datos funcionando juntos en local.

---

## 2. Core mínimo

### Business

- [ ] Crear entidad `Business`.
- [ ] Nombre del negocio.
- [ ] Slug público único.
- [ ] Logo.
- [ ] WhatsApp/teléfono.
- [ ] Dirección.
- [ ] Datos de contacto.
- [ ] Branding básico.

- [ ] Resolver negocio mediante slug.
- [ ] Asociar todos los datos de Matrículas a `business_id`.

**Resultado esperado:** poder crear dos negocios diferentes y mantener sus datos separados.

---

## 3. Módulo Matrículas

### EnrollmentConfig

- [ ] Crear configuración de campaña de matrícula.
- [ ] Nombre/año de campaña.
- [ ] Titular y descripción.
- [ ] Información de inicio de clases.
- [ ] Requisitos.
- [ ] Preguntas frecuentes.
- [ ] Configuración de secciones visibles.

### EnrollmentLevel

- [ ] Crear niveles.
- [ ] Edad/nombre del nivel.
- [ ] Turnos.
- [ ] Información descriptiva.
- [ ] Estado de disponibilidad/vacantes.

### EnrollmentRequest

- [ ] Crear solicitud de matrícula.
- [ ] Nombre del niño o niña.
- [ ] Edad.
- [ ] Padre, madre o apoderado.
- [ ] WhatsApp.
- [ ] Nivel.
- [ ] Turno.
- [ ] Comentario.
- [ ] Estado de la solicitud.
- [ ] Fecha de creación.

Estados iniciales propuestos:

```text
Nuevo → Contactado → En revisión → Confirmado
                          ↘ Descartado
```

---

## 4. Convertir demo-nido en MicroApp

La demo ya resuelve gran parte del diseño y experiencia visual. No debe rehacerse desde cero.

- [ ] Tomar `ColoresYSonrisas.jsx` como referencia visual.
- [ ] Convertir la página específica en una plantilla reutilizable.
- [ ] Reemplazar nombre/logo/textos hardcodeados por datos del negocio.
- [ ] Reemplazar niveles hardcodeados por datos de la API.
- [ ] Reemplazar requisitos y FAQ por configuración.
- [ ] Resolver el negocio por URL/slug.
- [ ] Mantener diseño responsive existente.

Ruta objetivo inicial:

```text
mi0.app/colores-y-sonrisas
```

**Resultado esperado:** crear/configurar un negocio sin modificar código y obtener automáticamente su Web de Matrículas.

---

## 5. Formulario real

Actualmente el formulario de `demo-nido` es visual y no persiste información.

- [ ] Conectar formulario con API.
- [ ] Validar campos requeridos.
- [ ] Guardar `EnrollmentRequest`.
- [ ] Mostrar confirmación al padre/apoderado.
- [ ] Evitar envíos duplicados accidentales.
- [ ] Asociar solicitud al negocio correcto.

**Resultado esperado:** una familia puede enviar una solicitud real desde su celular.

---

## 6. Dashboard real

Usar `DashboardDemo.jsx` como referencia.

- [ ] Reemplazar datos ficticios por API.
- [ ] Mostrar total de solicitudes.
- [ ] Mostrar solicitudes nuevas.
- [ ] Mostrar solicitudes contactadas.
- [ ] Mostrar solicitudes confirmadas.
- [ ] Listar solicitudes recientes.
- [ ] Filtrar por nivel.
- [ ] Ver detalle de una solicitud.
- [ ] Cambiar estado de una solicitud.

**Resultado esperado:** el nido puede administrar sus contactos sin depender de conversaciones dispersas de WhatsApp.

---

## 7. Admin mínimo

- [ ] Login.
- [ ] Asociar usuario al negocio.
- [ ] Proteger dashboard.
- [ ] Evitar acceso a datos de otro negocio.
- [ ] Pantalla básica de configuración del negocio.
- [ ] Configuración básica de Matrículas.

No implementar todavía un sistema complejo de roles/permisos.

---

## 8. Archivos e imágenes

- [ ] Definir estrategia inicial de almacenamiento.
- [ ] Evaluar BanaHosting para archivos públicos sencillos.
- [ ] Mantener S3 como alternativa.
- [ ] Subir logo.
- [ ] Subir imágenes de portada/niveles.
- [ ] Guardar URLs asociadas al negocio.

---

## 9. Deploy

- [ ] Crear PostgreSQL en Neon.
- [ ] Desplegar API en Render.
- [ ] Desplegar frontend en Vercel.
- [ ] Configurar variables de producción.
- [ ] Configurar dominio `mi0.app`.
- [ ] Probar rutas por slug.
- [ ] Probar formulario real en producción.
- [ ] Probar dashboard desde móvil y escritorio.

---

# P1 · Piloto comercial

Después de tener el MVP funcional.

- [ ] Cargar Colores y Sonrisas como primer negocio de prueba.
- [ ] Preparar segundo nido para comprobar multi-tenancy.
- [ ] Crear onboarding manual sencillo.
- [ ] Contactar 10–20 nidos cercanos.
- [ ] Enviar demo personalizada.
- [ ] Registrar respuestas.
- [ ] Registrar objeciones.
- [ ] Medir cuántos prueban la herramienta.
- [ ] Medir cuántos envían solicitudes reales.
- [ ] Preguntar disposición a pagar.
- [ ] Buscar primer cliente de pago.

### Hipótesis comercial a validar

- S/19.90 mensual.
- S/199 anual.
- 14 días gratis.
- Sin tarjeta para iniciar prueba.

---

# P2 · Después de validar Matrículas

Solo trabajar estas tareas cuando exista evidencia de uso real.

- [ ] Automatizar onboarding.
- [ ] Suscripciones/pagos.
- [ ] Planes.
- [ ] Recuperación de contraseña.
- [ ] Roles/permisos más completos.
- [ ] Notificaciones.
- [ ] PWA.
- [ ] Internacionalización completa.
- [ ] Métricas de uso.
- [ ] Catálogo de MicroApps.
- [ ] Activación/desactivación de módulos.

---

# Futuras MicroApps

No desarrollar todavía.

| MicroApp | Estado |
|---|---|
| Web de Matrículas | 🚧 Primera en desarrollo |
| Web de Citas | 💡 Backlog |
| Tarjeta de Sellos | 💡 Backlog |
| Servicios para Huéspedes | 💡 Backlog |
| Acuerdos y Pendientes | 💡 Backlog |
| Calendario de Actividades | 💡 Backlog |
| Registro de Incidentes | 💡 Backlog |
| Formularios | 💡 Futuro |
| Solicitudes | 💡 Futuro |
| Reservas | 💡 Futuro |
| Catálogo / Pedidos | 💡 Futuro |

---

# No hacer todavía

Para proteger el alcance del MVP:

- ❌ Construir todas las MicroApps.
- ❌ Crear un ERP.
- ❌ Automatizar facturación antes de tener clientes.
- ❌ Crear permisos complejos.
- ❌ Reconstruir Vincu dentro de mi0.
- ❌ Diseñar nuevamente la landing de Matrículas desde cero.
- ❌ Crear infraestructura innecesaria antes de validar.
- ❌ Añadir funciones solo porque podrían ser útiles en el futuro.

---

# Próxima tarea

## Diseñar e implementar el modelo de datos mínimo

```text
Business
    │
    ├── EnrollmentConfig
    ├── EnrollmentLevel
    └── EnrollmentRequest
```

Después:

```text
Base de datos
    ↓
API
    ↓
demo-nido conectada a datos
    ↓
Dashboard real
    ↓
Deploy
    ↓
Piloto
```

---

## Definición de éxito de la v0.1

La primera versión de mi0 estará lista para probar cuando podamos:

> Crear un negocio desde configuración, asignarle sus datos, niveles y branding, acceder a `mi0.app/{slug}`, recibir una solicitud real de matrícula y verla/cambiar su estado desde el dashboard sin modificar código.

Ese será el momento en que **demo-nido deja de ser una demo y mi0 se convierte en un producto funcional**.
