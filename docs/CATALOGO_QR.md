# Catálogo QR

Una microapp independiente por espacio. OWNER y ADMIN administran; clientes consultan el catálogo publicado sin cuenta. MEMBER y otros espacios no pueden gestionarlo.

## Uso local

Abrir `/catalogo-qr` y elegir espacio, o agregar Catálogo QR desde Explorar microapps. Guardar Mi negocio, cargar categorías y productos, activar Publicar catálogo y descargar el QR en Compartir. El enlace principal es `/[dirección-del-espacio]/catalogo`, por ejemplo `/cosanostra/catalogo`. La dirección se sugiere desde el nombre del espacio y se puede elegir al crear el catálogo; es única y admite minúsculas, números y guiones (3–60 caracteres). El propietario puede editarla posteriormente; las direcciones anteriores se reservan como alias del mismo espacio para proteger enlaces y QR. Cambiar el nombre visible del negocio no cambia esa dirección. El enlace anterior `/catalogo/:code` también sigue válido al editar o despublicar. En localhost el QR apunta a esta computadora; para escanear con otro dispositivo se necesita una dirección de red accesible desde ese dispositivo.

- Productos: nombre, descripción, precio en centavos, categoría opcional, orden y estado Disponible/Agotado/Oculto. Los ocultos y sus imágenes no son públicos.
- Negocio: nombre, descripción, logo reemplazable, moneda PEN/USD/EUR, WhatsApp con código de país y hasta ocho enlaces HTTPS de redes sociales.
- Categorías: creación, edición, orden y eliminación sin borrar productos.
- Cliente: búsqueda, filtro por categoría, detalle de producto, fotos y consulta por WhatsApp. No hay carrito, pedidos ni delivery.

## Planes

FREE: hasta 30 productos (incluidos ocultos y agotados) y una foto por producto. PRO permite cinco fotos; la asignación del plan es exclusiva del servidor. No existe compra/activación de pago porque precio, cobro y límite ampliado todavía no fueron acordados. Ambos planes conservan 30 productos hasta definir ese límite. No se aceptan cambios de plan desde el navegador.

## Arquitectura y privacidad

`api/qr-catalog/` separa validación y servicio; `api/routes/qr-catalog.js` adapta HTTP. Productos y categorías pertenecen al workspace, separados de la presentación QrCatalog. No dependen de Pedidos ni Delivery. Migración aditiva `202610170006_qr_catalog` registra la microapp y su categoría Negocios. `202610170007_workspace_public_slug` agrega una dirección única al espacio y asigna direcciones legibles a los catálogos existentes, resolviendo duplicados. Esa identidad pertenece al espacio y puede servir a futuras microapps.

API privada `/api/qr-catalog/:workspaceId`: GET/PUT de catálogo, POST/PUT/DELETE de categorías/productos, POST de logo/fotos y DELETE de imágenes/logo. API pública `/api/qr-catalog/by-space/:slug` y compatibilidad `/api/qr-catalog/public/:code`: solo catálogos publicados de espacios activos, sin claves de storage, workspace ni plan.

Fotos PNG/JPEG/WebP de hasta 5 MB mediante cuerpos binarios; almacenamiento privado local existente (uploads/private) y endpoints con comprobación de publicación/estado. Previews con token solo para administradores; no se publican archivos por URL estática. Reemplazar/borrar logo o borrar producto retira los archivos anteriores. Operaciones de escritura bloquean la fila workspace para proteger límites concurrentes. Borrar categoría conserva los productos sin categoría; los precios no usan flotantes en PostgreSQL.

Frontend en `web/src/microapps/catalogo-qr/`, transporte en `web/src/services/qrCatalog.js`, estado remoto en useQrCatalog, editor de producto en diálogo, navegación Productos/Mi negocio/Compartir. Comparte tokens visuales y QRCode del proyecto.

## Verificación

`npm run test:qr-catalog --prefix api` requiere PostgreSQL localhost y Chrome instalado. Usa un schema aleatorio y almacenamiento temporal, aplica el historial completo de migraciones y limpia solo sus propios recursos. Comprueba permisos, validación, privacidad de imágenes, límites concurrentes y recorrido de navegador de escritorio y móvil; capturas en web/test-results/qr-catalog. No crea datos de ejemplo en los espacios reales del usuario.

## Carta o Catálogo y nombre único
En Mi negocio, Mostrar como selecciona Carta (MENU) o Catálogo (CATALOG). Cambian título, búsqueda pública, compartir y ruta preferida /:slug/carta o /:slug/catalogo. Ambas rutas permanecen activas para preservar QR impresos; /catalogo/:code también continúa válido. No se duplican productos ni categorías.

Workspace.name organiza el espacio y QrCatalog.name presenta el negocio públicamente; son independientes. Nombre del negocio modifica solamente el catálogo, también para administradores. El propietario renombra el espacio desde el lápiz en la card. Ninguna de esas acciones cambia publicSlug. La sugerencia de dirección para un catálogo nuevo sigue el nombre elegido hasta que se edite manualmente o guarde.

