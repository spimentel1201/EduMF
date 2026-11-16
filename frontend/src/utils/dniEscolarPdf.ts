import jsPDF from 'jspdf';
import type { InstitutionSettings } from '@/types/institution';
import type { DniEscolar } from '@/types/dniEscolar';

/* ──────────────────────────────────────────────────────────────────────────
 * Generador de DNIs Escolares (DIE) en PDF.
 *
 * Tarjeta: 85.6 × 54 mm (tamaño real del DNI / CR80).
 * Hoja: A4 horizontal (297 × 210 mm), grilla 3 × 3 → 9 tarjetas por página.
 *
 * Página 1: anversos · Página 2: reversos en coordenadas idénticas, para que
 * la impresión dúplex (volteando por el borde corto) caiga exacta.
 * ────────────────────────────────────────────────────────────────────────── */

const CARD_W = 85.6;
const CARD_H = 54;
const COLS = 3;
const ROWS = 3;
const GAP = 2;
const PAGE_W = 297;
const PAGE_H = 210;
const MARGIN_X = (PAGE_W - (COLS * CARD_W + (COLS - 1) * GAP)) / 2;
const MARGIN_Y = (PAGE_H - (ROWS * CARD_H + (ROWS - 1) * GAP)) / 2;

/* Paleta (tomada del DIE real) */
const YELLOW_BG: [number, number, number] = [255, 223, 62];   // fondo amarillo
const YELLOW_BAND: [number, number, number] = [250, 205, 45]; // banda DIE
const GOLD_BORDER: [number, number, number] = [201, 162, 39]; // borde dorado
const MAROON: [number, number, number] = [139, 26, 18];       // franja superior
const RED: [number, number, number] = [192, 0, 0];            // textos rojos / fechas
const BLACK: [number, number, number] = [10, 10, 10];
const GREEN: [number, number, number] = [21, 127, 60];        // constancias
const GRAY_PHOTO: [number, number, number] = [191, 197, 204]; // placeholder foto
const SILHOUETTE: [number, number, number] = [156, 163, 175];

function setFill(doc: jsPDF, color: [number, number, number]) {
  doc.setFillColor(color[0], color[1], color[2]);
}
function setDraw(doc: jsPDF, color: [number, number, number]) {
  doc.setDrawColor(color[0], color[1], color[2]);
}
function setText(doc: jsPDF, color: [number, number, number]) {
  doc.setTextColor(color[0], color[1], color[2]);
}

/** "18 11 2026" — formato del DIE: día y mes sin ceros a la izquierda. */
export function formatDniFecha(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getDate()} ${date.getMonth() + 1} ${date.getFullYear()}`;
}

export function formatDniFechaNacimiento(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getDate()).padStart(2, '0')} ${String(date.getMonth() + 1).padStart(2, '0')} ${date.getFullYear()}`;
}

/** Línea MRZ del DIE: "I< PER {cui}" rellenada con '<'. */
export function mrzFor(cui: string): string {
  return `I< PER ${String(cui || '').toUpperCase().trim()}`;
}

/**
 * Reduce el tamaño de fuente (en puntos) hasta que el texto quepa en maxWidth.
 * Mantiene la huella del diseño constante sin importar el largo del texto
 * (CUI de 8 dígitos o código de matrícula más largo, nombres largos, etc.).
 */
function fitFont(
  doc: jsPDF,
  font: 'helvetica' | 'courier',
  style: 'normal' | 'bold',
  text: string,
  startPt: number,
  minPt: number,
  maxWidth: number
): number {
  doc.setFont(font, style);
  let size = startPt;
  doc.setFontSize(size);
  while (size > minPt && doc.getTextWidth(text) > maxWidth) {
    size -= 0.25;
    doc.setFontSize(size);
  }
  return size;
}

/** Recorta con elipsis solo como último recurso (texto extremo). */
function truncate(text: string, maxChars: number): string {
  if (!text) return '';
  return text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;
}

