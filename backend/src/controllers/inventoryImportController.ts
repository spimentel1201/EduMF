import { Request, Response, NextFunction } from 'express';
import * as XLSX from 'xlsx';
import InventoryItem from '../models/InventoryItem';
import InventoryAmbiente from '../models/InventoryAmbiente';
import { ApiError } from '../middleware/errorHandler';
import {
  formatCodigoInterno,
  getNextCodigoCorrelativo,
} from './inventoryController';

/* ──────────────────────────────────────────────────────────────────────────
 * Parser del Anexo 03-A (Inventario Físico de Bienes Patrimoniales)
 * Soporta la hoja "INV. GRAL 2025 POR AMBIENTE" y variantes con el mismo
 * orden de columnas. Detecta dinámicamente la fila de cabecera y las
 * columnas, por lo que tolera columnas iniciales vacías.
 * ────────────────────────────────────────────────────────────────────────── */

interface ParsedRow {
  numeroInventario: string;
  codigoSBNGeneral: string;
  codigoSBNCorrelativo: string;
  nombre: string;
  marca: string;
  tipo: string;
  modelo: string;
  serieDimensiones: string;
  color: string;
  otros: string;
  cantidad: number;
  unidadMedida: string;
  ubicacion: string;
  estado: 'B' | 'R' | 'N' | '';
  condicion: string;
  fechaIngreso?: Date;
  entidadDependencia: string;
  documentoSustentatorio: string;
  fechaDocumento?: Date;
  valorUnitario: number;
  valorTotal: number;
  anioInventario: number;
  datosOriginales: any[];
  filaExcel: number;
}

interface ParsedSheet {
  sheetName: string;
  columnas: Record<string, number>;
  filas: ParsedRow[];
  advertencias: string[];
}

function cellToString(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalize(value: any): string {
  return cellToString(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita tildes: DESCRIPCIÓN -> DESCRIPCION
    .replace(/\s+/g, '')
    .toUpperCase();
}

function toNumber(value: any): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = cellToString(value);
  if (!raw) return 0;
  // Quita símbolos de moneda y separadores de miles; conserva punto decimal.
  const cleaned = raw.replace(/[^\d.,-]/g, '');
  const normalized =
    cleaned.includes(',') && cleaned.includes('.')
      ? cleaned.replace(/,/g, '')
      : cleaned.replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDate(value: any): Date | undefined {
  if (typeof value === 'number' && value > 20000 && value < 80000) {
    // Fecha serial de Excel (epoch 1899-12-30)
    const ms = Math.round((value - 25569) * 86400 * 1000);
    return new Date(ms);
  }

  const raw = cellToString(value);
  if (!raw) return undefined;

  const match = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    let year = Number(match[3]);
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900) {
      return new Date(Date.UTC(year, month - 1, day));
    }
  }

  const iso = new Date(raw);
  if (!Number.isNaN(iso.getTime())) return iso;
  return undefined;
}

function normalizeEstado(value: any): 'B' | 'R' | 'N' | '' {
  const raw = normalize(value);
  if (raw.startsWith('B')) return 'B';
  if (raw.startsWith('R')) return 'R';
  if (raw.startsWith('N')) return 'N';
  return '';
}

function findCol(
  block: any[][],
  regex: RegExp,
  maxCols: number,
  fallback: number
): number {
  for (let col = 0; col < maxCols; col++) {
    for (const row of block) {
      if (regex.test(normalize(row?.[col]))) return col;
    }
  }
  return fallback;
}

function detectHeaderRow(matrix: any[][]): number {
  const limit = Math.min(matrix.length, 40);
  for (let row = 0; row < limit; row++) {
    const joined = matrix[row].map(normalize).join('|');
    if (joined.includes('CODIGOSBN')) return row;
  }
  return 11;
}

