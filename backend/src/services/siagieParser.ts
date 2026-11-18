import * as XLSX from 'xlsx';

/**
 * Parser del reporte "RELACIÓN DE ESTUDIANTES Y APODERADOS" que exporta SIAGIE
 * (archivo rptPadresFamiliaEstudiantes.xlsx).
 *
 * El reporte trae 2 filas de encabezado: una de grupos (ESTUDIANTE, PADRE,
 * MADRE, APODERADO) y otra de subcolumnas. La posición de las columnas puede
 * variar entre versiones, por eso se detectan por nombre y no por índice fijo.
 */

export type SiagieTipoDocumento = 'DNI' | 'CODIGO';

export interface SiagieApoderado {
  nombres: string;
  parentesco: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  telefono?: string;
  correo?: string;
}

export interface SiagieFila {
  /** Número de fila en Excel (1-based), para reportar incidencias. */
  fila: number;
  item?: number;
  gradoTexto: string;
  grado: number;
  seccion: string;
  tipoDocumento: SiagieTipoDocumento;
  /** DNI de 8 dígitos o, si no existe, el código SIAGIE. */
  documento: string;
  codigoEstudiante?: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombres: string;
  firstName: string;
  lastName: string;
  gender: 'M' | 'F' | 'O';
  birthdate?: Date;
  edad?: number;
  estadoMatricula: string;
  apoderado?: SiagieApoderado;
  /** Marca filas cuyo documento ya apareció antes en el mismo archivo. */
  duplicadoEnArchivo?: boolean;
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

export interface SiagieParseResult {
  filas: SiagieFila[];
  advertencias: SiagieAdvertencia[];
  meta: SiagieMeta;
  columnasDetectadas: Record<string, string>;
  hoja: string;
}

/** Normaliza texto: sin tildes, mayúsculas, espacios simples. */
const norm = (value: any): string =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');

/** Normaliza sin espacios, para comparar encabezados. */
const compact = (value: any): string => norm(value).replace(/ /g, '');

const GRUPOS = ['ESTUDIANTE', 'PADRE', 'MADRE', 'APODERADO', 'ITEM'] as const;
type Grupo = (typeof GRUPOS)[number];

/**
 * Claves conocidas agrupadas: `GRUPO|SUBCOLUMNA`.
 * Se aceptan variantes porque SIAGIE tiene erratas ("NÙMERO", "TIPO DE DE
 * DOCUMENTO") y cambia títulos entre versiones.
 */
const ALIAS: Record<string, keyof SiagieFila | 'padreNombre' | 'madreNombre' | 'apoderadoNombre' | 'validadoReniec' | 'sexoGrupo' | 'parentesco'> = {
  'ESTUDIANTE|GRADO': 'gradoTexto',
  'ESTUDIANTE|GRADODELESTUDIANTE': 'gradoTexto',
  'ESTUDIANTE|SECCION': 'seccion',
  'ESTUDIANTE|TIPODEDOCUMENTO': 'tipoDocumento',
  'ESTUDIANTE|TIPODOCUMENTO': 'tipoDocumento',
  'ESTUDIANTE|NUMERODEDOCUMENTO': 'documento',
  'ESTUDIANTE|NUMERODOCUMENTO': 'documento',
  'ESTUDIANTE|NUMERODOC': 'documento',
  'ESTUDIANTE|DNI': 'documento',
  'ESTUDIANTE|CODIGODELESTUDIANTE': 'codigoEstudiante',
  'ESTUDIANTE|CODIGOESTUDIANTE': 'codigoEstudiante',
  'ESTUDIANTE|CODIGO': 'codigoEstudiante',
  'ESTUDIANTE|APELLIDOPATERNO': 'apellidoPaterno',
  'ESTUDIANTE|APELLIDOMATERNO': 'apellidoMaterno',
  'ESTUDIANTE|NOMBRES': 'nombres',
  'ESTUDIANTE|SEXO': 'gender',
  'ESTUDIANTE|FECHADENACIMIENTO': 'birthdate',
  'ESTUDIANTE|EDADAL31DEMARZO': 'edad',
  'ESTUDIANTE|EDAD': 'edad',
  'ESTUDIANTE|ESTADODEMATRICULA': 'estadoMatricula',
  'ESTUDIANTE|VALIDADOCONRENIEC': 'validadoReniec',
  'PADRE|APELLIDOSYNOMBRES': 'padreNombre',
  'PADRE|NOMBRESYAPELLIDOS': 'padreNombre',
  'MADRE|APELLIDOSYNOMBRES': 'madreNombre',
  'MADRE|NOMBRESYAPELLIDOS': 'madreNombre',
  'APODERADO|APELLIDOSYNOMBRES': 'apoderadoNombre',
  'APODERADO|NOMBRESYAPELLIDOS': 'apoderadoNombre',
};

const TIPOS_DOC = ['TIPODEDOCUMENTO', 'TIPODEDEDOCUMENTO', 'TIPODOCUMENTO'];
const NUMEROS_DOC = ['NUMERO', 'NUMERODEDOCUMENTO', 'NUMERODOCUMENTO', 'NUMERODOC'];
const VALIDADOS = ['VALIDADOCONRENIEC'];
const CORREOS = ['CORREOELECTRONICO', 'CORREO'];
const CELULARES = ['NUMEROCELULAR', 'CELULAR', 'TELEFONO'];
const SEXOS = ['SEXO'];
const PARENTESCOS = ['PARENTESCO'];

type CampoApoderado = 'tipoDocumento' | 'numeroDocumento' | 'correo' | 'telefono';

/** Mapea `GRUPO|SUBCOLUMNA` a los campos del apoderado embebido. */
function campoApoderado(grupo: Grupo, sub: string): CampoApoderado | null {
  const esApoderado = grupo === 'PADRE' || grupo === 'MADRE' || grupo === 'APODERADO';
  if (!esApoderado) return null;
  if (TIPOS_DOC.includes(sub)) return 'tipoDocumento';
  if (NUMEROS_DOC.includes(sub)) return 'numeroDocumento';
  if (CORREOS.includes(sub)) return 'correo';
  if (CELULARES.includes(sub)) return 'telefono';
  return null;
}

function parseFecha(value: any): Date | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (value instanceof Date && !isNaN(value.getTime())) {
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed?.y) return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
    return undefined;
  }
  const texto = String(value).trim();
  const dmy = texto.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (dmy) {
    let anio = Number(dmy[3]);
    if (anio < 100) anio += 2000;
    const fecha = new Date(Date.UTC(anio, Number(dmy[2]) - 1, Number(dmy[1])));
    return isNaN(fecha.getTime()) ? undefined : fecha;
  }
  const iso = new Date(texto);
  return isNaN(iso.getTime()) ? undefined : iso;
}

