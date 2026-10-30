import jsPDF from 'jspdf';
import type { InstitutionSettings } from '@/types/institution';
import type { InventoryLabelData } from '@/types/inventory';

const DEFAULT_INSTITUTION = 'I.E. FRANCISCO LÓPEZ DE ROMAÑA';

/* Dimensiones físicas de la etiqueta (mm) y cuadrícula A4 */
const LABEL_W = 70;
const LABEL_H = 42;
const GAP = 4;
const COLS = 2;
const ROWS = 6;
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = (PAGE_W - (COLS * LABEL_W + (COLS - 1) * GAP)) / 2;
const MARGIN_Y = (PAGE_H - (ROWS * LABEL_H + (ROWS - 1) * GAP)) / 2;

function logoFormat(logoBase64: string): 'PNG' | 'JPEG' | 'WEBP' {
  if (logoBase64.startsWith('data:image/png')) return 'PNG';
  if (logoBase64.startsWith('data:image/webp')) return 'WEBP';
  return 'JPEG';
}

function truncate(text: string, maxLength: number): string {
  if (!text) return '—';
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function drawField(
  doc: jsPDF,
  x: number,
  y: number,
  label: string,
  value: string,
  maxWidth: number,
  maxChars: number
) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.2);
  doc.setTextColor(90, 96, 105);
  doc.text(label, x + 4, y);

  const labelWidth = doc.getTextWidth(label);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.6);
  doc.setTextColor(26, 32, 44);
  doc.text(truncate(value, maxChars), x + 4 + labelWidth + 1.5, y);

  doc.setDrawColor(180, 186, 194);
  doc.setLineWidth(0.15);
  doc.setLineDashPattern([0.35, 0.7], 0);
  doc.line(x + 4, y + 1.5, x + maxWidth, y + 1.5);
  doc.setLineDashPattern([], 0);
}

function drawLabel(
  doc: jsPDF,
  x: number,
  y: number,
  item: InventoryLabelData,
  settings?: InstitutionSettings
) {
  // Marco de la etiqueta
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.35);
  doc.roundedRect(x, y, LABEL_W, LABEL_H, 2.5, 2.5);
  doc.setLineDashPattern([], 0);

  // Logo institucional (o monograma de respaldo)
  const institutionName = settings?.name?.trim() || DEFAULT_INSTITUTION;
  if (settings?.logoBase64) {
    try {
      doc.addImage(
        settings.logoBase64,
        logoFormat(settings.logoBase64),
        x + 3.5,
        y + 3,
        9,
        9
      );
    } catch {
      // Sin logo: continuar
    }
  }

  if (!settings?.logoBase64) {
    doc.setFillColor(83, 143, 101);
    doc.roundedRect(x + 3.5, y + 3, 9, 9, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.text('IE', x + 8, y + 8.5, { align: 'center' });
  }

  // Nombre de la institución
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.6);
  doc.setTextColor(26, 32, 44);
  const nameLines = doc.splitTextToSize(institutionName, LABEL_W - 18);
  doc.text(nameLines.slice(0, 2), x + 14.5, y + 6);

  // Pill del año
  const pillY = y + 11;
  doc.setFillColor(43, 48, 59);
  doc.roundedRect(x + 14.5, pillY, 18, 4.4, 1.6, 1.6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(5.6);
  doc.text(`AÑO: ${item.anioInventario}`, x + 23.5, pillY + 3.1, { align: 'center' });

  // Separador
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(x + 3.5, y + 17.2, x + LABEL_W - 3.5, y + 17.2);

  // Campos
  drawField(doc, x, y + 20.4, 'Nombre del Bien:', item.nombre, LABEL_W - 4, 42);
  drawField(doc, x, y + 25.6, 'Código SBN:', item.codigoSBN, 50, 24);
  drawField(doc, x, y + 30.8, 'Código Interno:', item.codigoInterno, 50, 22);
  drawField(doc, x, y + 36, 'Ambiente:', item.ambiente, 50, 22);

  // QR (esquina inferior derecha)
  if (item.qrDataUrl) {
    try {
      doc.addImage(item.qrDataUrl, 'PNG', x + 55.5, y + 24.2, 10.8, 10.8);
    } catch {
      // Si falla el QR no se interrumpe la impresión
    }
  }
}

/**
 * Construye el documento PDF (sin guardarlo) para poder previsualizarlo o
 * testearlo. Cada página A4 contiene 12 etiquetas (2 columnas × 6 filas).
 */
export function buildInventoryLabelsPDF(
  items: InventoryLabelData[],
  settings?: InstitutionSettings
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const perPage = COLS * ROWS;

  items.forEach((item, index) => {
    const indexOnPage = index % perPage;
    if (index > 0 && indexOnPage === 0) doc.addPage();

    const col = indexOnPage % COLS;
    const row = Math.floor(indexOnPage / COLS);
    const x = MARGIN_X + col * (LABEL_W + GAP);
    const y = MARGIN_Y + row * (LABEL_H + GAP);

    drawLabel(doc, x, y, item, settings);
  });

  return doc;
}

/**
 * Genera un PDF A4 con 12 etiquetas por página (2 columnas × 6 filas).
 * Cada etiqueta replica el diseño físico institucional e incluye un QR
 * que abre la ficha pública del bien.
 */
export function generateInventoryLabelsPDF(
  items: InventoryLabelData[],
  settings?: InstitutionSettings
): void {
  if (items.length === 0) return;

  const doc = buildInventoryLabelsPDF(items, settings);
  const date = new Date().toISOString().slice(0, 10);
  doc.save(`etiquetas-inventario-${date}.pdf`);
}
