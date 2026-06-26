import type jsPDF from 'jspdf';
import type * as XLSX from 'xlsx';
import type { InstitutionSettings } from '@/types/institution';

/**
 * Inserta el encabezado institucional en un documento jsPDF.
 * Retorna el valor Y (en mm) donde debe comenzar el contenido del reporte.
 * Si settings es undefined, retorna 14 sin modificar el documento (degradación elegante).
 */
export function addInstitutionHeaderToPDF(
  doc: jsPDF,
  settings: InstitutionSettings | undefined,
  reportTitle: string
): number {
  if (!settings || !settings.name) {
    // Sin configuración: solo título del reporte
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(reportTitle, 14, 20);
    return 30;
  }

  let currentY = 14;

  // Logo (si existe)
  if (settings.logoBase64) {
    try {
      // Detectar formato desde el prefijo base64
      const format = settings.logoBase64.startsWith('data:image/png')
        ? 'PNG'
        : settings.logoBase64.startsWith('data:image/webp')
        ? 'WEBP'
        : 'JPEG';
      doc.addImage(settings.logoBase64, format, 14, currentY, 20, 20);
      currentY += 2;
    } catch {
      // Si falla la imagen, continuar sin ella
    }
  }

  // Nombre de la institución
  const nameX = settings.logoBase64 ? 38 : 14;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 32, 44); // #1a202c
  doc.text(settings.name, nameX, currentY + 6);

  // Datos de contacto en línea pequeña
  const contactParts: string[] = [];
  if (settings.address) contactParts.push(settings.address);
  if (settings.phone)   contactParts.push(settings.phone);
  if (settings.email)   contactParts.push(settings.email);

  if (contactParts.length > 0) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(113, 128, 150); // #718096
    doc.text(contactParts.join('  |  '), nameX, currentY + 12);
  }

  // Línea separadora
  const separatorY = Math.max(currentY + 22, 38);
  doc.setDrawColor(226, 232, 240); // #e2e8f0
  doc.setLineWidth(0.3);
  doc.line(14, separatorY, doc.internal.pageSize.getWidth() - 14, separatorY);

  // Título del reporte
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 32, 44);
  doc.text(reportTitle, 14, separatorY + 8);

  return separatorY + 16;
}

/**
 * Inserta el encabezado institucional en una hoja de trabajo XLSX.
 * Retorna el número de filas ocupadas por el encabezado (offset para el contenido).
 * Si settings es undefined, retorna 0 sin modificar la hoja (degradación elegante).
 *
 * Nota: xlsx no soporta imágenes de forma nativa sin xlsx-populate o exceljs.
 * El logo se omite en Excel; solo se incluye el nombre y datos de contacto.
 */
export function addInstitutionHeaderToSheet(
  ws: XLSX.WorkSheet,
  settings: InstitutionSettings | undefined
): number {
  if (!settings || !settings.name) return 0;

  // Importación dinámica para evitar problemas de tipos
  const XLSX = require('xlsx') as typeof import('xlsx');

  // Fila 1: Nombre de la institución
  XLSX.utils.sheet_add_aoa(ws, [[settings.name]], { origin: 'A1' });

  // Fila 2: Datos de contacto
  const contactParts: string[] = [];
  if (settings.address) contactParts.push(settings.address);
  if (settings.phone)   contactParts.push(settings.phone);
  if (settings.email)   contactParts.push(settings.email);

  if (contactParts.length > 0) {
    XLSX.utils.sheet_add_aoa(ws, [[contactParts.join(' | ')]], { origin: 'A2' });
    return 3; // 2 filas de encabezado + 1 fila vacía de separación
  }

  return 2; // 1 fila de nombre + 1 fila vacía de separación
}
