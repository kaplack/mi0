# mi0.app

> **Pequeñas herramientas para grandes ideas.**

mi0.app es una plataforma de microapps sencillas para personas, negocios y organizaciones. Cada herramienta resuelve una tarea concreta y puede usarse de forma independiente, sin aprender un sistema grande.

**Sorteos es la primera herramienta de mi0.** Está implementada en la web como una utilidad gratuita que se usa sin registro. Sorteos Avanzado amplía esa experiencia con resultados guardados y varios premios. Ambas herramientas están disponibles; la prioridad es validar su uso real.

## Primera microapp: Sorteos

El usuario puede:

1. Abrir Sorteos desde el catálogo.
2. Agregar participantes separados por líneas o comas.
3. Sortear entre al menos dos entradas y ver una animación con el ganador.
4. Repetir el sorteo o limpiar la lista.

El sorteo se ejecuta en el navegador. Actualmente no guarda participantes ni resultados en la base de datos y no tiene historial. Cada entrada cuenta como una participación; los nombres repetidos no se eliminan automáticamente.

## Sorteos Avanzado

Gratis con cuenta: guarda sorteos por espacio, admite varios premios y conserva ganadores elegidos por el servidor. Publicar y compartir los resultados cuesta **S/4.90 por sorteo**, mediante Yape y aprobación manual de superadmin. Sorteos Simple conserva su funcionamiento sin registro.

Consulta [la guía de Sorteos Avanzado](docs/SORTEOS_AVANZADO.md) para reglas, configuración, API, migración y pruebas. En producción deben aplicarse la migración y las variables YAPE_PHONE/YAPE_NAME antes de habilitar el servicio.

## Plataforma y espacios

La web combina herramientas de acceso directo con una base para gestionar microapps mediante cuentas y espacios de trabajo.

- Registro e inicio/cierre de sesión.
- Creación automática de un espacio personal al registrarse.
- Modelo de espacios personales y de organizaciones.
- Membresías con roles OWNER, ADMIN y MEMBER.
- Listado de espacios y módulos activos del usuario.
- Panel de superadmin con resumen y consultas de usuarios, organizaciones y módulos.

El catálogo público muestra Sorteos, Sorteos Avanzado, Mi Turno y Mi Cita. Las herramientas sin implementar se conservan como ideas futuras fuera del home. Sorteos Avanzado está disponible desde el home con cuenta y desde el espacio elegido en Mi0. La activación de otros módulos sigue siendo una función de la API.

## Estado actual

| Área | Estado |
|---|---|
| Catálogo y filtros | Implementados |
| Sorteos | Implementado; pendiente de validación de uso y revisión visual |
| Autenticación y sesiones | Implementadas; pendiente de comprobación integral con PostgreSQL |
| Core de espacios y membresías | Implementado; activación restringida a OWNER/ADMIN en espacios activos |
| Panel del usuario | Lista espacios y permite abrir Sorteos Avanzado |
| Superadmin | Consultas y aprobación/rechazo de publicaciones; concurrencia y lint corregidos |
| PWA | Pendiente; la portada la anuncia, pero aún no existe implementación |
| Despliegue y servicios externos | No verificados en la revisión local |

## Estructura y tecnologías

| Directorio | Función | Tecnologías |
|---|---|---|
| web/ | Catálogo, cuentas, panel del usuario y Sorteos | React + Vite |
| api/ | Autenticación, espacios, módulos y consultas de administración | Node.js + Express + Prisma |
| api/prisma/ | Esquema y migraciones | PostgreSQL |
| superadmin/ | Panel de administración de la plataforma | React + Vite |
| docs/ | Documentación complementaria | Markdown |

La API incluye integración y comprobación de conexión S3. PostgreSQL local está conectado y migrado. S3 queda pendiente; las dos microapps de sorteos no necesitan almacenamiento de archivos.

## Desarrollo local

Instalar dependencias desde la raíz:

```powershell
npm install
npm install --prefix web
npm install --prefix api
npm install --prefix superadmin
```

Crear los archivos de entorno de cada aplicación usando sus respectivos `.env.example`. Configurar PostgreSQL en la API y `VITE_API_URL` en ambos frontends apuntando a la API local; Vite no tiene proxy configurado para `/api`.

Con una base de datos de desarrollo configurada, aplicar las migraciones existentes:

```powershell
npm run db:migrate:deploy --prefix api
```

Iniciar la web, la API y el panel de superadmin juntos:

```powershell
npm run dev
```

Para iniciar únicamente el panel de superadmin:

```powershell
npm run dev:admin
```

El script `create:superadmin` de la API permite crear una cuenta de administración; revisar sus requisitos antes de ejecutarlo.

## Comprobaciones

```powershell
npm run lint --prefix web
npm run build --prefix web
npm run lint --prefix superadmin
npm run build --prefix superadmin
```

Ambos frontends pasan lint y compilación. Sorteos Avanzado incluye seis pruebas HTTP de integración con PostgreSQL aislado y verificación del recorrido completo en navegador, escritorio y móvil.

## Dirección del producto

La prioridad es consolidar Sorteos, observar uso real y elegir la siguiente microapp según necesidades comprobadas. Las herramientas pueden compartir identidad y permisos cuando lo necesiten; las utilidades públicas no requieren obligatoriamente una cuenta o un negocio.

Las ideas futuras incluyen generador QR, conversor de unidades, notas rápidas, extractor de texto, calculadora de fechas, generador de contraseñas, compresor de imágenes y renombrador de archivos.

Matrículas, Tarjeta de Sellos, Servicios para Huéspedes, Acuerdos, Calendario e Incidentes se conservan como ideas futuras. Matrículas dejó de ser el primer MVP; su demo previa puede servir de referencia si se retoma.

Sorteos se presenta como gratuita. Las hipótesis anteriores de S/19.90 al mes, S/199 al año y 14 días de prueba quedan como referencias por validar para futuras herramientas de pago; no son un requisito del lanzamiento de Sorteos.

## Principios

- Resolver una tarea concreta con pocos pasos.
- Activar y usar solamente lo necesario.
- Compartir funciones del Core cuando aporten valor.
- Validar una herramienta antes de construir muchas.
- Mantener una experiencia sencilla en móvil y escritorio.

Consulta [BACKLOG.md](BACKLOG.md) para conocer prioridades, criterios de aceptación y pendientes.

**Actualizado:** 7 de octubre de 2026.

## Mi Cita

Reservas públicas sin registro mediante QR, agenda y profesionales por workspace, confirmación/cancelación por el personal y DNI configurable (desactivado por defecto). Conserva los roles y el sistema visual de Mi Turno. Consulta [la guía de Mi Cita](docs/MI_CITA.md) para configuración, arquitectura, migración PostgreSQL y pruebas.
