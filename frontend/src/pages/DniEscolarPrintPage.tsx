import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PrinterIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import DniCardPreview from '@/components/DniCardPreview';
import { dniEscolarService } from '@/services/dniEscolarService';
import { useInstitutionSettings } from '@/hooks/useInstitutionSettings';
import {
  generateDniCardsPDF,
  generateDniTestPagePDF,
} from '@/utils/dniEscolarPdf';
import type { DniEscolar } from '@/types/dniEscolar';

const MAX_PRINT = 200;

/** Calibración dúplex guardada en el navegador (mm, ± ). */
function loadCalibracion(): { x: number; y: number } {
  try {
    const raw = localStorage.getItem('dni-duplex-calibracion');
    if (raw) return JSON.parse(raw);
  } catch {
    // valor por defecto
  }
  return { x: 0, y: 0 };
}

export default function DniEscolarPrintPage() {
  const [searchParams] = useSearchParams();
  const { data: settings } = useInstitutionSettings();

  const initialIds = useMemo(
    () => (searchParams.get('ids') || '').split(',').filter(Boolean),
    [searchParams.toString()]
  );

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>(initialIds);
  const [modo, setModo] = useState<'duplex' | 'frente' | 'reverso'>('duplex');
  const [calibracion, setCalibracion] = useState(loadCalibracion);
  const [manualInput, setManualInput] = useState('');
  const [agregandoManual, setAgregandoManual] = useState(false);

  useEffect(() => {
    setSelected(initialIds);
  }, [initialIds]);

  useEffect(() => {
    localStorage.setItem('dni-duplex-calibracion', JSON.stringify(calibracion));
  }, [calibracion]);

  const { data, isLoading } = useQuery({
    queryKey: ['dni-print-source', search],
    queryFn: () => dniEscolarService.getAll({ limit: 500, search: search || undefined }),
  });

  const dnis = data?.data ?? [];
  const total = data?.total ?? 0;

  const { data: previewDni } = useQuery<DniEscolar>({
    queryKey: ['dni-print-preview', selected[0]],
    queryFn: () => dniEscolarService.getById(selected[0]),
    enabled: Boolean(selected[0]),
  });

  const printMutation = useMutation({
    mutationFn: async () => {
      const items = await dniEscolarService.getPrintData(selected);
      generateDniCardsPDF(items, settings, modo, calibracion);
      return items.length;
    },
    onSuccess: (count) => toast.success(`${count} DNI(s) enviados al PDF`),
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'No se pudo generar el PDF');
    },
  });

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((value) => value !== id);
      if (prev.length >= MAX_PRINT) {
        toast.error(`Máximo ${MAX_PRINT} DNIs por impresión`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const selectVisible = () => {
    const visibleIds = dnis.map((dni) => dni.id);
    setSelected((prev) =>
      Array.from(new Set([...prev, ...visibleIds])).slice(0, MAX_PRINT)
    );
  };

  const nudge = (axis: 'x' | 'y', delta: number) => {
    setCalibracion((prev) => ({
      ...prev,
      [axis]: Math.min(5, Math.max(-5, Number((prev[axis] + delta).toFixed(1)))),
    }));
  };

  /**
   * Agrega DNIs a la selección escribiendo los números de DNI/CUI,
   * separados por comas, espacios o líneas (como la lista de QR).
   */
  const agregarPorDni = async () => {
    const numeros = Array.from(
      new Set(
        manualInput
          .split(/[\s,;]+/)
          .map((value) => value.trim().toUpperCase())
          .filter(Boolean)
      )
    );
    if (numeros.length === 0) return;

    setAgregandoManual(true);
    const agregados: string[] = [];
    const noEncontrados: string[] = [];

    try {
      for (const numero of numeros) {
        // Primero en la lista ya cargada en pantalla
        const local = dnis.find((d) => d.cui === numero);
        if (local) {
          if (!selected.includes(local.id) && !agregados.includes(local.id)) {
            agregados.push(local.id);
          }
          continue;
        }
        // Si no está cargada, se busca en el servidor por CUI exacto
        const respuesta = await dniEscolarService.getAll({ search: numero, limit: 10 });
        const match = respuesta.data.find((d) => d.cui === numero);
        if (match) {
          if (!selected.includes(match.id) && !agregados.includes(match.id)) {
            agregados.push(match.id);
          }
        } else {
          noEncontrados.push(numero);
        }
      }

      if (agregados.length > 0) {
        setSelected((prev) =>
          Array.from(new Set([...prev, ...agregados])).slice(0, MAX_PRINT)
        );
      }

      if (noEncontrados.length > 0) {
        toast.error(`No se encontraron: ${noEncontrados.join(', ')}`);
      } else if (agregados.length > 0) {
        toast.success(`${agregados.length} DNI(s) agregados`);
      } else {
        toast('Ya estaban seleccionados');
      }
      setManualInput('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudo agregar los DNIs');
    } finally {
      setAgregandoManual(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to="/dni-escolar"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeftIcon className="w-3.5 h-3.5" />
            Volver a DNIs escolares
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: '#1a202c' }}>
            Imprimir DNIs escolares
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#718096' }}>
            Tarjetas de 85.6 × 54 mm · 9 por hoja A4 horizontal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => generateDniTestPagePDF()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm"
            title="Imprimir primero esta hoja para verificar la alineación dúplex"
          >
            Hoja de prueba
          </button>
          <button
            onClick={() => printMutation.mutate()}
            disabled={selected.length === 0 || printMutation.isPending}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm disabled:opacity-40"
            style={{ background: '#538f65' }}
          >
            {printMutation.isPending ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
              <PrinterIcon className="w-4 h-4" />
            )}
            {printMutation.isPending ? 'Generando PDF…' : `Generar PDF (${selected.length})`}
          </button>
        </div>
      </div>

      {/* Instrucciones + calibración */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-5 items-start">
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold mb-3" style={{ color: '#1a202c' }}>
            Cómo imprimir para que ambas caras queden exactas
          </h2>
          <ol className="space-y-2 text-xs text-gray-600 list-decimal list-inside">
            <li>
              <span className="font-semibold">Primera vez:</span> imprime la{' '}
              <span className="font-semibold">Hoja de prueba</span> a doble cara y revisa
              que cada cuadro del reverso caiga exactamente detrás de su anverso.
            </li>
            <li>
              Configura la impresora: papel <span className="font-semibold">A4</span>,{' '}
              <span className="font-semibold">horizontal</span>,{' '}
              <span className="font-semibold">escala 100%</span> (nunca "ajustar a página") y
              doble cara <span className="font-semibold">volteando por el borde corto</span>.
            </li>
            <li>
              El PDF trae la <span className="font-semibold">página 1 con los anversos</span> y
              la <span className="font-semibold">página 2 con los reversos</span> en las mismas
              posiciones.
            </li>
            <li>
              Si al voltear el reverso queda desplazado, corrige con la{' '}
              <span className="font-semibold">calibración</span> (mueve el reverso en
              milímetros) y vuelve a imprimir la hoja de prueba.
            </li>
            <li>
              Impresora sin dúplex: elige modo "Solo anversos", imprime todas las hojas, y
              luego vuelve a meter las mismas hojas imprimiendo "Solo reversos".
            </li>
          </ol>
        </section>

        <aside className="space-y-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Modo de impresión
            </p>
            <div className="space-y-2">
              {(
                [
                  ['duplex', 'Doble cara (dúplex)', 'Página 1 anversos + página 2 reversos'],
                  ['frente', 'Solo anversos', 'Para reponer y volver a meter la hoja'],
                  ['reverso', 'Solo reversos', 'Segunda pasada en las mismas hojas'],
                ] as const
              ).map(([value, label, description]) => (
                <label
                  key={value}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    modo === value
                      ? 'border-green-200 bg-green-50/60'
                      : 'border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="modo"
                    value={value}
                    checked={modo === value}
                    onChange={() => setModo(value)}
                    className="mt-0.5 w-4 h-4 accent-[#538f65]"
                  />
                  <span>
                    <span className="block text-xs font-semibold text-gray-800">{label}</span>
                    <span className="block text-[11px] text-gray-400">{description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Calibración del reverso
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[11px] text-gray-500 mb-1">Horizontal (X)</p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => nudge('x', -0.5)}
                    className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 text-xs font-bold"
                  >
                    −
                  </button>
                  <span className="flex-1 text-center text-xs font-mono tabular-nums">
                    {calibracion.x.toFixed(1)} mm
                  </span>
                  <button
                    onClick={() => nudge('x', 0.5)}
                    className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 text-xs font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 mb-1">Vertical (Y)</p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => nudge('y', -0.5)}
                    className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 text-xs font-bold"
                  >
                    −
                  </button>
                  <span className="flex-1 text-center text-xs font-mono tabular-nums">
                    {calibracion.y.toFixed(1)} mm
                  </span>
                  <button
                    onClick={() => nudge('y', 0.5)}
                    className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 text-xs font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            {(calibracion.x !== 0 || calibracion.y !== 0) && (
              <p className="mt-2 text-[11px] text-amber-600">
                Calibración activa: se aplica al generar el PDF de reversos.
              </p>
            )}
          </div>
        </aside>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
        {/* Lista de estudiantes */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar estudiante por CUI, apellido o nombre"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
              />
            </div>

            {/* Agregar por DNI (sin seleccionar todo el salón) */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Agregar por DNI: 63420256, ES202600012345…"
                value={manualInput}
                onChange={(event) => setManualInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    agregarPorDni();
                  }
                }}
                className="flex-1 min-w-0 px-3 py-2 text-sm font-mono bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 uppercase"
              />
              <button
                onClick={agregarPorDni}
                disabled={!manualInput.trim() || agregandoManual}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white shadow-sm disabled:opacity-40 flex-shrink-0"
                style={{ background: '#538f65' }}
              >
                <PlusIcon className="w-4 h-4" />
                {agregandoManual ? 'Agregando…' : 'Agregar'}
              </button>
            </div>
            <p className="text-[11px] text-gray-400 -mt-1">
              Escribe uno o varios números de DNI/CUI separados por comas, espacios o líneas.
              Se agregan a la selección sin necesidad de buscarlos en la lista.
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-gray-400">
                {selected.length} seleccionados
                {total > dnis.length && ` · mostrando ${dnis.length} de ${total}`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectVisible}
                  disabled={dnis.length === 0}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-50 hover:bg-gray-100 text-gray-600 disabled:opacity-40"
                >
                  Seleccionar visibles
                </button>
                <button
                  onClick={() => setSelected([])}
                  disabled={selected.length === 0}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                >
                  <XMarkIcon className="w-3 h-3" />
                  Limpiar
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-[560px] overflow-y-auto divide-y divide-gray-50">
            {isLoading &&
              Array.from({ length: 8 }).map((_, index) => (
                <div key={`skeleton-${index}`} className="px-4 py-3 animate-pulse">
                  <div className="h-3 w-1/3 bg-gray-100 rounded mb-2" />
                  <div className="h-3 w-2/3 bg-gray-100 rounded" />
                </div>
              ))}

            {!isLoading &&
              dnis.map((dni) => {
                const checked = selected.includes(dni.id);
                return (
                  <label
                    key={dni.id}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                      checked ? 'bg-green-50/50' : 'hover:bg-gray-50/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOne(dni.id)}
                      className="w-4 h-4 accent-[#538f65]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {[dni.primerApellido, dni.segundoApellido, dni.preNombres]
                          .filter(Boolean)
                          .join(' ')}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {[dni.departamento, dni.provincia, dni.distrito]
                          .filter(Boolean)
                          .join(' · ') || 'Ubicación sin registrar'}
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-gray-400 flex-shrink-0">
                      {dni.cui}
                    </span>
                    {!dni.fotoBase64 && (
                      <span className="text-[10px] font-semibold text-amber-600 flex-shrink-0">
                        sin foto
                      </span>
                    )}
                  </label>
                );
              })}

            {!isLoading && dnis.length === 0 && (
              <div className="py-16 text-center">
                <PrinterIcon className="w-9 h-9 mx-auto text-gray-300" />
                <p className="mt-2 text-sm font-semibold text-gray-500">
                  No se encontraron DNIs
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Prueba con otro término de búsqueda.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Vista previa */}
        <aside className="lg:sticky lg:top-6 space-y-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Vista previa de la primera tarjeta
            </p>

            {previewDni ? (
              <>
                <DniCardPreview dni={previewDni} settings={settings} />
                <p className="mt-3 text-xs text-gray-500 flex items-center gap-1.5">
                  <CheckCircleIcon className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  {selected.length} DNI(s) se distribuirán 3 × 3 por hoja A4 horizontal.
                </p>
              </>
            ) : (
              <div className="aspect-[85.6/54] rounded-xl border border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-center px-6">
                <PrinterIcon className="w-8 h-8 text-gray-300" />
                <p className="mt-2 text-xs text-gray-500">
                  Selecciona un estudiante para ver su tarjeta.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
