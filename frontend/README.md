# Sistema de Asistencia Escolar

Sistema web moderno para el manejo de asistencia de personal y estudiantes en instituciones educativas.

## 🚀 Características Principales

### Módulo de Usuarios
- Gestión de usuarios con roles (Admin, Teacher, Student)
- Registro y autenticación de usuarios
- Sistema de permisos basado en roles

### Módulo de Personal (NUEVO)
- **Gestión completa del personal educativo**
- **Roles específicos del sistema educativo:**
  - Docente
  - Psicólogo(a)
  - Mantenimiento
  - CIST (Centro de Informática y Sistemas)
  - Dirección
  - Auxiliar

- **Niveles educativos:**
  - Inicial (3-5 años)
  - Primaria (6-11 años)
  - Secundaria (12-16 años)
  - General (aplica a todos los niveles)

- **Estados del personal:**
  - Activo
  - Inactivo

- **Información del personal:**
  - DNI (Documento Nacional de Identidad)
  - Nombres y apellidos
  - Correo electrónico
  - Teléfono
  - Dirección
  - Contraseña de acceso

### Módulo de Horarios (NUEVO)
- **Gestión de horarios del personal**
- **Configuración de horarios por día:**
  - Lunes a Viernes (días laborables)
  - Horarios de entrada y salida
  - Períodos de receso opcionales
  - Estado del horario (Activo/Inactivo)

- **Características:**
  - Cálculo automático de horas trabajadas
  - Filtros por día, rol y estado
  - Vista organizada por día de la semana
  - Estadísticas de horarios activos
  - **Creación de nuevos horarios** con validaciones
  - Selección visual del personal
  - Configuración de recesos opcionales

### Módulo de Asistencia
- Control de asistencia por clase
- Estadísticas de presencia y ausencia
- Historial de asistencias
- **Nueva funcionalidad: Toma de Asistencia con Calendario**
  - Calendario interactivo mensual
  - Selección de fecha y clase
  - Lista de estudiantes con botones de estado:
    - 🟢 **Presente** (verde)
    - 🔴 **Ausente** (rojo)
    - 🟡 **Justificado** (amarillo)
    - 🟠 **Tarde** (naranja)
  - Estadísticas en tiempo real
  - Solo días laborables (lunes a viernes)

## 🛠️ Tecnologías Implementadas

### Frontend
- **React 18.2.0** - Biblioteca principal para la interfaz de usuario
- **TypeScript 5.2.2** - Para tipado estático y mejor desarrollo
- **Vite 4.4.9** - Bundler y servidor de desarrollo ultra-rápido

### UI y Estilos
- **Tailwind CSS 3.3.3** - Framework de CSS utilitario para diseño responsive
- **Headless UI** - Componentes de interfaz accesibles y sin estilos
- **Heroicons** - Iconografía moderna y consistente

### Gestión de Estado y Datos
- **React Query (TanStack Query) 5.85.6** - Para manejo de estado del servidor y caché
- **React Hook Form 7.45.4** - Para formularios eficientes y validación
- **Zod 3.22.4** - Validación de esquemas TypeScript

### Navegación y Enrutamiento
- **React Router DOM 6.15.0** - Enrutamiento del lado del cliente

### Funcionalidades Adicionales
- **React Hot Toast 2.6.0** - Notificaciones elegantes
- **React QR Reader ES6 2.2.1-2** - Escaneo de códigos QR para autenticación

## 📁 Estructura del Proyecto

```
src/
├── types/           # Tipos TypeScript para el sistema
│   └── staff.ts    # Interfaces y tipos para personal y horarios
├── contexts/        # Contextos de React (AuthContext)
├── layouts/         # Layouts reutilizables (DashboardLayout)
├── pages/           # Páginas principales de la aplicación
│   ├── DashboardPage.tsx      # Dashboard principal
│   ├── UsersPage.tsx          # Gestión de usuarios
│   ├── StaffPage.tsx          # Gestión del personal (NUEVO)
│   ├── NewStaffPage.tsx       # Registro de nuevo personal (NUEVO)
│   ├── SchedulesPage.tsx      # Gestión de horarios (NUEVO)
│   ├── NewSchedulePage.tsx    # Creación de nuevos horarios (NUEVO)
│   ├── TakeAttendancePage.tsx # Toma de asistencia con calendario (NUEVO)
│   └── AttendancePage.tsx     # Control de asistencia
└── App.tsx          # Componente raíz con enrutamiento
```