export function parseInventorySheet(buffer: Buffer): ParsedSheet {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });

  const preferred =
    workbook.SheetNames.find((name) => /INV\.?\s*GRAL/i.test(name)) ||
    workbook.SheetNames.find((name) => /INV/i.test(name)) ||
    workbook.SheetNames[0];

  const worksheet = workbook.Sheets[preferred];
  if (!worksheet) {
    throw new Error('El archivo no contiene hojas de cálculo legibles.');
  }

  const matrix: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: true,
  });

  const maxCols = matrix.reduce((max, row) => Math.max(max, row.length), 0);
  const headerRow = detectHeaderRow(matrix);
  if (headerRow < 0) {
    throw new Error('No se encontró la fila de encabezados "CODIGO SBN".');
  }

  const block = matrix.slice(headerRow, headerRow + 3);

  const col = {
    numero: findCol(block, /^NRO\.?$|^NUMERO$/, maxCols, 1),
    sbn: findCol(block, /CODIGOSBN/, maxCols, 2),
    cantidad: findCol(block, /CANTI-?DAD/, maxCols, 4),
    unidad: findCol(block, /UNIDAD|UND\./, maxCols, 5),
    detalle: findCol(block, /DESCRIPCION|DETALLE/, maxCols, 6),
    ubicacion: findCol(block, /UBICACION/, maxCols, 13),
    estado: findCol(block, /^EST\.?$/, maxCols, 14),
    condicion: findCol(block, /CONDICION/, maxCols, 15),
    fechaIngreso: findCol(block, /FECHADEINGRESO|ADQUISIC/, maxCols, 16),
    valorUnitario: findCol(block, /VALORUNITARIO/, maxCols, 20),
    valorTotal: findCol(block, /VALORTOTAL/, maxCols, 21),
  };

  if (col.sbn === 2 && col.detalle === 6) {
    // Sin coincidencias: validamos que al menos exista el texto en el bloque.
    const joined = block.map((row) => row.map(normalize).join('')).join('');
    if (!joined.includes('CODIGOSBN')) {
      throw new Error(
        'La hoja no tiene el formato esperado del Anexo 03-A (columna CODIGO SBN).'
      );
    }
  }

  const anio = Number((preferred.match(/20\d{2}/) || [])[0]) || new Date().getFullYear();
  const filas: ParsedRow[] = [];
  const advertencias: string[] = [];

  for (let index = headerRow + 1; index < matrix.length; index++) {
    const row = matrix[index] || [];
    const numeroInventario = cellToString(row[col.numero]);
    const detalle = cellToString(row[col.detalle]);
    const sbn = cellToString(row[col.sbn]);
    const detalleNorm = normalize(detalle);

    const isSubHeader =
      detalleNorm === 'DETALLE' ||
      detalleNorm === 'MARCA' ||
      detalleNorm === 'TIPO' ||
      detalleNorm === 'MODELO' ||
      detalleNorm.startsWith('DESCRIPCION');

    if (isSubHeader) continue;
    if (detalleNorm === 'TOTAL' || detalleNorm.startsWith('TOTAL')) continue;
    // Los pies administrativos repiten ':' en la columna SBN, pero no son bienes.
    // Se conserva un bien sin descripción si tiene un código SBN numérico.
    const tieneCodigoSBN = /^\d{8}$/.test(sbn);
    if (!detalle && !tieneCodigoSBN) continue;

    const cantidad = toNumber(row[col.cantidad]) || 1;
    const valorUnitario = toNumber(row[col.valorUnitario]);
    const valorTotalRaw = toNumber(row[col.valorTotal]);
    const fechaIngreso = toDate(row[col.fechaIngreso]);
    const fechaDocumento = toDate(row[col.fechaIngreso + 3]);

    if (!detalle) {
      advertencias.push(
        `Fila ${index + 1}: sin descripción del bien, se usó el código SBN.`
      );
    }
    if (valorUnitario > 0 && valorTotalRaw === 0) {
      // El Excel no trae total: lo calculamos.
    }

    filas.push({
      numeroInventario,
      codigoSBNGeneral: sbn,
      codigoSBNCorrelativo: cellToString(row[col.sbn + 1]),
      nombre: detalle || `Bien SBN ${sbn}`,
      marca: cellToString(row[col.detalle + 1]),
      tipo: cellToString(row[col.detalle + 2]),
      modelo: cellToString(row[col.detalle + 3]),
      serieDimensiones: cellToString(row[col.detalle + 4]),
      color: cellToString(row[col.detalle + 5]),
      otros: cellToString(row[col.detalle + 6]),
      cantidad,
      unidadMedida: cellToString(row[col.unidad]) || 'UND',
      ubicacion: cellToString(row[col.ubicacion]),
      estado: normalizeEstado(row[col.estado]),
      condicion: cellToString(row[col.condicion]),
      fechaIngreso,
      entidadDependencia: cellToString(row[col.fechaIngreso + 1]),
      documentoSustentatorio: cellToString(row[col.fechaIngreso + 2]),
      fechaDocumento,
      valorUnitario,
      valorTotal: valorTotalRaw > 0 ? valorTotalRaw : cantidad * valorUnitario,
      anioInventario: anio,
      datosOriginales: row,
      filaExcel: index + 1,
    });
  }

  const conteoNumeros = new Map<string, number>();
  for (const fila of filas) {
    if (/^\d+$/.test(fila.numeroInventario)) {
      conteoNumeros.set(
        fila.numeroInventario,
        (conteoNumeros.get(fila.numeroInventario) || 0) + 1
      );
    }
  }
  const numerosRepetidos = [...conteoNumeros.values()].filter((count) => count > 1);
  const filasRepetidas = numerosRepetidos.reduce((sum, count) => sum + count - 1, 0);
  if (filasRepetidas > 0) {
    advertencias.push(
      `La hoja repite ${numerosRepetidos.length} números de inventario (${filasRepetidas} filas adicionales). Se conservan todas las filas.`
    );
  }
  const numerosOrdenados = [...conteoNumeros.keys()]
    .map(Number)
    .sort((a, b) => a - b);
  const maxNumero = numerosOrdenados[numerosOrdenados.length - 1] || 0;
  const numerosPresentes = new Set(numerosOrdenados);
  const numerosFaltantes = Array.from(
    { length: maxNumero },
    (_, index) => index + 1
  ).filter((numero) => !numerosPresentes.has(numero));
  if (numerosFaltantes.length > 0) {
    advertencias.push(
      `Faltan ${numerosFaltantes.length} números entre 1 y ${maxNumero}: ${numerosFaltantes.join(', ')}.`
    );
  }
  const sinNumero = filas.filter((fila) => !/^\d+$/.test(fila.numeroInventario)).length;
  if (sinNumero > 0) {
    advertencias.push(`${sinNumero} bienes no tienen número de inventario en la hoja.`);
  }

  return {
    sheetName: preferred,
    columnas: col,
    filas,
    advertencias,
  };
}

