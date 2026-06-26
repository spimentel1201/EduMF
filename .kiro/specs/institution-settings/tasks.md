# Plan de Implementación: institution-settings

## Resumen

Implementar el módulo de Configuración Institucional de EduMF en orden backend-first, luego capa de datos y hooks del frontend, seguido de la UI, y finalmente la integración del encabezado institucional en los documentos exportados.

## Tareas

- [x] 1. Modelo Mongoose `InstitutionConfig`
  - Crear `backend/src/models/InstitutionConfig.ts` con la interfaz `IInstitutionConfig` y el esquema Mongoose.
  - Campos: `name` (String, required, trim), `address` (String, trim, default ''), `phone` (String, trim, default ''), `email` (String, trim, lowercase, match regex, default ''), `logoBase64` (String, default ''), `timestamps: true`.
  - Agregar `toJSON` transform para exponer `id` en lugar de `_id` (mismo patrón que `Staff.ts`).
  - _Requisitos: 1.1, 1.2, 1.5, 1.6_

- [x] 2. Controlador y rutas del backend
  - [x] 2.1 Crear `backend/src/controllers/institutionSettingsController.ts`
    - Implementar `getSettings`: usa `InstitutionConfig.findOne({})` y retorna el documento o un objeto vacío con HTTP 200 si no existe (Req. 1.3).
    - Implementar `updateSettings`: usa `findOneAndUpdate({}, { $set: data }, { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true })` y retorna el documento actualizado con HTTP 200 (Req. 1.4).
    - Envolver ambas funciones en `try/catch` con `next(error)` para delegar al `errorHandler` global.
    - _Requisitos: 1.3, 1.4_

  - [x] 2.2 Crear `backend/src/routes/institutionSettingsRoutes.ts`
    - Definir `GET /` → `protect` → `authorize('admin')` → `getSettings`.
    - Definir `PUT /` → `protect` → `authorize('admin')` → validaciones `express-validator` → `updateSettings`.
    - Validaciones con `express-validator`: `name` no vacío ni solo espacios en blanco (Req. 1.5); `email` con formato válido si se proporciona (Req. 1.6).
    - _Requisitos: 1.5, 1.6, 2.1, 2.2, 2.3_

  - [x] 2.3 Registrar las rutas en `backend/src/server.ts`
    - Agregar `import institutionSettingsRoutes from './routes/institutionSettingsRoutes'`.
    - Agregar `app.use('/api/institution-settings', institutionSettingsRoutes)` junto al bloque de rutas existente.
    - _Requisitos: 2.1_

  - [ ]* 2.4 Escribir test de propiedad: round-trip de persistencia (Propiedad 1)
    - **Propiedad 1: Round-trip de persistencia de configuración**
    - Usar `fast-check` para generar objetos `InstitutionSettings` válidos (name no vacío, email válido o vacío).
    - Acción: PUT → GET; aserción: todos los campos del GET coinciden con los del PUT.
    - Tag: `Feature: institution-settings, Property 1: Round-trip de persistencia de configuración`
    - **Valida: Requisitos 1.2, 1.4, 3.5**

  - [ ]* 2.5 Escribir test de propiedad: rechazo de nombre vacío (Propiedad 2)
    - **Propiedad 2: Rechazo de nombre vacío o solo espacios en blanco**
    - Usar `fast-check` con `fc.stringOf(fc.constantFrom(' ', '\t', '\n'))` para generar el campo `name`.
    - Aserción: respuesta HTTP 400 y documento en BD no modificado.
    - Tag: `Feature: institution-settings, Property 2: Rechazo de nombre vacío o solo espacios en blanco`
    - **Valida: Requisito 1.5**

  - [ ]* 2.6 Escribir test de propiedad: rechazo de email inválido (Propiedad 3)
    - **Propiedad 3: Rechazo de correo electrónico con formato inválido**
    - Usar `fast-check` para generar strings que no coincidan con `/^\S+@\S+\.\S+$/`.
    - Aserción: respuesta HTTP 400.
    - Tag: `Feature: institution-settings, Property 3: Rechazo de correo electrónico con formato inválido`
    - **Valida: Requisito 1.6**

  - [ ]* 2.7 Escribir test de propiedad: control de acceso por rol (Propiedad 4)
    - **Propiedad 4: Control de acceso por rol**
    - Usar `fast-check` con `fc.constantFrom('teacher', 'student')` para generar el rol del usuario.
    - Aserción: HTTP 403 para GET y PUT con token de rol no-admin.
    - Tag: `Feature: institution-settings, Property 4: Control de acceso por rol`
    - **Valida: Requisito 2.2**