function imageFormat(dataUrl: string): 'PNG' | 'JPEG' | 'WEBP' {
  if (dataUrl.startsWith('data:image/png')) return 'PNG';
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
  return 'JPEG';
}

function tryAddImage(doc: jsPDF, dataUrl: string, x: number, y: number, w: number, h: number) {
  if (!dataUrl) return;
  try {
    doc.addImage(dataUrl, imageFormat(dataUrl), x, y, w, h);
  } catch {
    // Imagen inválida: no interrumpe la generación.
  }
}

/** Marco común de la tarjeta: fondo amarillo + borde negro. */
function drawCardBase(doc: jsPDF, x: number, y: number, topStrip = true) {
  setFill(doc, YELLOW_BG);
  doc.rect(x, y, CARD_W, CARD_H, 'F');
  setDraw(doc, BLACK);
  doc.setLineWidth(0.35);
  doc.rect(x + 0.9, y + 0.9, CARD_W - 1.8, CARD_H - 1.8);
  if (topStrip) {
    setFill(doc, MAROON);
    doc.rect(x, y, CARD_W, 1.2, 'F');
  }
}

/* ── ANVERSO ─────────────────────────────────────────────────────────────── */

function drawFrente(
  doc: jsPDF,
  x: number,
  y: number,
  dni: DniEscolar,
  settings?: InstitutionSettings
) {
  drawCardBase(doc, x, y, false);

  const segApellido = (dni.segundoApellido || '').trim();
  const nombres = `${dni.primerApellido} ${segApellido}`.trim();

  // ── Encabezado ──
  setText(doc, BLACK);
  doc.setFont('helvetica', 'bold');
  fitFont(doc, 'helvetica', 'bold', 'REPUBLICA DEL PERÚ', 6.2, 4.5, 46);
  doc.text('REPUBLICA DEL PERÚ', x + 3, y + 5.4);

  fitFont(
    doc,
    'helvetica',
    'bold',
    'REGISTRO NACIONAL DE IDENTIFICACIÓN Y ESTADO CIVIL',
    4.6,
    3.2,
    46
  );
  doc.text('REGISTRO NACIONAL DE IDENTIFICACIÓN Y ESTADO CIVIL', x + 3, y + 8.1);

  // CUI (caja arriba a la derecha) — auto-ajuste para códigos largos
  doc.setFontSize(5.4);
  doc.text('CUI', x + 60.5, y + 5.4);
  fitFont(doc, 'helvetica', 'bold', dni.cui, 7.4, 4, 17.5);
  doc.text(dni.cui, x + 82.2, y + 5.4, { align: 'right' });

  // ── Banda DIE ──
  setFill(doc, YELLOW_BAND);
  doc.rect(x + 1.8, y + 9.6, CARD_W - 3.6, 4.2, 'F');
  setText(doc, BLACK);
  fitFont(doc, 'helvetica', 'bold', 'DOCUMENTO DE IDENTIDAD ESCOLAR — DIE', 6.4, 4.4, 78);
  doc.text('DOCUMENTO DE IDENTIDAD ESCOLAR — DIE', x + CARD_W / 2, y + 12.6, { align: 'center' });

  // ── Foto + número vertical ──
  const PHOTO_X = x + 5.2;
  const PHOTO_Y = y + 16.2;
  const PHOTO_W = 19;
  const PHOTO_H = 25;

  if (dni.fotoBase64) {
    tryAddImage(doc, dni.fotoBase64, PHOTO_X, PHOTO_Y, PHOTO_W, PHOTO_H);
  } else {
    setFill(doc, GRAY_PHOTO);
    doc.rect(PHOTO_X, PHOTO_Y, PHOTO_W, PHOTO_H, 'F');
    // Silueta neutra cuando el estudiante no tiene foto cargada
    setFill(doc, SILHOUETTE);
    doc.circle(PHOTO_X + PHOTO_W / 2, PHOTO_Y + 8.5, 3.6, 'F');
    doc.rect(PHOTO_X + PHOTO_W / 2 - 5.2, PHOTO_Y + 13.5, 10.4, 11.5, 'F');
  }

  // CUI vertical negro junto a la foto (rota con auto-ajuste de ancho)
  setText(doc, BLACK);
  doc.setFont('helvetica', 'bold');
  fitFont(doc, 'helvetica', 'bold', dni.cui, 5.6, 3, PHOTO_H - 2);
  doc.text(dni.cui, x + 4.2, y + 39.8, { angle: 90 });

  // Apellido bajo la foto
  fitFont(doc, 'helvetica', 'bold', dni.primerApellido, 5.8, 3.5, 20);
  doc.text(truncate(dni.primerApellido, 20), PHOTO_X + PHOTO_W / 2, y + 44.2, { align: 'center' });

  // ── Campos ──
  const COL_X = x + 28.5;
  const MAX_FIELD_W = 33;

  const campo = (
    label: string,
    value: string,
    labelY: number,
    valueY: number,
    extraLabel?: string
  ) => {
    setText(doc, BLACK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.2);
    doc.text(label, COL_X, labelY);
    if (extraLabel) {
      // Sub-etiqueta pequeña, a la derecha del label (misma línea).
      const labelW = doc.getTextWidth(label);
      doc.setFontSize(3.9);
      doc.text(extraLabel, COL_X + labelW + 1.2, labelY);
      doc.setFontSize(5.2);
    }
    fitFont(doc, 'helvetica', 'bold', value || '', 6.4, 3.4, MAX_FIELD_W);
    doc.text(truncate(value, 34), COL_X, valueY);
  };

  campo('Primer Apellido', dni.primerApellido, y + 18.2, y + 21.4);
  campo('Segundo Apellido', segApellido, y + 24.6, y + 27.8);
  campo('Pre Nombres', dni.preNombres, y + 31, y + 34.2);
  campo('Nacimiento', formatDniFechaNacimiento(dni.fechaNacimiento), y + 37.4, y + 40.8, 'Fecha y Ubigeo');
  campo('Sexo', dni.sexo, y + 44.2, y + 47.4);

  // ── Caja de fechas (borde rojo, fechas en rojo) ──
  const BOX_X = x + 62.5;
  const BOX_W = 20.3;
  const BOX_Y = y + 15.6;
  const CELL_H = 5.6;

  setDraw(doc, BLACK);
  doc.setLineWidth(0.3);
  doc.rect(BOX_X, BOX_Y, BOX_W, CELL_H * 3);
  doc.line(BOX_X, BOX_Y + CELL_H, BOX_X + BOX_W, BOX_Y + CELL_H);
  doc.line(BOX_X, BOX_Y + CELL_H * 2, BOX_X + BOX_W, BOX_Y + CELL_H * 2);

  const fechas: [string, string][] = [
    ['Fecha de inscripción', formatDniFecha(dni.fechaInscripcion)],
    ['Fecha de emisión', formatDniFecha(dni.fechaEmision)],
    ['Fecha de caducidad', formatDniFecha(dni.fechaCaducidad)],
  ];

  fechas.forEach(([label, value], index) => {
    const cellY = BOX_Y + index * CELL_H;
    setText(doc, BLACK);
    doc.setFont('helvetica', 'bold');
    fitFont(doc, 'helvetica', 'bold', label, 3.9, 2.8, BOX_W - 1.6);
    doc.text(label, BOX_X + 0.9, cellY + 2.2);

    setText(doc, BLACK);
    fitFont(doc, 'helvetica', 'bold', value, 5.6, 3.2, BOX_W - 1.6);
    doc.text(value || '—', BOX_X + BOX_W / 2, cellY + 4.9, { align: 'center' });
  });

  // ── Escudo institucional (abajo a la derecha) ──
  if (settings?.logoBase64) {
    tryAddImage(doc, settings.logoBase64, x + 67.5, y + 34.5, 12.5, 13.5);
  }

  // ── MRZ ──
  setText(doc, BLACK);
  doc.setFont('courier', 'bold');
  doc.setFontSize(8.2);
  let mrz = mrzFor(dni.cui);
  const available = CARD_W - 7;
  while (doc.getTextWidth(`${mrz}<`) < available) {
    mrz = `${mrz}<`;
  }
  fitFont(doc, 'courier', 'bold', mrz, 8.2, 4.5, available);
  doc.text(mrz, x + 3.5, y + 51.2);
}