/**
 * @desc    Analiza el Excel sin guardar nada (dry-run)
 * @route   POST /api/inventory/import/preview
 */
export const previewImport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return next(ApiError.badRequest('No se ha subido ningún archivo.'));
    }

    const parsed = parseInventorySheet(req.file.buffer);

    res.status(200).json({
      success: true,
      data: {
        sheetName: parsed.sheetName,
        totalFilas: parsed.filas.length,
        columnas: parsed.columnas,
        advertencias: parsed.advertencias.slice(0, 30),
        filas: parsed.filas.slice(0, 100),
      },
    });
  } catch (error: any) {
    next(ApiError.badRequest(error.message || 'No se pudo leer el archivo Excel.'));
  }
};

/**
 * @desc    Importa todas las filas del Excel (sin deduplicar)
 * @route   POST /api/inventory/import/commit
 */
export const commitImport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return next(ApiError.badRequest('No se ha subido ningún archivo.'));
    }

    const parsed = parseInventorySheet(req.file.buffer);
    if (parsed.filas.length === 0) {
      return next(
        ApiError.badRequest(
          'No se encontraron filas de bienes en la hoja seleccionada.'
        )
      );
    }

    let correlativo = await getNextCodigoCorrelativo(parsed.filas[0].anioInventario);
    const ambienteCache = new Map<string, any>();
    let ambientesCreados = 0;
    let insertados = 0;
    const errores: { fila: number; mensaje: string }[] = [];

    for (const fila of parsed.filas) {
      try {
        let ambienteId: any = undefined;

        if (fila.ubicacion) {
          const key = fila.ubicacion.toLowerCase();
          if (ambienteCache.has(key)) {
            ambienteId = ambienteCache.get(key);
          } else {
            let ambiente = await InventoryAmbiente.findOne({
              nombre: new RegExp(
                `^${fila.ubicacion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
                'i'
              ),
            });
            if (!ambiente) {
              ambiente = await InventoryAmbiente.create({
                nombre: fila.ubicacion,
                activo: true,
              });
              ambientesCreados += 1;
            }
            ambienteId = ambiente._id;
            ambienteCache.set(key, ambienteId);
          }
        }

        const codigoInterno = formatCodigoInterno(
          fila.anioInventario,
          correlativo
        );
        correlativo += 1;

        await InventoryItem.create({
          codigoInterno,
          codigoSBNGeneral: fila.codigoSBNGeneral,
          codigoSBNCorrelativo: fila.codigoSBNCorrelativo,
          nombre: fila.nombre,
          marca: fila.marca,
          tipo: fila.tipo,
          modelo: fila.modelo,
          serieDimensiones: fila.serieDimensiones,
          color: fila.color,
          otros: fila.otros,
          cantidad: fila.cantidad,
          unidadMedida: fila.unidadMedida,
          ubicacion: fila.ubicacion,
          ambiente: ambienteId,
          estado: fila.estado,
          condicion: fila.condicion,
          tipoBien: 'activo_fijo',
          fechaIngreso: fila.fechaIngreso,
          entidadDependencia: fila.entidadDependencia,
          documentoSustentatorio: fila.documentoSustentatorio,
          fechaDocumento: fila.fechaDocumento,
          valorUnitario: fila.valorUnitario,
          valorTotal: fila.valorTotal,
          anioInventario: fila.anioInventario,
          datosOriginales: fila.datosOriginales,
        });

        insertados += 1;
      } catch (error: any) {
        errores.push({
          fila: fila.filaExcel,
          mensaje: error?.message || 'Error desconocido al registrar la fila',
        });
      }
    }

    res.status(201).json({
      success: true,
      data: {
        sheetName: parsed.sheetName,
        totalFilas: parsed.filas.length,
        insertados,
        ambientesCreados,
        advertencias: parsed.advertencias.slice(0, 30),
        errores: errores.slice(0, 50),
      },
    });
  } catch (error: any) {
    next(ApiError.badRequest(error.message || 'No se pudo importar el archivo Excel.'));
  }
};

export const TEMPLATE_HEADERS = [
  'CODIGO SBN GENERAL',
  'CORREL.',
  'CANTIDAD',
  'UND. DE MEDIDA',
  'DESCRIPCIÓN',
  'MARCA',
  'TIPO',
  'MODELO',
  'SERIE / DIMENSIONES',
  'COLOR',
  'OTROS',
  'UBICACIÓN',
  'EST.',
  'CONDICIÓN',
  'FECHA DE INGRESO',
  'ENTIDAD / DEPENDENCIA',
  'DOCUMENTO SUSTENTATORIO',
  'FECHA DEL DOCUMENTO',
  'VALOR UNITARIO',
  'VALOR TOTAL',
];

const TEMPLATE_EXAMPLE = [
  '95220163',
  '1',
  1,
  'UND',
  'AMPLIFICADOR DE AUDIO',
  'PHONIC',
  '',
  'POWEREPOD1082R',
  'BCR2P30021',
  'NEGRO',
  '',
  'AUDITORIO',
  'B',
  'D',
  '2026-01-15',
  'MINEDU',
  'PECOSA N° 00001',
  '2026-01-15',
  280,
  280,
];

/** Construye la plantilla normalizada (misma que descarga el endpoint). */
export function buildInventoryTemplate(): Buffer {
  const worksheet = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, TEMPLATE_EXAMPLE]);
  worksheet['!cols'] = TEMPLATE_HEADERS.map(() => ({ wch: 18 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'INVENTARIO');

  return XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
  }) as Buffer;
}

/**
 * @desc    Descargar la plantilla normalizada del inventario
 * @route   GET /api/inventory/template
 */
export const downloadTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const buffer = buildInventoryTemplate();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="plantilla-inventario.xlsx"'
    );
    res.status(200).send(buffer);
  } catch (error) {
    next(error);
  }
};
