# mi0.app

> **Pequeñas herramientas para grandes ideas.**

mi0.app es una plataforma de microapps sencillas para personas, negocios y organizaciones. Cada herramienta resuelve una tarea concreta y puede usarse de forma independiente, sin aprender un sistema grande.

**Sorteos es la primera herramienta de mi0.** Está implementada en la web como una utilidad gratuita que se usa sin registro. La prioridad actual es validar esa experiencia antes de ampliar el catálogo.

## Primera microapp: Sorteos

El usuario puede:

1. Abrir Sorteos desde el catálogo.
2. Agregar participantes separados por líneas o comas.
3. Sortear entre al menos dos entradas y ver una animación con el ganador.
4. Repetir el sorteo o limpiar la lista.

El sorteo se ejecuta en el navegador. Actualmente no guarda participantes ni resultados en la base de datos y no tiene historial. Cada entrada cuenta como una participación; los nombres repetidos no se eliminan automáticamente.

## Plataforma y espacios

La web combina herramientas de acceso directo con una base para gestionar microapps mediante cuentas y espacios de trabajo.

- Registro e inicio/cierre de sesión.
- Creación automática de un espacio personal al registrarse.
- Modelo de espacios personales y de organizaciones.
- Membresías con roles OWNER, ADMIN y MEMBER.
- Listado de espacios y módulos activos del usuario.
- Panel de superadmin con resumen y consultas de usuarios, organizaciones y módulos.

El catálogo público es estático. Sorteos es la única herramienta marcada como disponible; las demás aparecen como «Próximamente». La activación de módulos existe en la API, pero el flujo para agregarlos y abrirlos desde el panel del usuario todavía está incompleto.

## Estado actual

| Área | Estado |
|---|---|
| Catálogo y filtros | Implementados |
| Sorteos | Implementado; pendiente de validación de uso y revisión visual |
| Autenticación y sesiones | Implementadas; pendiente de comprobación integral con PostgreSQL |
| Core de espacios y membresías | Implementado; pendiente de reforzar autorización al activar módulos |
| Panel del usuario | Lista espacios y módulos; apertura de microapps pendiente |
| Superadmin | Consultas implementadas; pendientes de concurrencia y lint |
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

La API incluye integración y comprobación de conexión S3. La revisión no confirmó carga de archivos ni conectividad real con PostgreSQL/S3.

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

En la revisión del 7 de octubre de 2026, ambas compilaciones y el lint de la web pasaron. El lint de superadmin reportó dos errores de `react-hooks/set-state-in-effect`. No se encontraron pruebas automatizadas propias del proyecto.

## Dirección del producto

La prioridad es consolidar Sorteos, observar uso real y elegir la siguiente microapp según necesidades comprobadas. Las herramientas pueden compartir identidad y permisos cuando lo necesiten; las utilidades públicas no requieren obligatoriamente una cuenta o un negocio.

El catálogo contempla generador QR, conversor de unidades, notas rápidas, extractor de texto, calculadora de fechas, generador de contraseñas, compresor de imágenes y renombrador de archivos.

Matrículas, Citas, Tarjeta de Sellos, Servicios para Huéspedes, Acuerdos, Calendario e Incidentes se conservan como ideas futuras. Matrículas dejó de ser el primer MVP; su demo previa puede servir de referencia si se retoma.

Sorteos se presenta como gratuita. Las hipótesis anteriores de S/19.90 al mes, S/199 al año y 14 días de prueba quedan como referencias por validar para futuras herramientas de pago; no son un requisito del lanzamiento de Sorteos.

## Principios

- Resolver una tarea concreta con pocos pasos.
- Activar y usar solamente lo necesario.
- Compartir funciones del Core cuando aporten valor.
- Validar una herramienta antes de construir muchas.
- Mantener una experiencia sencilla en móvil y escritorio.

Consulta [BACKLOG.md](BACKLOG.md) para conocer prioridades, criterios de aceptación y pendientes.

**Actualizado:** 7 de octubre de 2026.