## 🔧 Instalación y Configuración

### Requisitos Previos
- Node.js 16+ 
- npm o yarn

### Instalación
```bash
# Clonar el repositorio
git clone <repository-url>
cd school-attendance

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Construir para producción
npm run build
```

## 📱 Funcionalidades del Sistema

### 1. **Dashboard Principal**
- Estadísticas generales del sistema
- Enlaces rápidos a módulos principales
- Vista general de métricas clave

### 2. **Gestión de Personal**
- Lista completa del personal con filtros avanzados
- Búsqueda por nombre, DNI, email
- Filtros por rol, nivel educativo y estado
- Estadísticas por tipo de personal
- Acciones: Ver, Editar, Cambiar estado

### 3. **Registro de Personal**
- Formulario completo con validación
- Campos organizados por secciones:
  - Información Personal
  - Información Laboral
  - Información de Acceso
- Validación en tiempo real con Zod
- Descripciones contextuales para roles y niveles

### 4. **Gestión de Horarios**
- Vista organizada por día de la semana
- Configuración de horarios de trabajo
- Gestión de períodos de receso
- Cálculo automático de horas trabajadas
- Filtros por personal, día y estado
- Estadísticas de cobertura de horarios
- **Creación de nuevos horarios** con formulario completo
- Selección visual del personal
- Validaciones de horarios y recesos
- Solo días laborables (lunes a viernes)

### 5. **Toma de Asistencia con Calendario**
- Calendario interactivo mensual
- Selección de fecha y clase
- Lista de estudiantes con botones de estado
- Estadísticas en tiempo real
- Solo días laborables (lunes a viernes)

### 6. **Sistema de Autenticación**
- Login con DNI y contraseña
- **Lector QR para registro de asistencia**
- Gestión de sesiones
- Protección de rutas por rol

### 7. **Lector QR de Asistencia (NUEVO)**
- **Escaneo de códigos QR** para registro rápido de asistencia
- **Notificación overlay** que aparece sobre la cámara:
  - Contenido del código QR escaneado (truncado si es muy largo)
  - Hora exacta de registro en tiempo real
  - Mensaje de confirmación de asistencia registrada
- **Desvanecimiento automático** después de 5 segundos
- **Vista de cámara siempre visible** en primer plano
- **Diseño responsive** y moderno
- **Sin interrupciones** del flujo de escaneo

## 🎨 Características de UI/UX

### Diseño Responsive
- Mobile-first approach
- Adaptable a todos los dispositivos
- Navegación intuitiva

### Componentes Reutilizables
- Layouts consistentes
- Formularios estandarizados
- Tablas con filtros avanzados
- Indicadores visuales de estado

### Validación y Feedback
- Validación en tiempo real
- Mensajes de error claros
- Confirmaciones de acciones
- Estados de carga

## 🔮 Próximas Funcionalidades

- [ ] Backend API para persistencia de datos
- [ ] Base de datos para usuarios y asistencias
- [ ] Sistema de generación de códigos QR
- [ ] Reportes y estadísticas avanzadas
- [ ] Notificaciones en tiempo real
- [ ] Exportación de datos
- [ ] Gestión de permisos avanzada
- [ ] Auditoría de cambios

## 📊 Casos de Uso

### **Administradores**
- Gestión completa del personal
- Configuración de horarios
- Monitoreo del sistema
- Reportes y estadísticas

### **Docentes**
- Visualización de su horario
- Toma de asistencia en clases
- Seguimiento de estudiantes
- **Registro rápido de asistencia** mediante códigos QR

### **Personal Administrativo**
- Gestión de horarios del personal
- Control de asistencia
- Reportes de personal

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

Para soporte técnico o preguntas sobre el sistema, contacta al equipo de desarrollo.

---

**Desarrollado con ❤️ para instituciones educativas**

## 🌐 URLs de acceso

### Desarrollo local
- **Panel administrativo / auxiliar / docente:** `http://localhost:3000/` (login en `/login`)
- **Portal de padres (PWA):** `http://localhost:3000/portal`
- **Panel de tutores (admin):** `http://localhost:3000/guardians`

### Producción
- **Panel administrativo / auxiliar / docente:** `https://edu-mf.vercel.app/` (login en `/login`)
- **Portal de padres (PWA):** `https://edu-mf.vercel.app/portal`
- **Panel de tutores (admin):** `https://edu-mf.vercel.app/guardians`
