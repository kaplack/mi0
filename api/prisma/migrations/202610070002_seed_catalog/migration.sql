INSERT INTO "modules" ("id", "code", "name", "description", "active", "created_at", "updated_at") VALUES
(gen_random_uuid(), 'qr-generator', 'Generador QR', 'Crea códigos QR en segundos. Texto, URLs, WiFi y más.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'unit-converter', 'Conversor de unidades', 'Convierte unidades de forma fácil y rápida.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'quick-notes', 'Notas rápidas', 'Captura y organiza tus ideas al instante.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'text-extractor', 'Extractor de texto', 'Extrae texto de imágenes en un clic.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'date-calculator', 'Calculadora de fechas', 'Suma o resta fechas fácilmente.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'password-generator', 'Generador de contraseñas', 'Crea contraseñas seguras y únicas.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'image-compressor', 'Compresor de imágenes', 'Reduce el peso de tus imágenes sin perder calidad.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'file-renamer', 'Renombrador de archivos', 'Renombra varios archivos en un clic.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
