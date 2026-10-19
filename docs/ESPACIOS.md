# Espacios

Una cuenta puede crear varios espacios y participar en espacios ajenos. El registro inicial conserva Mi espacio como nombre predeterminado. Los nuevos espacios reciben el nombre elegido, tipo PERSONAL y membresía OWNER del creador; el rol nunca se recibe del cliente.

Inicio muestra todos los espacios activos accesibles. Mis microapps conserva el filtro OWNER y muestra sus herramientas. En ambas vistas, Crear espacio solicita nombre; móvil presenta solo ＋ con etiqueta accesible. Solo OWNER ve lápiz/tacho en cada card. El lápiz edita el nombre inline: Enter o ✓ guarda, Escape o × cancela.

API autenticada:
- POST /api/workspaces con {name}: crea espacio y propietario atómicamente.
- PATCH /api/workspaces/:id con {name}: renombra solo para propietario activo.
- DELETE /api/workspaces/:id: elimina solo espacios vacíos y de su propietario, con confirmación en UI.

Vacío significa sin microapps incluso inactivas, sin sorteos, consultorio, cola, catálogo, productos/categorías, direcciones públicas ni otros miembros. El servidor bloquea la fila antes de comprobar y eliminar para evitar cascadas sobre datos recién agregados. No permite borrar contenido ni quitarse la propiedad desde estos endpoints.

Nombre del espacio y nombre público del negocio son independientes. El primero organiza las cards; el segundo reside en QrCatalog.name y puede editarlo el personal administrador del catálogo. Cambiar uno no modifica el otro ni sus enlaces/QR. Al crear un catálogo se sugiere el nombre del espacio, sin mantener sincronización posterior.

La migración 202610180003_workspace_names materializa los nombres visibles históricos de consultorios/colas sobre espacios que aún se llamaban Mi espacio, para retirar el fallback sin cambiar la presentación existente. Los nuevos renombrados a Mi espacio se conservan literalmente.

Verificación: npm run test:qr-catalog --prefix api cubre espacios en PostgreSQL aislado y navegador escritorio/móvil. Prueba puntual de invitaciones de Mi Cita comprueba el listado con nombre real del espacio.