- [x] 3. Checkpoint — Backend completo
  - Verificar que `GET /api/institution-settings` retorna HTTP 200 con objeto vacío cuando no hay documento.
  - Verificar que `PUT /api/institution-settings` con token admin persiste y retorna el documento.
  - Verificar que acceso sin token retorna 401 y con rol no-admin retorna 403.
  - Asegurarse de que todos los tests pasen; consultar al usuario si surgen dudas.

- [x] 4. Tipo TypeScript e `institutionSettingsService` (frontend)
  - Crear `src/types/institution.ts` con las interfaces `InstitutionSettings` y `InstitutionSettingsResponse`.
  - Crear `src/services/institutionSettingsService.ts` usando la instancia `api` de `src/services/api.ts`.
    - `getSettings()`: `GET /institution-settings` → retorna `InstitutionSettings`.
    - `updateSettings(data)`: `PUT /institution-settings` → retorna `InstitutionSettings`.
  - _Requisitos: 8.1_

- [x] 5. Hook `useInstitutionSettings` (TanStack Query)
  - Crear `src/hooks/useInstitutionSettings.ts`.
  - `useInstitutionSettings()`: query con `queryKey: ['institutionSettings']`, `staleTime: 5 * 60 * 1000`, `gcTime: 10 * 60 * 1000`.
  - `useUpdateInstitutionSettings()`: mutación que llama a `updateSettings` y en `onSuccess` ejecuta `queryClient.invalidateQueries({ queryKey: ['institutionSettings'] })`.
  - _Requisitos: 8.1, 8.2, 8.3_

  - [ ]* 5.1 Escribir test de propiedad: formulario muestra valores cargados (Propiedad 7)
    - **Propiedad 7: El formulario muestra los valores cargados**
    - Usar `fast-check` para generar objetos `InstitutionSettings` con campos aleatorios.
    - Renderizar `InstitutionSettingsPage` con la respuesta mockeada; aserción: cada campo del formulario muestra el valor correspondiente.
    - Tag: `Feature: institution-settings, Property 7: El formulario muestra los valores cargados`
    - **Valida: Requisito 4.2**

- [x] 6. Helper `institutionHeader.ts`
  - Crear `src/utils/institutionHeader.ts` con dos funciones exportadas:
    - `addInstitutionHeaderToPDF(doc: jsPDF, settings: InstitutionSettings | undefined, reportTitle: string): number`
      - Si `settings?.logoBase64` existe, insertar imagen con `doc.addImage(...)` alineada a la izquierda.
      - Escribir `settings?.name` (o cadena vacía si undefined) como texto de encabezado.
      - Retornar el valor Y donde debe comenzar el contenido del reporte.
      - Si `settings` es undefined, retornar la posición Y inicial sin modificar el documento (degradación elegante).
    - `addInstitutionHeaderToSheet(ws: XLSX.WorkSheet, settings: InstitutionSettings | undefined): number`
      - Insertar el nombre institucional en la primera fila de la hoja.
      - Si `settings?.logoBase64` existe, insertar la imagen usando el string base64 directamente.
      - Retornar el número de fila donde debe comenzar el contenido.
      - Si `settings` es undefined, retornar 0 sin modificar la hoja.
  - _Requisitos: 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3_

  - [ ]* 6.1 Escribir test de propiedad: documentos incluyen nombre institucional (Propiedad 8)
    - **Propiedad 8: Los documentos generados incluyen el nombre institucional en el encabezado**
    - Usar `fast-check` para generar nombres de institución no vacíos.
    - Aserción: el texto del PDF y el contenido de la celda Excel contienen el nombre generado.
    - Tag: `Feature: institution-settings, Property 8: Los documentos generados incluyen el nombre institucional en el encabezado`
    - **Valida: Requisitos 5.1, 6.1, 7.1**

