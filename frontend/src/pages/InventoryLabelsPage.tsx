import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  QrCodeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import InventoryLabelPreview from '@/components/InventoryLabelPreview';
import { inventoryService } from '@/services/inventoryService';
import { useInstitutionSettings } from '@/hooks/useInstitutionSettings';
import { generateInventoryLabelsPDF } from '@/utils/inventoryLabels';
import type { InventoryItem } from '@/types/inventory';

const MAX_LABELS = 200;

function ambienteNombre(item: InventoryItem): string {
  if (item.ambiente && typeof item.ambiente === 'object') return item.ambiente.nombre;
  return item.ubicacion || 'Sin ambiente';
}

export default function InventoryLabelsPage() {
  const [searchParams] = useSearchParams();
  const { data: settings } = useInstitutionSettings();

  const initialIds = useMemo(
    () => (searchParams.get('ids') || '').split(',').filter(Boolean),
    [searchParams.toString()]
  );

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>(initialIds);

  useEffect(() => {
    setSelected(initialIds);
  }, [initialIds]);

  const { data, isLoading } = useQuery({
    queryKey: ['inventory-labels-source', search],
    queryFn: () => inventoryService.getAll({ limit: 500, search: search || undefined }),
  });

  const items = data?.data ?? [];
  const total = data?.total ?? 0;

  const { data: previewLabels } = useQuery({
    queryKey: ['inventory-label-preview', selected[0]],
    queryFn: () => inventoryService.getLabels([selected[0]]),
    enabled: Boolean(selected[0]),
  });
  const previewLabel = previewLabels?.[0];

  const generateMutation = useMutation({
    mutationFn: async () => {
      const labels = await inventoryService.getLabels(selected);
      generateInventoryLabelsPDF(labels, settings);
      return labels.length;
    },
    onSuccess: (count) => toast.success(`${count} etiquetas generadas`),
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'No se pudieron generar las etiquetas');
    },
  });

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((value) => value !== id);
      if (prev.length >= MAX_LABELS) {
        toast.error(`Máximo ${MAX_LABELS} etiquetas por lote`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const selectVisible = () => {
    const visibleIds = items.map((item) => item.id);
    setSelected((prev) => Array.from(new Set([...prev, ...visibleIds])).slice(0, MAX_LABELS));
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to="/inventory"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeftIcon className="w-3.5 h-3.5" />
            Volver al inventario
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: '#1a202c' }}>
            Etiquetas del inventario
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#718096' }}>
            Etiquetas de 70 × 42 mm con QR · 12 por hoja A4.
          </p>
        </div>

        <button
          onClick={() => generateMutation.mutate()}
          disabled={selected.length === 0 || generateMutation.isPending}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm disabled:opacity-40"
          style={{ background: '#538f65' }}
        >
          {generateMutation.isPending ? (
            <ArrowPathIcon className="w-4 h-4 animate-spin" />
          ) : (
            <QrCodeIcon className="w-4 h-4" />
          )}
          {generateMutation.isPending
            ? 'Generando PDF…'
            : `Generar PDF (${selected.length})`}
        </button>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
        {/* Lista de bienes */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar bien por nombre, código o marca"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-gray-400">
                {selected.length} seleccionados
                {total > items.length && ` · mostrando ${items.length} de ${total}`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectVisible}
                  disabled={items.length === 0}
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

          <div className="max-h-[620px] overflow-y-auto divide-y divide-gray-50">
            {isLoading &&
              Array.from({ length: 8 }).map((_, index) => (
                <div key={`skeleton-${index}`} className="px-4 py-3 animate-pulse">
                  <div className="h-3 w-1/3 bg-gray-100 rounded mb-2" />
                  <div className="h-3 w-2/3 bg-gray-100 rounded" />
                </div>
              ))}

            {!isLoading &&
              items.map((item) => {
                const checked = selected.includes(item.id);
                return (
                  <label
                    key={item.id}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                      checked ? 'bg-green-50/50' : 'hover:bg-gray-50/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOne(item.id)}
                      className="mt-0.5 w-4 h-4 accent-[#538f65]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {item.nombre}
                        </p>
                        <span className="font-mono text-[11px] text-gray-400 flex-shrink-0">
                          {item.codigoInterno}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {[ambienteNombre(item), item.marca, item.modelo]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                  </label>
                );
              })}

            {!isLoading && items.length === 0 && (
              <div className="py-16 text-center">
                <QrCodeIcon className="w-9 h-9 mx-auto text-gray-300" />
                <p className="mt-2 text-sm font-semibold text-gray-500">
                  No se encontraron bienes
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
              Etiqueta viva
            </p>

            {previewLabel ? (
              <>
                <InventoryLabelPreview label={previewLabel} settings={settings} />
                <p className="mt-3 text-xs text-gray-500">
                  Vista previa de la primera etiqueta seleccionada. El PDF incluye{' '}
                  <span className="font-semibold">{selected.length}</span> etiqueta
                  {selected.length === 1 ? '' : 's'} distribuidas 2 × 6 por hoja A4.
                </p>
              </>
            ) : (
              <div className="aspect-[70/42] rounded-2xl border border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-center px-6">
                <QrCodeIcon className="w-8 h-8 text-gray-300" />
                <p className="mt-2 text-xs text-gray-500">
                  Selecciona un bien de la lista para ver su etiqueta.
                </p>
              </div>
            )}

            <div className="mt-4 space-y-2 text-[11px] text-gray-500">
              <p className="flex items-center gap-1.5">
                <CheckCircleIcon className="w-3.5 h-3.5 text-green-600" />
                Incluye logo institucional y QR de ficha pública.
              </p>
              <p className="flex items-center gap-1.5">
                <CheckCircleIcon className="w-3.5 h-3.5 text-green-600" />
                Compatible con etiquetas adhesivas 70 × 42 mm.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
