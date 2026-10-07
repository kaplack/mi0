# Arquitectura funcional de mi0.app

**Estado:** Documento vivo  
**Fecha:** 29 de septiembre de 2026

## 1. Propósito

mi0.app será una plataforma de **microapps**: herramientas pequeñas, concretas y rápidas para resolver necesidades específicas sin obligar al usuario a utilizar un sistema grande o complejo.

La experiencia debe priorizar el acceso inmediato a las herramientas. El catálogo de microapps es el protagonista del producto.

## 2. Home y catálogo

El Home tendrá:

- Un **hero compacto**, sin ocupar innecesariamente la primera pantalla.
- Una explicación breve de qué son las microapps y qué ofrece mi0.app.
- Las **cards de las microapps** disponibles inmediatamente después del hero.
- Cada card podrá mostrar nombre, icono, descripción breve, categoría y acciones disponibles.

A medida que crezca el catálogo se podrán incorporar búsqueda, filtros y categorías.

## 3. Formas de usar una microapp

Una misma microapp podrá ofrecer hasta tres formas de uso:

### 3.1 Uso directo online

El usuario podrá abrir una microapp desde mi0.app y utilizarla directamente en el navegador, sin necesidad de instalarla.

Ejemplo:

```text
mi0.app/apps/incidentes
```

### 3.2 Agregar a Mi0

El usuario podrá seleccionar **“Agregar a Mi0”** para incorporar la microapp como un módulo de su espacio personal.

Ejemplo:

```text
Mi0
├── Incidentes
├── Tareas
└── Agenda
```

De esta forma, el usuario construye su propia aplicación/espacio con únicamente las herramientas que necesita.

### 3.3 Instalar como microapp independiente

Cuando una herramienta esté habilitada como instalable, el usuario podrá instalarla como una **PWA independiente** en su dispositivo.

Ejemplo:

```text
📱 Incidentes
📱 Tareas
📱 Agenda
```

Cada microapp instalada podrá abrir directamente su herramienta, con su propio nombre, icono y experiencia de aplicación.

## 4. Las modalidades no son excluyentes

Esta es una decisión funcional central del producto:

> Una microapp puede utilizarse directamente desde la web, agregarse como módulo al espacio personal Mi0 o instalarse de manera independiente en el dispositivo. Estas modalidades no son excluyentes.

Por ejemplo, un usuario puede tener seis herramientas agregadas dentro de Mi0 y, al mismo tiempo, instalar **Incidentes** de manera independiente porque la utiliza con mucha frecuencia.

## 5. Mi0 como espacio personal

Mi0 será el espacio donde cada usuario organiza las microapps que ha decidido incorporar.

Conceptualmente:

```text
mi0.app
│
├── Explorar
│   ├── Incidentes
│   ├── Agenda
│   ├── Tareas
│   └── ...
│
└── Mi0
    ├── Incidentes
    ├── Agenda
    └── Inventario
```

La plataforma no obliga al usuario a cargar funciones que no necesita: cada persona configura su espacio seleccionando sus propias microapps.

## 6. Instalación y funcionamiento offline

**Instalable** y **offline** son capacidades diferentes.

Una microapp puede:

- funcionar online desde el navegador;
- ser instalable como PWA y seguir requiriendo Internet;
- o incorporar posteriormente funcionamiento offline y sincronización.

Para la primera versión se priorizarán microapps **online e instalables**. El soporte offline se añadirá únicamente en aquellas herramientas donde aporte valor suficiente para justificar la sincronización y almacenamiento local.

## 7. Administración

mi0.app tendrá un **Admin separado**, destinado inicialmente al propietario/administrador de la plataforma.

El Admin permitirá como mínimo:

- Dashboard.
- Gestión de microapps.
- Gestión de usuarios.
- Publicar, ocultar o mantener una microapp como borrador.
- Definir nombre, descripción, icono, categoría y ruta.
- Indicar si una microapp es instalable.
- Incorporar métricas y otras capacidades posteriormente.

La intención es que el catálogo del Home sea administrable y no dependa de cards escritas manualmente en el frontend.

## 8. Arquitectura general prevista

El proyecto utilizará **PERN + Vite**:

- **PostgreSQL** para persistencia.
- **Express** y **Node.js** para la API.
- **React + Vite** para la web.
- **React + Vite** para el Admin.

Estructura conceptual:

```text
mi0/
│
├── web/
│   ├── home/
│   ├── auth/
│   ├── mi0/
│   ├── apps/
│   │   ├── incidentes/
│   │   ├── agenda/
│   │   ├── tareas/
│   │   └── ...
│   └── shared/
│
├── admin/
│
└── api/
    ├── auth/
    ├── users/
    ├── apps/
    ├── incidentes/
    ├── agenda/
    └── ...
```

