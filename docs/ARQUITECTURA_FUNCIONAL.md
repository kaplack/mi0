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

La plataforma deberá registrar qué microapps ha agregado cada usuario a su espacio.

Modelo conceptual:

```text
USER
  │
  └── USER_APPS
      ├── incidentes
      ├── agenda
      └── tareas
```

Esto permitirá personalizar Mi0 sin duplicar las aplicaciones.

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

## 12. Documentos relacionados

A medida que avance el proyecto, esta arquitectura funcional se complementará con:

- Arquitectura técnica.
- Modelo de datos.
- Lineamientos UX/UI.
- Especificaciones funcionales de cada microapp.
- Backlog del proyecto.

Este documento debe actualizarse cuando cambie una decisión funcional estructural de mi0.app.