- [x] 7. Página `InstitutionSettingsPage` con `LogoUploader`
  - Crear `src/pages/InstitutionSettingsPage.tsx`.
  - Implementar el componente interno `LogoUploader` con las props `{ value, onChange, onError }`:
    - Validar tipo MIME: solo `image/png`, `image/jpeg`, `image/webp`; mostrar error inline si es inválido (Req. 3.1, 3.2).
    - Validar tamaño: máximo 2 MB; mostrar error inline si supera el límite (Req. 3.3).
    - Convertir con `FileReader.readAsDataURL()` y llamar a `onChange(base64)` (Req. 3.4).
    - Mostrar previsualización `<img src={value}>` si `value` existe (Req. 3.6).
    - Mostrar placeholder con ícono si `value` es undefined (Req. 3.7).
  - Implementar el formulario principal con `react-hook-form` + `zod`:
    - Schema: `name` (min 1, trim), `address` (opcional), `phone` (opcional), `email` (email válido u opcional vacío), `logoBase64` (opcional).
    - Cargar valores actuales con `useInstitutionSettings()` y rellenar el formulario con `reset()` (Req. 4.2).
    - Mostrar spinner durante la carga inicial (Req. 4.3).
    - Al guardar: llamar a `useUpdateInstitutionSettings()`, mostrar `toast.success(...)` en éxito (Req. 4.4) y `toast.error(...)` en error (Req. 4.5).
    - Aplicar design system: tarjetas `rounded-2xl border border-gray-100 shadow-sm`, botón primario `#538f65` (Req. 4.6).
  - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 7.1 Escribir test de propiedad: validación de tipo MIME en LogoUploader (Propiedad 5)
    - **Propiedad 5: Validación de tipo MIME en LogoUploader**
    - Usar `fast-check` para generar strings de MIME type que no sean `image/png`, `image/jpeg` ni `image/webp`.
    - Aserción: `onChange` no es llamado, `onError` sí es llamado con mensaje de error.
    - Tag: `Feature: institution-settings, Property 5: Validación de tipo MIME en LogoUploader`
    - **Valida: Requisitos 3.1, 3.2**

  - [ ]* 7.2 Escribir test de propiedad: formato correcto de la conversión base64 (Propiedad 6)
    - **Propiedad 6: Formato correcto de la conversión base64**
    - Usar `fast-check` para generar archivos mock con MIME válido (`image/png`, `image/jpeg`, `image/webp`).
    - Aserción: el resultado comienza con `"data:image/"` y contiene `";base64,"`.
    - Tag: `Feature: institution-settings, Property 6: Formato correcto de la conversión base64`
    - **Valida: Requisito 3.4**

- [x] 8. Modificar `DashboardLayout` — botón Configuración → Link condicional admin
  - En `src/layouts/DashboardLayout.tsx`, dentro del bloque "Action buttons at bottom":
    - Reemplazar el `<button>` de "Configuración" por `<Link to="/settings">` con el mismo estilo visual.
    - Agregar estado activo (`style={{ background: '#538f65' }}`) cuando `location.pathname === '/settings'`.
    - Envolver el Link en `{user?.role === 'admin' && ...}` para ocultarlo a roles no-admin (Req. 2.4, 2.5).
  - _Requisitos: 2.4, 2.5_