Las microapps serán **módulos dentro del ecosistema mi0**, en lugar de proyectos completamente independientes. Esto permitirá reutilizar autenticación, usuarios, permisos, componentes, archivos y otros servicios comunes.

## 9. Relación usuario–microapps

Una microapp **no necesita estar agregada a Mi0 para poder utilizarse**. Cuando su naturaleza lo permita, el visitante podrá abrirla directamente desde el Home y usarla sin cuenta.

Cuando un usuario decida conservar una microapp en Mi0, la relación se registra en su espacio mediante `WorkspaceModule`.

Modelo conceptual:

```text
VISITANTE
  └── abre microapp → usa sin persistencia

USER
  └── WORKSPACE
      └── WORKSPACE_MODULES
          ├── sorteos
          ├── agenda
          └── ...
```

Agregar una microapp a Mi0 aporta persistencia y acceso recurrente; no debe convertirse en un requisito artificial para probar una herramienta.

## 10. Consideraciones PWA

La arquitectura deberá contemplar desde el inicio que distintas microapps puedan instalarse individualmente.

Esto implica diseñar correctamente:

- manifests;
- iconos;
- rutas;
- scopes;
- service workers;
- comportamiento de instalación.

La implementación técnica concreta se definirá en el documento de arquitectura técnica antes de desarrollar esta capacidad.

## 11. Principio de producto

La idea central puede resumirse así:

> **No instalas una plataforma llena de cosas que no necesitas. Construyes tu propia app con las microapps que necesitas.**

Este principio debe guiar las decisiones de UX, arquitectura y crecimiento del catálogo.



## 12. Usuarios, espacios y casos de uso

La cuenta de mi0.app representa siempre a una **persona**. La cuenta no implica que el usuario tenga una empresa ni que pertenezca obligatoriamente a una organización.

Los espacios permiten separar el uso personal de las relaciones con empresas, equipos, proyectos u otras organizaciones.

### 12.1 Uso personal

Una persona puede crear su cuenta y utilizar microapps dentro de su propio espacio sin estar relacionada con ninguna empresa.

Ejemplo:

```text
Rafael
└── Mi espacio
    ├── Notas
    ├── Sorteos
    └── Agenda
```

### 12.2 Propietario o administrador de un espacio

Una persona puede crear y administrar un espacio para un negocio, empresa, equipo, proyecto u organización y agregar las microapps que necesite.

Ejemplo:

```text
Alan
└── Cosa Nostra
    ├── Asistencia
    ├── Fidelización
    └── Menú QR
```

### 12.3 Trabajador o miembro invitado

Una organización puede invitar a una persona a su espacio para utilizar una microapp, por ejemplo **Asistencia**.

El usuario no necesita crear otra cuenta ni convertir su espacio personal en un espacio empresarial. Acepta la invitación con su cuenta mi0 existente y obtiene el acceso correspondiente.

Ejemplo:

```text
Empresa ABC
└── Asistencia
    └── Rafael (invitado)
```

### 12.4 Una persona puede participar en varios espacios

Una misma cuenta puede mantener su espacio personal y pertenecer simultáneamente a uno o varios espacios de terceros.

Ejemplo:

```text
Rafael
├── Mi espacio
│   ├── Agenda
│   └── Sorteos
├── Empresa ABC
│   └── Asistencia
└── Proyecto XYZ
    └── Seguimiento
```

Los datos y permisos de cada espacio deben permanecer separados.

### 12.5 Acceso revocable

El propietario o administrador de un espacio puede retirar el acceso de un miembro.

Al perder el acceso a una organización, la persona conserva:

- su cuenta mi0;
- su espacio personal;
- sus microapps personales;
- el acceso a otros espacios a los que siga perteneciendo.

### 12.6 Microapps que no requieren una organización

No todas las microapps deben exigir un espacio empresarial u organizacional.

Las herramientas personales podrán utilizarse directamente desde el espacio del usuario. Las microapps colaborativas u operativas, como Asistencia, podrán utilizar espacios compartidos cuando su funcionamiento lo requiera.

La creación o selección de una organización debe solicitarse **solo cuando sea necesaria para obtener valor de una microapp**, evitando pasos obligatorios durante el registro.

### 12.7 Modelo funcional previsto

La relación conceptual será:

```text
USER
  │
  ├── WORKSPACE (personal)
  │
  └── MEMBERSHIP ── WORKSPACE (organización)
                         │
                         └── WORKSPACE_MODULES
```

Conceptos:

- **User:** identidad de la persona.
- **Workspace:** espacio personal, negocio, empresa, equipo, proyecto u organización.
- **Membership:** relación entre una persona y un espacio, incluyendo su rol cuando sea necesario.
- **WorkspaceModule:** microapps disponibles dentro de un espacio.

