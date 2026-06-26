# Documento de Requisitos

## Introducción

El módulo de **Configuración Institucional** de EduMF permite a los administradores registrar y mantener los datos de identidad de la institución educativa: nombre, logo, dirección, teléfono y correo electrónico. Esta información se utiliza como cabecera en tres contextos de salida: plantillas Excel para importación masiva de datos, reportes PDF exportados (asistencia, incidencias, etc.) y archivos Excel exportados. El módulo es de acceso exclusivo para usuarios con rol `admin`.

---

## Glosario

- **Institution_Settings_API**: Servicio backend (Node.js/Express) que expone los endpoints para leer y actualizar la configuración institucional.
- **Institution_Settings_Page**: Página del frontend (React/TypeScript) que presenta el formulario de configuración institucional al administrador.
- **Logo_Uploader**: Componente del frontend responsable de gestionar la selección, conversión a base64 y previsualización del logo.
- **PDF_Exporter**: Módulo del frontend que genera archivos PDF usando `jsPDF` y `jspdf-autotable`.
- **Excel_Exporter**: Módulo del frontend que genera archivos Excel usando `xlsx` y `file-saver`.
- **Template_Generator**: Módulo del frontend que genera plantillas Excel para importación masiva de datos.
- **Admin**: Usuario autenticado con rol `admin` en el sistema EduMF.
- **InstitutionConfig**: Documento MongoDB que almacena los datos de configuración institucional (singleton).
- **logoBase64**: Campo de tipo `String` en el documento `InstitutionConfig` que almacena la imagen del logo codificada en base64 (incluyendo el prefijo `data:image/...;base64,...`).

---

## Requisitos

### Requisito 1: Almacenamiento de la configuración institucional

**User Story:** Como administrador, quiero guardar los datos de mi institución educativa en el sistema, para que esta información esté disponible de forma centralizada en todos los documentos generados.

#### Criterios de Aceptación

1. THE Institution_Settings_API SHALL almacenar un único documento `InstitutionConfig` por sistema (patrón singleton en MongoDB).
2. WHEN el administrador envía el formulario de configuración, THE Institution_Settings_API SHALL persistir los campos: nombre de la institución, dirección, teléfono, correo electrónico y `logoBase64`.
3. IF el documento `InstitutionConfig` no existe al momento de la primera consulta, THEN THE Institution_Settings_API SHALL retornar un objeto con todos los campos vacíos y código HTTP 200.
4. WHEN el administrador actualiza la configuración, THE Institution_Settings_API SHALL sobrescribir el documento existente y retornar el documento actualizado con código HTTP 200.
5. THE Institution_Settings_API SHALL validar que el campo nombre de la institución no esté vacío antes de persistir; IF el campo está vacío, THEN THE Institution_Settings_API SHALL retornar un error con código HTTP 400 y un mensaje descriptivo.
6. THE Institution_Settings_API SHALL validar que el correo electrónico, si se proporciona, tenga formato válido (`usuario@dominio.extensión`); IF el formato es inválido, THEN THE Institution_Settings_API SHALL retornar un error con código HTTP 400 y un mensaje descriptivo.

---

### Requisito 2: Control de acceso al módulo

**User Story:** Como administrador del sistema, quiero que solo los usuarios con rol `admin` puedan ver y modificar la configuración institucional, para proteger los datos de identidad de la institución.

#### Criterios de Aceptación

1. WHILE el usuario autenticado tiene rol `admin`, THE Institution_Settings_API SHALL permitir el acceso a los endpoints `GET /api/institution-settings` y `PUT /api/institution-settings`.
2. IF un usuario autenticado con rol distinto de `admin` intenta acceder a los endpoints de configuración institucional, THEN THE Institution_Settings_API SHALL retornar un error con código HTTP 403.
3. IF una solicitud llega a los endpoints de configuración institucional sin token de autenticación válido, THEN THE Institution_Settings_API SHALL retornar un error con código HTTP 401.
4. WHILE el usuario autenticado tiene rol `admin`, THE Institution_Settings_Page SHALL mostrar el enlace de navegación hacia el módulo de configuración institucional en el sidebar.
5. WHILE el usuario autenticado tiene rol distinto de `admin`, THE Institution_Settings_Page SHALL ocultar el enlace de navegación hacia el módulo de configuración institucional.

---

### Requisito 3: Conversión y almacenamiento del logo institucional en base64

**User Story:** Como administrador, quiero subir el logo de mi institución, para que aparezca en los documentos generados por el sistema.

#### Criterios de Aceptación

1. WHEN el administrador selecciona un archivo de imagen para el logo, THE Logo_Uploader SHALL aceptar únicamente archivos con tipo MIME `image/png`, `image/jpeg` o `image/webp`.
2. IF el administrador selecciona un archivo con tipo MIME distinto de `image/png`, `image/jpeg` o `image/webp`, THEN THE Logo_Uploader SHALL mostrar un mensaje de error indicando los formatos permitidos y rechazar el archivo.
3. IF el archivo de imagen seleccionado supera 2 MB, THEN THE Logo_Uploader SHALL mostrar un mensaje de error indicando el límite de tamaño y rechazar el archivo sin enviarlo al servidor.
4. WHEN el archivo de imagen es aceptado, THE Logo_Uploader SHALL convertir el archivo a una cadena base64 usando la API `FileReader` del navegador, incluyendo el prefijo `data:image/...;base64,...`.
5. WHEN el Logo_Uploader completa la conversión a base64, THE Institution_Settings_API SHALL almacenar la cadena base64 directamente en el campo `logoBase64` del documento `InstitutionConfig`.
6. WHEN el administrador accede a la página de configuración y existe un logo guardado, THE Logo_Uploader SHALL mostrar una previsualización del logo usando el valor de `logoBase64` como atributo `src` del elemento `<img>`.
7. WHERE el administrador no ha subido un logo, THE Institution_Settings_Page SHALL mostrar un área de carga con un ícono de marcador de posición.

