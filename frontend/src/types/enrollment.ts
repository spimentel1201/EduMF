// Tipos de la importación masiva de matrículas (plantilla propia y SIAGIE)

export interface BulkEnrollmentResponse {
  msg: string;
  totalProcessed: number;
  successCount: number;
  errors: any[];
}

export interface SiagieResumen {
  total: number;
  nuevos: number;
  existentesNuevos: number;
  yaMatriculados: number;
  conflictos: number;
  omitidosTrasladados: number;
  duplicados: number;
  sinSeccion: number;
}

export interface SiagieSeccionInfo {
  clave: string;
  nombre: string;
  grado: number;
  seccion: string;
  sectionId: string | null;
  existe: boolean;
  capacidad: number;
  matriculados: number;
  porMatricular: number;
  resultante: number;
  excedeCapacidad: boolean;
}

export interface SiagieAdvertencia {
  fila: number;
  tipo: 'error' | 'advertencia';
  mensaje: string;
}

export interface SiagieMeta {
  anioTitulo?: number;
  codigoModular?: string;
  nombreIE?: string;
  nivel?: string;
  turno?: string;
}

export interface SiagiePreviewData {
  hoja: string;
  meta: SiagieMeta;
  anio: { id: string; name: string };
  opciones: { crearSecciones: boolean; incluirTrasladados: boolean; nivel: string };
  totalFilas: number;
  resumen: SiagieResumen;
  secciones: SiagieSeccionInfo[];
  faltantes: string[];
  excedidas: string[];
  advertencias: SiagieAdvertencia[];
}

export interface SiagieErrorFila {
  fila: number;
  documento: string;
  mensaje: string;
}

export interface SiagieCommitData {
  hoja: string;
  meta: SiagieMeta;
  anio: { id: string; name: string };
  totalFilas: number;
  resumen: SiagieResumen & {
    usuariosCreados: number;
    usuariosActualizados: number;
    matriculados: number;
    seccionesCreadas: number;
    errores: number;
  };
  secciones: Array<{
    clave: string;
    nombre: string;
    existe: boolean;
    capacidad: number;
    matriculados: number;
    porMatricular: number;
    resultante: number;
  }>;
  errores: SiagieErrorFila[];
  advertencias: SiagieAdvertencia[];
}

export interface ResetPreview {
  estudiantes: number;
  matriculas: number;
  asistencias: number;
  detallesAsistencia: number;
  deudas: number;
  transacciones: number;
  dniEscolar: number;
  eventos: number;
  incidentes: number;
  seccionesAReiniciar: number;
}

export interface ResetPreviewData {
  resumen: ResetPreview;
  fraseConfirmacion: string;
}