function parseSexo(value: any): 'M' | 'F' | 'O' {
  const texto = compact(value);
  if (!texto) return 'O';
  if (texto === 'M' || texto === 'H' || texto.startsWith('HOMBRE') || texto.startsWith('MASCULINO')) return 'M';
  if (texto === 'F' || texto.startsWith('MUJER') || texto.startsWith('FEMENINO')) return 'F';
  return 'O';
}

const GRADOS: Record<string, number> = {
  PRIMERO: 1, PRIMER: 1, PRIMERGRADO: 1,
  SEGUNDO: 2, SEGUNDAGRADO: 2,
  TERCERO: 3, TERCERGRADO: 3,
  CUARTO: 4, CUARTAGRADO: 4,
  QUINTO: 5, QUINTAGRADO: 5,
  SEXTO: 6, SEXTAGRADO: 6,
};

function parseGrado(value: any): number | null {
  const texto = compact(value);
  if (!texto) return null;
  if (GRADOS[texto]) return GRADOS[texto];
  const inicial = texto.match(/^(\d{1,2})/);
  if (inicial) {
    const numero = Number(inicial[1]);
    if (numero >= 1 && numero <= 6) return numero;
  }
  const porPalabra = texto.match(/^(PRIMERO|SEGUNDO|TERCERO|CUARTO|QUINTO|SEXTO)/);
  if (porPalabra) return GRADOS[porPalabra[1]] ?? null;
  return null;
}

function parseSeccion(value: any): string {
  const texto = compact(value);
  if (!texto) return '';
  if (texto.startsWith('UNICA')) return 'U';
  const letra = texto.match(/[A-Z]/);
  return letra ? letra[0] : '';
}