/* ── REVERSO ─────────────────────────────────────────────────────────────── */

function drawReverso(doc: jsPDF, x: number, y: number, dni: DniEscolar) {
  drawCardBase(doc, x, y, false);

  // ── 6 recuadros de constancia de sufragio (2 filas × 3 columnas) ──
  const GRID_X = x + 3;
  const GRID_Y = y + 3.2;
  const CELL_W = 26.2;
  const CELL_H = 8.2;
  const CELL_GAP = 0.9;

  setDraw(doc, BLACK);
  doc.setLineWidth(0.3);
  setText(doc, GREEN);
  doc.setFont('helvetica', 'bold');

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const cx = GRID_X + col * (CELL_W + CELL_GAP);
      const cy = GRID_Y + row * (CELL_H + CELL_GAP);
      doc.rect(cx, cy, CELL_W, CELL_H);
      doc.setFontSize(4.6);
      doc.text('CONSTANCIA', cx + CELL_W / 2, cy + 2.9, { align: 'center' });
      doc.text('DE', cx + CELL_W / 2, cy + 5, { align: 'center' });
      doc.text('SUFRAGIO', cx + CELL_W / 2, cy + 7.1, { align: 'center' });
    }
  }

  // ── Departamento / Provincia / Distrito ──
  const ubigeoY = y + 26.5;
  const valueY = ubigeoY + 3.2;

  const ubicacion = (label: string, value: string, colX: number, maxWidth: number) => {
    setText(doc, BLACK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    doc.text(label, colX, ubigeoY);
    fitFont(doc, 'helvetica', 'bold', value || '', 6.2, 3.6, maxWidth);
    doc.text(truncate(value, 22), colX, valueY);
  };

  ubicacion('Departamento', dni.departamento || '', x + 3, 24);
  ubicacion('Provincia', dni.provincia || '', x + 33, 24);
  ubicacion('Distrito', dni.distrito || '', x + 52, 28);

  // ── Dirección (texto completo con auto-ajuste, sin recortar) ──
  setText(doc, BLACK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.text('Dirección:', x + 3, y + 34.6);
  fitFont(
    doc,
    'helvetica',
    'bold',
    dni.direccion || '',
    6.2,
    3.2,
    CARD_W - 6
  );
  doc.text(dni.direccion || '', x + 3, y + 37.8);

  // ── Observaciones ──
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.text('Observaciones', x + 3, y + 43);
  doc.setFont('helvetica', 'normal');
  doc.text('Donación de órganos:', x + 3, y + 47);
  doc.setFont('helvetica', 'bold');
  doc.text(dni.donacionOrganos === 'Si' ? 'Sí' : 'No', x + 26.5, y + 47);
}

/* ── Armado de páginas ───────────────────────────────────────────────────── */

function cardPosition(index: number): { x: number; y: number } {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  return {
    x: MARGIN_X + col * (CARD_W + GAP),
    y: MARGIN_Y + row * (CARD_H + GAP),
  };
}

function fillPage(doc: jsPDF, items: DniEscolar[], settings: InstitutionSettings | undefined, draw: (
  doc: jsPDF,
  x: number,
  y: number,
  dni: DniEscolar,
  settings?: InstitutionSettings
) => void) {
  items.slice(0, COLS * ROWS).forEach((dni, index) => {
    const { x, y } = cardPosition(index);
    draw(doc, x, y, dni, settings);
  });
}

/**
 * Construye el documento PDF sin guardarlo (testeable / previsualizable).
 * `items` debe traer máximo 9 tarjetas: página 1 anversos, página 2 reversos
 * en las mismas coordenadas para dúplex.
 * `calibracion` (mm) desplaza los reversos para compensar el desface dúplex
 * de la impresora.
 */
export function buildDniCardsPDF(
  items: DniEscolar[],
  settings?: InstitutionSettings,
  calibracion?: { x: number; y: number }
): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  fillPage(doc, items, settings, drawFrente);
  doc.addPage();

  const calX = Number(calibracion?.x) || 0;
  const calY = Number(calibracion?.y) || 0;

  items.slice(0, COLS * ROWS).forEach((dni, index) => {
    const { x, y } = cardPosition(index);
    drawReverso(doc, x + calX, y + calY, dni);
  });
  return doc;
}

