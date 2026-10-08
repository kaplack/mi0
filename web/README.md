# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Arquitectura de mi0.app

La aplicación conserva su estructura existente:

- `src/App.jsx`: composición de pantallas, sesión y rutas mediante History API.
- `src/pages/`: home, autenticación y panel de espacios.
- `src/components/`: UI compartida, logo y tarjetas.
- `src/microapps/`: Sorteos, Sorteos Avanzado, Mi Turno y Mi Cita, cada uno con sus pantallas y estilos.
- `src/services/`: transporte HTTP y servicios por dominio; no renderiza UI.
- `src/data/`: catálogo público estático.
- `src/index.css`: tipografía y tokens globales; estilos particulares permanecen dentro de cada microapp.
- `tests/`: recorridos Playwright; la suite Mi Cita tiene configuración propia con API/DB reales.

Mi Cita mantiene lógica de datos en hooks, transporte en `services/citas.js` y helpers puros en `citaUtils.js`. Los componentes se separan por pantalla/responsabilidad y no importan lógica o estilos de Mi Turno. No se modifica la estrategia de carga existente.

Verificación: `npm run lint`, `npm run build` y `npm run test:citas:ui`. Configurar VITE_API_URL con la dirección de la API. Consulta [la guía de Mi Cita](../docs/MI_CITA.md) para rutas, roles, responsive y migración necesaria.