---

### Requisito 4: Interfaz de usuario para la configuración institucional

**User Story:** Como administrador, quiero una página de configuración clara y consistente con el diseño del sistema, para poder actualizar los datos de la institución de forma intuitiva.

#### Criterios de Aceptación

1. THE Institution_Settings_Page SHALL presentar un formulario con los campos: nombre de la institución (texto, requerido), dirección (texto, opcional), teléfono (texto, opcional) y correo electrónico (texto, opcional).
2. WHEN el administrador accede a la página de configuración, THE Institution_Settings_Page SHALL cargar y mostrar los valores actuales de la configuración institucional obtenidos desde la Institution_Settings_API.
3. WHEN la Institution_Settings_Page está cargando los datos iniciales, THE Institution_Settings_Page SHALL mostrar un indicador de carga visible.
4. WHEN el administrador guarda la configuración exitosamente, THE Institution_Settings_Page SHALL mostrar una notificación de éxito usando el sistema de notificaciones existente (`sonner`).
5. IF la Institution_Settings_API retorna un error al guardar, THEN THE Institution_Settings_Page SHALL mostrar una notificación de error con el mensaje recibido del servidor.
6. THE Institution_Settings_Page SHALL aplicar el design system de EduMF: tarjetas con `rounded-2xl`, `border border-gray-100`, `shadow-sm`, botón primario con color `#538f65`.

---

### Requisito 5: Inclusión del encabezado institucional en plantillas Excel de importación

**User Story:** Como administrador, quiero que las plantillas Excel para importación de datos incluyan el nombre y logo de la institución, para que los documentos sean identificables y profesionales.

#### Criterios de Aceptación

1. WHEN el Template_Generator produce una plantilla Excel, THE Template_Generator SHALL incluir el nombre de la institución en la celda de encabezado de la plantilla (fila 1).
2. WHERE el campo `logoBase64` está configurado en el sistema, THE Template_Generator SHALL insertar la imagen del logo en la hoja de la plantilla Excel en la esquina superior izquierda, usando el string base64 directamente.
3. WHERE el campo `logoBase64` no está configurado, THE Template_Generator SHALL generar la plantilla Excel sin imagen de logo, manteniendo el resto del encabezado.
4. WHEN el Template_Generator obtiene los datos institucionales, THE Template_Generator SHALL consultar la Institution_Settings_API antes de generar el archivo.

---

### Requisito 6: Inclusión del encabezado institucional en reportes PDF exportados

**User Story:** Como administrador, quiero que los reportes PDF exportados incluyan el nombre y logo de la institución en el encabezado, para que los documentos sean formales e identificables.

#### Criterios de Aceptación

1. WHEN el PDF_Exporter genera un reporte PDF, THE PDF_Exporter SHALL incluir el nombre de la institución en el encabezado del documento, en la parte superior de la primera página.
2. WHERE el campo `logoBase64` está configurado en el sistema, THE PDF_Exporter SHALL insertar la imagen del logo en el encabezado del PDF usando el string base64 directamente con `jsPDF`, alineada a la izquierda del nombre de la institución.
3. WHERE el campo `logoBase64` no está configurado, THE PDF_Exporter SHALL generar el PDF sin imagen de logo, mostrando únicamente el nombre de la institución en el encabezado.
4. WHEN el PDF_Exporter obtiene los datos institucionales, THE PDF_Exporter SHALL consultar la Institution_Settings_API antes de generar el archivo.
5. THE PDF_Exporter SHALL aplicar el encabezado institucional a todos los tipos de reporte PDF existentes en el sistema (reportes de asistencia mensual y cualquier reporte futuro).

---

### Requisito 7: Inclusión del encabezado institucional en archivos Excel exportados

**User Story:** Como administrador, quiero que los archivos Excel exportados incluyan el nombre de la institución en el encabezado, para que los documentos sean identificables.

#### Criterios de Aceptación

1. WHEN el Excel_Exporter genera un archivo Excel, THE Excel_Exporter SHALL incluir el nombre de la institución en la primera fila de la hoja principal del archivo.
2. WHERE el campo `logoBase64` está configurado en el sistema, THE Excel_Exporter SHALL insertar la imagen del logo en la hoja principal del archivo Excel exportado usando el string base64 directamente.
3. WHERE el campo `logoBase64` no está configurado, THE Excel_Exporter SHALL generar el archivo Excel sin imagen de logo, mostrando únicamente el nombre de la institución.
4. WHEN el Excel_Exporter obtiene los datos institucionales, THE Excel_Exporter SHALL consultar la Institution_Settings_API antes de generar el archivo.

---

### Requisito 8: Disponibilidad y consistencia de los datos institucionales en el frontend

**User Story:** Como desarrollador del sistema, quiero que los datos de configuración institucional estén disponibles de forma centralizada en el frontend, para evitar múltiples llamadas redundantes a la API en cada exportación.

#### Criterios de Aceptación

1. THE Institution_Settings_Page SHALL exponer los datos de configuración institucional a través de un servicio o contexto reutilizable en el frontend.
2. WHEN cualquier módulo del frontend requiere los datos institucionales para una exportación, THE Institution_Settings_Page SHALL proveer los datos desde una caché local o llamada única a la Institution_Settings_API, evitando llamadas duplicadas en la misma sesión.
3. WHEN el administrador actualiza la configuración institucional, THE Institution_Settings_Page SHALL invalidar la caché local de datos institucionales para que las exportaciones posteriores usen los datos actualizados.