Migración 202610180001_catalog_presentation agrega presentación con restricción y sincroniza nombres históricos; si el espacio todavía tenía Mi espacio pero el catálogo ya tenía nombre público, se conserva ese nombre. No modifica direcciones existentes.

## Cambio explícito del enlace
Enlace de tu negocio es editable por OWNER. WorkspacePublicAddress registra todas las direcciones reservadas (actuales e históricas), con slug como clave única global; ninguna puede asignarse a otro workspace. La migración 202610180002_workspace_address_aliases registra las direcciones existentes. Guardar cambia Workspace.publicSlug para los enlaces/QR nuevos y conserva los antiguos como alias. La resolución pública consulta este registro y mantiene las comprobaciones de publicación y espacio activo; ambas terminaciones /carta y /catalogo siguen disponibles. Renombrar el negocio no cambia el enlace automáticamente.

Gestión de espacios: ver [Espacios](ESPACIOS.md). La separación de nombres sustituye la sincronización introducida inicialmente.

## Formulario y confirmación al publicar
Formulario organizado en Tu negocio (nombre, logo con vista previa, descripción), Tu enlace y QR (Carta/Catálogo y dirección completa destacada), Moneda, Contacto y redes. Logo seleccionable desde el primer guardado; se persiste al guardar/publicar.

Guardar borrador conserva contenido privado. Publicar pide confirmación del enlace y activa el acceso público. Guardar cambios actualiza contenido ya publicado; Retirar de publicación oculta el contenido sin liberar la dirección ni quitar el bloqueo. La primera publicación establece linkLocked permanentemente. Migración 202610180004_catalog_link_publication marca como bloqueados los catálogos que ya estaban publicados. Esta regla sustituye la edición libre del enlace anteriormente implementada.

Después de publicar, OWNER envía nuevo enlace y motivo desde Solicitar cambio de enlace al administrador. Solo una solicitud pendiente por espacio. Superadmin → Microapps → Catálogo QR → Solicitudes de enlace permite aprobar/rechazar; al aprobar se reserva el nuevo enlace y se conservan alias anteriores. Los permisos y el bloqueo se aplican en servidor. No se enviaron mensajes externos ni notificaciones automáticas.

Incremento aplicado en localhost sin ejecutar pruebas por petición del usuario. Las pruebas históricas aún usan el formulario y la política anteriores; necesitan adaptarse si el usuario vuelve a autorizar su mantenimiento/ejecución.

## Navegación centrada en el negocio
Administración con identidad del negocio (logo/nombre y Carta QR o Catálogo QR). Escritorio: sidebar colapsable con espacio y rol como contexto, Volver a mi0 al pie. Móvil: encabezado compacto con regreso a mi0 y barra fija inferior Productos, Categorías, Mi negocio y QR; reserva safe-area y evita tapar contenido. Se oculta la barra cuando visualViewport indica teclado abierto.

Categorías tiene sección propia con nombre, orden, cantidad de productos y eliminación sin borrar productos. Rutas /catalogo-qr/:workspaceId/productos, /categorias, /negocio y /qr; la ruta antigua sin sección conserva acceso. Formularios permanecen montados al navegar para mantener datos no guardados. Cambios frontend únicamente, sin pruebas por petición del usuario.

## Foto de portada y WhatsApp
Mi negocio permite seleccionar una portada horizontal opcional, previsualizarla y marcarla para retirar/deshacer; se sube solo al guardar. PNG/JPEG/WebP hasta 5 MB, almacenamiento privado local/S3 reutilizado, endpoints de lectura condicionados a publicación o permisos de administración. Al reemplazarla se intenta retirar el archivo anterior; reintentos fiables siguen pendientes en backlog.

Portada pública encima de la identidad, con recorte centrado adaptable a móvil/escritorio. Sin portada se conserva el encabezado anterior. WhatsApp muestra icono y texto en escritorio, solo icono con nombre accesible en móvil; contacto general y detalle de producto conservan sus enlaces. Migración aditiva 202610190001_catalog_banner. Sin pruebas por petición del usuario.


## Navegación pública móvil y redes sociales
En móvil, barra fija Buscar, Categorías y WhatsApp. Buscar abre un campo superior con foco; Categorías abre un panel inferior. Se retiran el buscador y chips permanentes solo en móvil, manteniendo filtros activos limpiables.

Las redes aparecen dentro del banner, debajo de la descripción, como iconos accesibles. Mi negocio permite elegir Instagram, Facebook, TikTok, YouTube, X o Sitio web e ingresar usuario o enlace. La API genera enlaces HTTPS y valida el dominio de la plataforma. Los enlaces históricos se adaptan al editar. Sin pruebas por instrucción del usuario.


## Publicación 19/10/2026
Vercel incluye rewrites para rutas de administración y enlaces públicos /:slug/catalogo y /:slug/carta. El despliegue de API debe ejecutar `npm run db:migrate:deploy` y `npm run db:generate` desde api antes de iniciar la nueva versión. Incluye las siete migraciones del catálogo y espacios, hasta 202610190001_catalog_banner. Producción requiere el storage S3 y CORS configurados según api/.env.example. No se ejecutaron pruebas por instrucción del usuario; el push no confirma aplicación de migraciones ni despliegue de servicios.