/** Extrae los datos de cabecera (IE, código modular, año del título). */
function extraerMeta(rows: any[][], headerIdx: number): SiagieMeta {
  const meta: SiagieMeta = {};
  const limpiar = (v: any) => String(v ?? '').replace(/\s+/g, ' ').trim();
  for (let r = 0; r < headerIdx; r++) {
    const fila = rows[r] || [];
    for (let c = 0; c < fila.length; c++) {
      const etiqueta = compact(fila[c]);
      if (!etiqueta) continue;

      // El valor suele estar en la misma columna del renglón siguiente
      // (SIAGIE usa una fila de etiquetas y otra de valores).
      const buscarValor = (): string | undefined => {
        for (let rr = r + 1; rr < headerIdx; rr++) {
          const candidato = rows[rr]?.[c];
          if (candidato !== null && candidato !== undefined && String(candidato).trim() !== '') {
            return limpiar(candidato);
          }
        }
        const aLaDerecha = fila
          .slice(c + 1)
          .find((v) => v !== null && v !== undefined && String(v).trim() !== '');
        return aLaDerecha === undefined ? undefined : limpiar(aLaDerecha);
      };

      if (etiqueta === 'CODIGOMODULAR') meta.codigoModular = buscarValor();
      if (etiqueta === 'INSTITUCIONEDUCATIVA') meta.nombreIE = buscarValor();
      if (etiqueta === 'NIVEL') meta.nivel = buscarValor();
      if (etiqueta === 'TURNO') meta.turno = buscarValor();
      const titulo = String(fila[c] ?? '');
      if (/RELACI[OÓ]N DE ESTUDIANTES/i.test(titulo) || /APODERADOS/i.test(titulo)) {
        const anio = titulo.match(/(20\d{2})/);
        if (anio) meta.anioTitulo = Number(anio[1]);
      }
    }
  }
  return meta;
}

/** Determina el grupo (ESTUDIANTE/PADRE/...) al que pertenece cada columna. */
function construirGrupos(groupRow: any[], columnas: number): (Grupo | null)[] {
  const grupos: (Grupo | null)[] = new Array(columnas).fill(null);
  let actual: Grupo | null = null;
  for (let c = 0; c < columnas; c++) {
    const valor = compact(groupRow?.[c]);
    const encontrado = GRUPOS.find((g) => valor === g || (g !== 'ITEM' && valor.startsWith(g)));
    if (encontrado) actual = encontrado;
    grupos[c] = actual;
  }
  return grupos;
}