No se vinculará directamente un usuario a un único negocio, porque una persona puede utilizar mi0 de forma personal y pertenecer a varias organizaciones.

Los permisos específicos por microapp se incorporarán únicamente cuando exista un caso real que los necesite. Por ejemplo, una empresa podría dar acceso a un trabajador solo a Asistencia. Esta capacidad no debe añadirse anticipadamente si todavía no es necesaria.

## 13. Principio de simplicidad aplicado a los espacios

La existencia de Workspaces y Memberships es una capacidad interna del producto y no debe traducirse en complejidad para el usuario.

Principios de UX:

- Registrarse crea una identidad personal, no obliga a crear una empresa.
- El usuario puede comenzar a usar microapps personales inmediatamente.
- Crear un espacio organizacional se solicita solo cuando hace falta.
- Un trabajador debería poder incorporarse mediante una invitación directa.
- Aceptar una invitación debe requerir la menor cantidad posible de pasos.
- El usuario debe distinguir claramente su espacio personal de los espacios de terceros.
- La arquitectura debe soportar múltiples espacios sin convertir la navegación cotidiana en un selector complejo.

> **mi0 pertenece a la persona. Los espacios organizan el contexto en el que utiliza sus microapps.**

## 14. Modelo de acceso: usar primero, guardar después

mi0.app adopta como principio de producto:

> **Usar primero. Guardar después.**

Siempre que la naturaleza de una microapp lo permita, el visitante podrá probarla y resolver la necesidad principal **sin registrarse, sin agregarla previamente a Mi0 y sin configurar un espacio**.

Flujo principal:

```text
Home → Microapp → Usar
```

Si el usuario necesita conservar información o reutilizar la herramienta:

```text
Microapp → Agregar a Mi0 → Persistencia
```

### 14.1 Home como exploración

El Home es el catálogo público de microapps. Por ello, no es necesario duplicar inicialmente un segundo catálogo de “Explorar” dentro de la consola.

Las cards del Home deben priorizar una acción clara: **Abrir**.

### 14.2 Uso sin cuenta

Una microapp pública debe resolver realmente su función principal. Las limitaciones para visitantes pueden existir cuando tengan sentido técnico o comercial, especialmente en capacidades que requieren identidad o persistencia.

No se deben introducir limitaciones artificiales únicamente para forzar el registro.

Ejemplos de capacidades que pueden requerir Mi0:

- guardar datos;
- recuperar información en otra sesión o dispositivo;
- historial;
- listas reutilizables;
- colaboración;
- personalización persistente.

### 14.3 Qué representa Mi0

Mi0 no es un requisito para utilizar las herramientas públicas. Es el lugar donde el usuario conserva las microapps y datos que quiere mantener.

La experiencia cotidiana debe ser simple:

```text
Sin cuenta: Home → Abrir → Usar
Con Mi0:    Mis microapps → Abrir → Usar con persistencia
```

### 14.4 Workspace como infraestructura silenciosa

`Workspace`, `Membership` y `WorkspaceModule` se mantienen porque permiten propiedad de datos, organizaciones y colaboración futura.

Sin embargo, estos conceptos no deben imponerse al usuario si no necesita conocerlos. “Mi espacio” puede mostrarse de forma discreta y la administración avanzada de espacios se incorporará únicamente cuando exista un caso real.

La complejidad necesaria puede existir en la arquitectura sin convertirse en complejidad de uso.

### 14.5 Primera microapp de referencia: Sorteos

**Sorteos** será la primera microapp utilizada para validar este modelo.

Primera versión prevista:

- acceso desde el Home;
- uso gratuito;
- sin registro obligatorio;
- ingreso de participantes;
- ejecución del sorteo;
- sin persistencia para visitantes.

Al agregarla a Mi0 podrán incorporarse posteriormente funciones persistentes como guardar listas, reutilizarlas o consultar historial. Estas capacidades se añadirán solo si aportan valor real.

Sorteos servirá para validar el ciclo completo:

```text
descubrir → abrir → usar → agregar a Mi0 → guardar → volver a usar
```

### 14.6 Lo que no construiremos todavía

Para mantener la simplicidad, no se implementarán anticipadamente:

- planes complejos;
- permisos por microapp sin un caso real;
- administración avanzada de espacios;
- un catálogo duplicado dentro de la consola;
- límites artificiales para obligar al registro;
- funciones de persistencia que una microapp todavía no necesite.

Cada capacidad se incorporará cuando resuelva una necesidad comprobada.

## 15. Documentos relacionados

A medida que avance el proyecto, esta arquitectura funcional se complementará con:

- Arquitectura técnica.
- Modelo de datos.
- Lineamientos UX/UI.
- Especificaciones funcionales de cada microapp.
- Backlog del proyecto.

Este documento debe actualizarse cuando cambie una decisión funcional estructural de mi0.app.
