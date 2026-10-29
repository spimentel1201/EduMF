import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { inventoryService } from '@/services/inventoryService';
import type {
  InventoryImportPreview,
  InventoryImportResult,
} from '@/types/inventory';

const ESTADO_LABEL: Record<string, string> = {
  B: 'Bueno',
  R: 'Regular',
  N: 'Nuevo',
  '': '—',
};

export default function InventoryImportPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<InventoryImportPreview | null>(null);
  const [result, setResult] = useState<InventoryImportResult | null>(null);

  const previewMutation = useMutation({
    mutationFn: (selected: File) => inventoryService.previewImport(selected),
    onSuccess: (data) => {
      setPreview(data);
      setResult(null);
      toast.success(`Archivo analizado: ${data.totalFilas} bienes detectados`);
    },
    onError: (error: any) => {
      setPreview(null);
      toast.error(error.response?.data?.message || 'No se pudo leer el archivo Excel');
    },
  });

  const commitMutation = useMutation({
    mutationFn: (selected: File) => inventoryService.commitImport(selected),
    onSuccess: (data) => {
      setResult(data);
      setPreview(null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-ambientes'] });
      toast.success(`${data.insertados} bienes importados`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'No se pudo importar el inventario');
    },
  });

  const templateMutation = useMutation({
    mutationFn: inventoryService.downloadTemplate,
    onSuccess: () => toast.success('Plantilla descargada'),
    onError: () => toast.error('No se pudo descargar la plantilla'),
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setPreview(null);
    setResult(null);
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl">
      <div>
        <Link
          to="/inventory"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          Volver al inventario
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: '#1a202c' }}>
          Importar inventario desde Excel
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#718096' }}>
          Sube el Anexo 03-A. Se registran todas las filas tal como vienen en la hoja
          <span className="font-semibold"> INV. GRAL 2025 POR AMBIENTE</span>.
        </p>
      </div>

      {/* Paso 1 · Plantilla */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start gap-3">
          <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
            1
          </span>
          <div className="flex-1">
            <h2 className="text-sm font-bold" style={{ color: '#1a202c' }}>
              ¿Primera vez? Descarga la plantilla
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              La plantilla normalizada sirve para futuras cargas. También puedes subir el Excel
              original del inventario.
            </p>
            <button
              onClick={() => templateMutation.mutate()}
              disabled={templateMutation.isPending}
              className="mt-3 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm disabled:opacity-40"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              {templateMutation.isPending ? 'Descargando…' : 'Descargar plantilla .xlsx'}
            </button>
          </div>
        </div>
      </section>

      {/* Paso 2 · Archivo */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start gap-3">
          <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
            2
          </span>
          <div className="flex-1">
            <h2 className="text-sm font-bold" style={{ color: '#1a202c' }}>
              Selecciona el archivo
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Formatos aceptados: .xlsx y .xls · máximo 15 MB.
            </p>

            <label className="mt-3 flex flex-col items-center justify-center gap-2 w-full h-36 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition-colors">
              <CloudArrowUpIcon className="w-8 h-8 text-gray-300" />
              <span className="text-sm text-gray-500">
                {file ? (
                  <span className="font-semibold text-green-700">{file.name}</span>
                ) : (
                  <>
                    Haz clic o arrastra el archivo{' '}
                    <span className="font-semibold">.xlsx / .xls</span>
                  </>
                )}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {file && (
              <div className="mt-3 flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                <span className="truncate">{file.name}</span>
                <button onClick={clearFile} className="ml-2 flex-shrink-0" aria-label="Quitar archivo">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => file && previewMutation.mutate(file)}
                disabled={!file || previewMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm disabled:opacity-40"
                style={{ background: '#538f65' }}
              >
                {previewMutation.isPending ? (
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircleIcon className="w-4 h-4" />
                )}
                {previewMutation.isPending ? 'Analizando…' : 'Analizar archivo'}
              </button>
              <span className="text-xs text-gray-400">
                Analizar no guarda nada: primero revisas y luego confirmas.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Resultado de importación */}
      {result && (
        <section className="bg-white rounded-2xl border border-green-100 shadow-sm p-5">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-sm font-bold text-green-800">Importación completada</h2>
              <p className="text-xs text-gray-500 mt-1">
                Hoja <span className="font-semibold">{result.sheetName}</span> ·{' '}
                {result.insertados} de {result.totalFilas} bienes registrados ·{' '}
                {result.ambientesCreados} ambientes nuevos.
              </p>

              {result.errores.length > 0 && (
                <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3">
                  <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    {result.errores.length} filas no se pudieron registrar
                  </p>
                  <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {result.errores.map((error) => (
                      <li key={`${error.fila}-${error.mensaje}`} className="text-[11px] text-amber-700">
                        Fila {error.fila}: {error.mensaje}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 flex items-center gap-2">
                <Link
                  to="/inventory"
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm"
                  style={{ background: '#538f65' }}
                >
                  Ver inventario
                </Link>
                <Link
                  to="/inventory/labels"
                  className="px-3.5 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Imprimir etiquetas
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Preview */}
      {preview && (
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold" style={{ color: '#1a202c' }}>
                Vista previa · {preview.totalFilas.toLocaleString('es-PE')} bienes detectados
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Hoja: {preview.sheetName} · se muestran las primeras {preview.filas.length} filas.
              </p>
            </div>
            <button
              onClick={() => file && commitMutation.mutate(file)}
              disabled={commitMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm disabled:opacity-40"
              style={{ background: '#538f65' }}
            >
              {commitMutation.isPending ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                <CloudArrowUpIcon className="w-4 h-4" />
              )}
              {commitMutation.isPending
                ? 'Importando…'
                : `Confirmar e importar ${preview.totalFilas.toLocaleString('es-PE')} bienes`}
            </button>
          </div>

          {preview.advertencias.length > 0 && (
            <div className="mx-5 mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                <ExclamationTriangleIcon className="w-4 h-4" />
                {preview.advertencias.length} advertencias (no bloquean la importación)
              </p>
              <ul className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                {preview.advertencias.map((advertencia) => (
                  <li key={advertencia} className="text-[11px] text-amber-700">
                    {advertencia}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-y border-gray-100" style={{ background: '#f8faf9' }}>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Fila</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">SBN</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Descripción</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Ambiente</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-500">Cant.</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Estado</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-500">Valor S/</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {preview.filas.map((fila) => (
                  <tr key={`${fila.filaExcel}-${fila.codigoSBNGeneral}`} className="hover:bg-gray-50/60">
                    <td className="px-3 py-2 tabular-nums text-gray-400">{fila.filaExcel}</td>
                    <td className="px-3 py-2 font-mono text-gray-500">{fila.codigoSBNGeneral || '—'}</td>
                    <td className="px-3 py-2 text-gray-800 max-w-[280px] truncate">{fila.nombre}</td>
                    <td className="px-3 py-2 text-gray-500">{fila.ubicacion || '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-600">{fila.cantidad}</td>
                    <td className="px-3 py-2 text-gray-500">{ESTADO_LABEL[fila.estado] ?? '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                      {fila.valorTotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