/**
 * Página de prueba de alineación dúplex: 9 tarjetas con retícula y marcas,
 * idénticas coordenadas frente/reverso para verificar la impresión.
 */
export function buildDniTestPagePDF(): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  for (let page = 0; page < 2; page++) {
    const label = page === 0 ? 'PRUEBA · FRENTE' : 'PRUEBA · REVERSO';
    for (let index = 0; index < COLS * ROWS; index++) {
      const { x, y } = cardPosition(index);
      setDraw(doc, page === 0 ? RED : GREEN);
      doc.setLineWidth(0.4);
      doc.rect(x, y, CARD_W, CARD_H);
      doc.line(x, y, x + CARD_W, y + CARD_H);
      doc.line(x + CARD_W, y, x, y + CARD_H);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      setText(doc, page === 0 ? RED : GREEN);
      doc.text(label, x + CARD_W / 2, y + CARD_H / 2 - 1, { align: 'center' });
      doc.setFontSize(14);
      doc.text(String(index + 1), x + CARD_W / 2, y + CARD_H / 2 + 6, { align: 'center' });
    }
    if (page === 0) doc.addPage();
  }

  return doc;
}

/**
 * Genera y descarga el PDF.
 * `modo`:
 *  - 'duplex': página anversos + página reversos (imprimir a doble cara,
 *    voltear por el borde corto).
 *  - 'frente' / 'reverso': una sola cara, para impresoras sin dúplex
 *    (reimprimir la misma hoja con el reverso).
 */
export function generateDniCardsPDF(
  items: DniEscolar[],
  settings: InstitutionSettings | undefined,
  modo: 'duplex' | 'frente' | 'reverso' = 'duplex',
  calibracion?: { x: number; y: number }
): void {
  if (items.length === 0) return;

  let doc: jsPDF;
  if (modo === 'duplex') {
    doc = buildDniCardsPDF(items, settings, calibracion);
  } else {
    doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    if (modo === 'frente') {
      fillPage(doc, items, settings, drawFrente);
    } else {
      const calX = Number(calibracion?.x) || 0;
      const calY = Number(calibracion?.y) || 0;
      items.slice(0, COLS * ROWS).forEach((dni, index) => {
        const { x, y } = cardPosition(index);
        drawReverso(doc, x + calX, y + calY, dni);
      });
    }
  }

  const fecha = new Date().toISOString().slice(0, 10);
  const sufijo = modo === 'duplex' ? '' : `-${modo}`;
  doc.save(`dni-escolar${sufijo}-${fecha}.pdf`);
}

/** Genera y descarga la hoja de prueba de alineación dúplex. */
export function generateDniTestPagePDF(): void {
  buildDniTestPagePDF().save('dni-escolar-prueba-alineacion.pdf');
}
