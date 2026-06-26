# 🎫 feat: Implementación del Módulo de Incidencias Escolares

## 📋 Descripción

Este PR implementa un módulo completo para el registro y gestión de incidencias escolares, incluyendo backend (API REST) y frontend (React).

## ✨ Características Principales

### Backend
- **Modelo `Incident`** con campos para tipo, fecha, involucrados, ubicación, descripción, acciones tomadas y estado
- **Campos de cierre**: `closedAt` y `closedBy` para rastrear cuándo y quién cerró una incidencia
- **CRUD completo** con validaciones usando `express-validator`
- **Endpoint de estadísticas** `/api/incidents/stats`
- **Endpoint de cambio de estado** `PATCH /api/incidents/:id/status`
- **Permisos**: Solo usuarios con rol `admin` o `teacher` pueden acceder

### Frontend
- **Página de lista** (`/incidents`) con tabla paginada, búsqueda y filtros avanzados
- **Panel de detalles** (slide-over) para ver información completa de cada incidencia
- **Cambio de estado inline** desde la tabla o el panel de detalles
- **Página de registro** (`/incidents/new`) con formulario completo y validación
- **Integración en menú** de navegación principal

## 📁 Archivos Modificados/Creados

### Backend
| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `backend/src/models/Incident.ts` | 🆕 | Modelo Mongoose con schema, validaciones e índices |
| `backend/src/controllers/incidentController.ts` | 🆕 | Controlador con CRUD + stats + updateStatus |
| `backend/src/routes/incidentRoutes.ts` | 🆕 | Rutas protegidas por autenticación/autorización |
| `backend/src/server.ts` | ✏️ | Integración de rutas de incidencias |

### Frontend
| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `src/types/incidents.ts` | 🆕 | Tipos, constantes y helpers de colores |
| `src/services/incidentService.ts` | 🆕 | Servicio API con métodos CRUD + updateStatus |
| `src/pages/IncidentsPage.tsx` | 🆕 | Página de lista con filtros y panel de detalles |
| `src/pages/NewIncidentPage.tsx` | 🆕 | Formulario de registro de incidencias |
| `src/layouts/DashboardLayout.tsx` | ✏️ | Agregado enlace en navegación |
| `src/App.tsx` | ✏️ | Rutas `/incidents` y `/incidents/new` |
| `src/locales/es/translation.json` | ✏️ | Traducciones en español |
| `src/locales/en/translation.json` | ✏️ | Traducciones en inglés |

## 🔧 Tipos de Incidencia
- Conductual
- Académica
- Salud
- Bullying
- Daño a propiedad
- Otro

## 📊 Estados
- Pendiente
- En Proceso
- Resuelto
- Cerrado

## 🎨 UI/UX
- Badges con colores distintivos por tipo y estado
- Indicador visual de incidencias violentas
- Panel lateral deslizante para ver detalles sin perder contexto
- Selector de estado inline para cambios rápidos
- Información de cierre (fecha y usuario) visible cuando aplica

## 🧪 Cómo Probar

1. Iniciar backend:
```bash
cd backend && npm run dev
```

2. Iniciar frontend:
```bash
npm run dev
```

3. Navegar a `/incidents` desde el menú "Incidencias"
4. Crear nueva incidencia con el botón "Nueva Incidencia"
5. Cambiar estado usando el dropdown en la tabla
6. Ver detalles haciendo clic en el ícono 👁️

## 📸 Screenshots

> *Agregar capturas de pantalla de la lista, formulario y panel de detalles*

## ✅ Checklist

- [x] Backend: Modelo con campos de cierre
- [x] Backend: Controlador con CRUD completo
- [x] Backend: Rutas protegidas
- [x] Backend: Endpoint de cambio de estado
- [x] Frontend: Tipos TypeScript
- [x] Frontend: Servicio API
- [x] Frontend: Página de lista con filtros
- [x] Frontend: Panel de detalles (slide-over)
- [x] Frontend: Página de registro
- [x] Frontend: Integración en menú
- [x] i18n: Traducciones ES/EN

---

**Related Issues:** N/A  
**Breaking Changes:** Ninguno