export function parseSiagieSheet(buffer: Buffer): SiagieParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const hoja = workbook.SheetNames[0];
  if (!hoja) throw new Error('El archivo no contiene hojas.');

  const worksheet = workbook.Sheets[hoja];
  const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, {
    header: 1,
    blankrows: true,
    defval: null,
    raw: true,
  });

  // 1. Ubicar el encabezado de subcolumnas (contiene el número de documento)
  let headerIdx = -1;
  for (let r = 0; r < Math.min(rows.length, 40); r++) {
    const fila = (rows[r] || []).map(compact);
    const tieneDocumento = fila.some((v) => NUMEROS_DOC.includes(v));
    const tieneNombres = fila.includes('APELLIDOPATERNO') || fila.includes('NOMBRES');
    const tieneGrado = fila.includes('GRADO') || fila.includes('GRADODELESTUDIANTE');
    if (tieneDocumento && (tieneNombres || tieneGrado)) {
      headerIdx = r;
      break;
    }
  }

  if (headerIdx === -1) {
    throw new Error(
      'No se reconoce el formato del archivo. Se esperaba el reporte de SIAGIE "Relación de estudiantes y apoderados".'
    );
  }

  // 2. Grupos: la fila anterior al encabezado (si existe) marca PADRE/MADRE/APODERADO
  const previa = headerIdx > 0 ? rows[headerIdx - 1] || [] : [];
  const pareceGrupos = previa.some((v) => ['ESTUDIANTE', 'PADRE', 'MADRE', 'APODERADO'].includes(compact(v)));
  const columnas = Math.max(
    ...rows.slice(headerIdx, headerIdx + 2).map((f) => (f || []).length),
    previa.length
  );
  const grupos = pareceGrupos
    ? construirGrupos(previa, columnas)
    : new Array(columnas).fill('ESTUDIANTE' as Grupo);

  // 3. Mapa campo -> índice de columna
  const mapa: Partial<Record<string, number>> = {};
  const columnasDetectadas: Record<string, string> = {};
  const apoderadoCols: Partial<Record<CampoApoderado, Record<string, number>>> = {
    tipoDocumento: {},
    numeroDocumento: {},
    correo: {},
    telefono: {},
  };
  const apoderadoNombreCols: Record<string, number> = {};
  const apoderadoParentescoCols: Record<string, number> = {};

  const header = rows[headerIdx] || [];
  for (let c = 0; c < header.length; c++) {
    const sub = compact(header[c]);
    if (!sub) continue;
    const grupo: Grupo = (grupos[c] as Grupo) || 'ESTUDIANTE';
    const clave = `${grupo}|${sub}`;
    columnasDetectadas[clave] = header[c];

    const campo = ALIAS[clave];
    if (campo && mapa[campo as string] === undefined) {
      mapa[campo as string] = c;
    }

    if (grupo === 'PADRE' || grupo === 'MADRE' || grupo === 'APODERADO') {
      if (ALIAS[`${grupo}|${sub}`] === `${grupo.toLowerCase()}Nombre`) {
        apoderadoNombreCols[grupo] = c;
      }
      if (sub === 'PARENTESCO') {
        apoderadoParentescoCols[grupo] = c;
      }
      const campoAp = campoApoderado(grupo, sub);
      if (campoAp) {
        apoderadoCols[campoAp]![grupo] = c;
      }
    }
  }

  // Fallback: si no hay fila de grupos, los campos del estudiante ya quedaron mapeados
  const meta = extraerMeta(rows, headerIdx);

  const filas: SiagieFila[] = [];
  const advertencias: SiagieAdvertencia[] = [];
  const vistos = new Map<string, number>();

  const valor = (row: any[], campo: string): any => {
    const col = mapa[campo];
    return col === undefined ? undefined : row[col];
  };
  const texto = (row: any[], campo: string): string => {
    const v = valor(row, campo);
    return v === null || v === undefined ? '' : String(v).trim();
  };

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const filaExcel = r + 1;

    const gradoTexto = texto(row, 'gradoTexto');
    const seccionTexto = texto(row, 'seccion');
    const nombres = texto(row, 'nombres');
    const apellidoPaterno = texto(row, 'apellidoPaterno');

    // Filas vacías o pies de página
    if (!gradoTexto && !seccionTexto && !nombres && !apellidoPaterno) continue;

    const grado = parseGrado(gradoTexto);
    const seccion = parseSeccion(seccionTexto);

    if (!grado) {
      advertencias.push({ fila: filaExcel, tipo: 'error', mensaje: `Grado no reconocido: "${gradoTexto}".` });
      continue;
    }
    if (!seccion) {
      advertencias.push({ fila: filaExcel, tipo: 'error', mensaje: `Sección no reconocida: "${seccionTexto}".` });
      continue;
    }

    const apellidoMaterno = texto(row, 'apellidoMaterno');
    if (!nombres || !apellidoPaterno) {
      advertencias.push({
        fila: filaExcel,
        tipo: 'error',
        mensaje: 'La fila no tiene nombres y apellidos completos.',
      });
      continue;
    }

    const numeroDocumento = texto(row, 'documento').replace(/\s+/g, '');
    const codigoEstudiante = texto(row, 'codigoEstudiante').replace(/\s+/g, '');
    const esDni = /^\d{8}$/.test(numeroDocumento);

    let documento = '';
    let tipoDocumento: SiagieTipoDocumento = 'DNI';

    if (esDni) {
      documento = numeroDocumento;
      tipoDocumento = 'DNI';
    } else if (codigoEstudiante) {
      documento = codigoEstudiante;
      tipoDocumento = 'CODIGO';
      if (numeroDocumento) {
        advertencias.push({
          fila: filaExcel,
          tipo: 'advertencia',
          mensaje: `Documento "${numeroDocumento}" no es un DNI válido; se usará el código ${codigoEstudiante}.`,
        });
      }
    } else if (numeroDocumento) {
      documento = numeroDocumento;
      tipoDocumento = 'CODIGO';
      advertencias.push({
        fila: filaExcel,
        tipo: 'advertencia',
        mensaje: `Documento "${numeroDocumento}" no tiene 8 dígitos; se registrará como código.`,
      });
    }

    if (!documento) {
      advertencias.push({
        fila: filaExcel,
        tipo: 'error',
        mensaje: 'La fila no tiene DNI ni código de estudiante; no se puede identificar al alumno.',
      });
      continue;
    }

    // Apoderado: se prefiere APODERADO, luego MADRE y por último PADRE
    let grupoApoderado: 'APODERADO' | 'MADRE' | 'PADRE' | null = null;
    for (const candidato of ['APODERADO', 'MADRE', 'PADRE'] as const) {
      const col = apoderadoNombreCols[candidato];
      if (col !== undefined && String(row[col] ?? '').trim()) {
        grupoApoderado = candidato;
        break;
      }
    }

    let apoderado: SiagieApoderado | undefined;
    if (grupoApoderado) {
      const leerDe = (grupo: string, campo: CampoApoderado): string => {
        const col = apoderadoCols[campo]?.[grupo];
        return col === undefined || row[col] === null || row[col] === undefined
          ? ''
          : String(row[col]).trim();
      };
      const leer = (campo: CampoApoderado): string => leerDe(grupoApoderado!, campo);

      apoderado = {
        nombres: String(row[apoderadoNombreCols[grupoApoderado]] ?? '').trim(),
        parentesco: (() => {
          const col = apoderadoParentescoCols[grupoApoderado!];
          const valorParentesco =
            col === undefined || row[col] === null || row[col] === undefined
              ? ''
              : String(row[col]).trim().toUpperCase();
          if (valorParentesco) return valorParentesco;
          return grupoApoderado === 'MADRE' ? 'MADRE' : grupoApoderado === 'PADRE' ? 'PADRE' : 'APODERADO';
        })(),
        tipoDocumento: leer('tipoDocumento') || undefined,
        numeroDocumento: leer('numeroDocumento') || undefined,
        telefono: leer('telefono') || undefined,
        correo: leer('correo') || undefined,
      };

      // El reporte suele dejar vacíos los contactos del apoderado aunque los
      // tenga la madre o el padre: se completan como respaldo.
      if (!apoderado.telefono) {
        apoderado.telefono = leerDe('MADRE', 'telefono') || leerDe('PADRE', 'telefono') || undefined;
      }
      if (!apoderado.correo) {
        apoderado.correo = leerDe('MADRE', 'correo') || leerDe('PADRE', 'correo') || undefined;
      }
    }

    const sexo = parseSexo(valor(row, 'gender'));
    const birthdate = parseFecha(valor(row, 'birthdate'));
    if (!birthdate) {
      advertencias.push({
        fila: filaExcel,
        tipo: 'advertencia',
        mensaje: 'No se pudo leer la fecha de nacimiento.',
      });
    }

    const edadValor = valor(row, 'edad');
    const edad = edadValor === undefined || edadValor === '' ? undefined : Number(edadValor);

    const claveDuplicado = `${tipoDocumento}:${documento}`;
    const duplicadoEnArchivo = vistos.has(claveDuplicado);
    if (duplicadoEnArchivo) {
      advertencias.push({
        fila: filaExcel,
        tipo: 'advertencia',
        mensaje: `El documento ${documento} ya aparece en la fila ${vistos.get(claveDuplicado)}; se omitirá.`,
      });
    } else {
      vistos.set(claveDuplicado, filaExcel);
    }

    filas.push({
      fila: filaExcel,
      item: (() => {
        const itemCol = grupos.findIndex((g) => g === 'ITEM');
        const crudo = itemCol >= 0 ? row[itemCol] : valor(row, 'item');
        const numero = Number(crudo);
        return Number.isFinite(numero) && numero > 0 ? numero : undefined;
      })(),
      gradoTexto: gradoTexto.replace(/\s+/g, ' ').trim(),
      grado,
      seccion,
      tipoDocumento,
      documento,
      codigoEstudiante: codigoEstudiante || undefined,
      apellidoPaterno: apellidoPaterno.replace(/\s+/g, ' ').trim().toUpperCase(),
      apellidoMaterno: apellidoMaterno.replace(/\s+/g, ' ').trim().toUpperCase(),
      nombres: nombres.replace(/\s+/g, ' ').trim().toUpperCase(),
      firstName: nombres.replace(/\s+/g, ' ').trim().toUpperCase(),
      lastName: `${apellidoPaterno} ${apellidoMaterno}`
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase(),
      gender: sexo,
      birthdate,
      edad: Number.isFinite(edad) ? edad : undefined,
      estadoMatricula: texto(row, 'estadoMatricula').toUpperCase() || 'DEFINITIVA',
      apoderado,
      duplicadoEnArchivo,
    });
  }

  return { filas, advertencias, meta, columnasDetectadas, hoja };
}

export function nombreSeccion(grado: number, seccion: string, nivel?: string): string {
  const nivelTexto = (nivel || 'Secundaria').trim();
  return `${grado}${seccion} ${nivelTexto}`;
}