- [x] 9. Modificar `App.tsx` — ruta `/settings` con `AdminRoute`
  - En `src/App.tsx`:
    - Agregar `import InstitutionSettingsPage from '@/pages/InstitutionSettingsPage'`.
    - Implementar el componente `AdminRoute` junto a `ProtectedRoute`: verifica `user?.role === 'admin'`; si no, redirige a `/` con `<Navigate to="/" replace />`.
    - Agregar la ruta `<Route path="settings" element={<AdminRoute><InstitutionSettingsPage /></AdminRoute>} />` dentro del layout protegido.
  - _Requisitos: 2.1, 2.4, 2.5_

- [x] 10. Checkpoint — Frontend base completo
  - Verificar que `/settings` es accesible para admin y redirige a `/` para otros roles.
  - Verificar que el formulario carga los datos actuales, guarda correctamente y muestra toasts.
  - Verificar que el LogoUploader rechaza tipos inválidos y archivos > 2 MB.
  - Asegurarse de que todos los tests pasen; consultar al usuario si surgen dudas.

- [x] 11. Integrar encabezado institucional en `MonthlyAttendanceReportPage`
  - En `src/pages/MonthlyAttendanceReportPage.tsx`:
    - Agregar `import { useInstitutionSettings } from '@/hooks/useInstitutionSettings'`.
    - Agregar `import { addInstitutionHeaderToPDF, addInstitutionHeaderToSheet } from '@/utils/institutionHeader'`.
    - Agregar `const { data: institutionData } = useInstitutionSettings()` al componente.
    - Refactorizar `exportToPDF()`: reemplazar el bloque de título/texto manual por `const startY = addInstitutionHeaderToPDF(doc, institutionData, 'Reporte de Asistencia Mensual')` y ajustar `startY` en `autoTable` (Req. 6.1, 6.2, 6.3, 6.4).
    - Refactorizar `exportToExcel()`: llamar a `addInstitutionHeaderToSheet(ws, institutionData)` antes de escribir los datos de asistencia y ajustar el offset de filas (Req. 7.1, 7.2, 7.3, 7.4).
  - _Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 8.2_

- [x] 12. Integrar encabezado institucional en `BulkEnrollment` (plantilla Excel)
  - En `src/components/BulkEnrollment.tsx`:
    - Agregar `import { useInstitutionSettings } from '@/hooks/useInstitutionSettings'`.
    - Agregar `import { addInstitutionHeaderToSheet } from '@/utils/institutionHeader'`.
    - Agregar `const { data: institutionData } = useInstitutionSettings()` al componente.
    - Refactorizar `handleDownloadTemplate()`: llamar a `addInstitutionHeaderToSheet(ws, institutionData)` al inicio de la construcción de la hoja y ajustar los índices de fila de los datos existentes (`ws_data`) para que comiencen después del encabezado institucional (Req. 5.1, 5.2, 5.3, 5.4).
  - _Requisitos: 5.1, 5.2, 5.3, 5.4, 8.2_

- [x] 13. Checkpoint final — Integración completa
  - Verificar que la plantilla Excel de matrícula incluye el nombre institucional en el encabezado.
  - Verificar que el PDF de asistencia mensual incluye el nombre y logo institucional.
  - Verificar que el Excel de asistencia mensual incluye el nombre institucional.
  - Verificar que cuando no hay configuración guardada, los documentos se generan sin encabezado institucional (degradación elegante).
  - Verificar que `useInstitutionSettings` realiza una sola llamada a la API cuando múltiples componentes lo consumen simultáneamente (caché TanStack Query).
  - Asegurarse de que todos los tests pasen; consultar al usuario si surgen dudas.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido.
- Cada tarea referencia los requisitos específicos para trazabilidad.
- Los checkpoints garantizan validación incremental antes de continuar.
- Los tests de propiedad validan invariantes universales del sistema.
- Los tests unitarios validan ejemplos específicos y casos borde.
- La degradación elegante en exportaciones (sin encabezado cuando `settings` es undefined) es un requisito de corrección, no opcional.
