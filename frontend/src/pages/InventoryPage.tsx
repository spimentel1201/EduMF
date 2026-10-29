import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArchiveBoxIcon,
  ArrowUpTrayIcon,
  BanknotesIcon,
  BuildingOffice2Icon,
  CheckBadgeIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  QrCodeIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import InventoryLabelPreview from '@/components/InventoryLabelPreview';
import { inventoryService } from '@/services/inventoryService';
import { useInstitutionSettings } from '@/hooks/useInstitutionSettings';
import { useAuth } from '@/contexts/AuthContext';
import { generateInventoryLabelsPDF } from '@/utils/inventoryLabels';
import type {
  InventoryAmbiente,
  InventoryEstado,
  InventoryItem,
  InventoryLabelData,
} from '@/types/inventory';

const WRITE_ROLES = ['admin', 'Dirección', 'CIST', 'Auxiliar'];

const ESTADO_META: Record<string, { label: string; bg: string; text: string }> = {
  B: { label: 'Bueno', bg: 'bg-green-100', text: 'text-green-700' },
  R: { label: 'Regular', bg: 'bg-amber-100', text: 'text-amber-700' },
  N: { label: 'Nuevo', bg: 'bg-blue-100', text: 'text-blue-700' },
  '': { label: 'Sin estado', bg: 'bg-gray-100', text: 'text-gray-500' },
};

const currency = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  maximumFractionDigits: 2,
});

function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-PE');
}

function ambienteNombre(item: InventoryItem): string {
  if (item.ambiente && typeof item.ambiente === 'object') return item.ambiente.nombre;
  return item.ubicacion || 'Sin ambiente';
}

export default function InventoryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: settings } = useInstitutionSettings();
  const canWrite = WRITE_ROLES.includes(user?.role ?? '');

  const [search, setSearch] = useState('');
  const [ambiente, setAmbiente] = useState('');
  const [estado, setEstado] = useState('');
  const [tipoBien, setTipoBien] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [selected, setSelected] = useState<string[]>([]);
  const [drawer, setDrawer] = useState<InventoryItem | null>(null);

  const debouncedSearch = useDebouncedValue(search, 350);

  const { data: ambientes = [] } = useQuery<InventoryAmbiente[]>({
    queryKey: ['inventory-ambientes'],
    queryFn: inventoryService.getAmbientes,
  });

  const { data: stats } = useQuery({
    queryKey: ['inventory-stats'],
    queryFn: inventoryService.getStats,
  });

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['inventory', page, limit, debouncedSearch, ambiente, estado, tipoBien],
    queryFn: () =>
      inventoryService.getAll({
        page,
        limit,
        search: debouncedSearch || undefined,
        ambiente: ambiente || undefined,
        estado: estado || undefined,
        tipoBien: tipoBien || undefined,
      }),
  });

  const items = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.pagination.totalPages ?? 1;

  const { data: drawerLabels } = useQuery<InventoryLabelData[]>({
    queryKey: ['inventory-label', drawer?.id],
    queryFn: () => inventoryService.getLabels([drawer!.id]),
    enabled: Boolean(drawer?.id),
  });
  const drawerLabel = drawerLabels?.[0];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryService.remove(id),
    onSuccess: () => {
      toast.success('Bien eliminado del inventario');
      setDrawer(null);
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'No se pudo eliminar el bien');
    },
  });

  const resetPage = () => setPage(1);

  const clearFilters = () => {
    setSearch('');
    setAmbiente('');
    setEstado('');
    setTipoBien('');
    setPage(1);
  };

  const hasFilters = Boolean(search || ambiente || estado || tipoBien);
  const allSelected = items.length > 0 && items.every((item) => selected.includes(item.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => prev.filter((id) => !items.some((item) => item.id === id)));
    } else {
      const merged = Array.from(new Set([...selected, ...items.map((item) => item.id)]));
      if (merged.length > 200) {
        toast.error('Máximo 200 etiquetas por lote');
        return;
      }
      setSelected(merged);
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((value) => value !== id);
      if (prev.length >= 200) {
        toast.error('Máximo 200 etiquetas por lote');
        return prev;
      }
      return [...prev, id];
    });
  };

  const goodPercent = useMemo(() => {
    if (!stats?.totalBienes) return 0;
    const good = stats.porEstado.find((e) => e._id === 'B')?.count ?? 0;
    return Math.round((good / stats.totalBienes) * 100);
  }, [stats]);

  const handlePrintDrawer = () => {
    if (!drawerLabel) {
      toast.error('La etiqueta aún se está preparando');
      return;
    }
    generateInventoryLabelsPDF([drawerLabel], settings);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1a202c' }}>
            Inventario
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#718096' }}>
            Bienes patrimoniales de la institución · Anexo 03-A
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selected.length > 0 && (
            <button
              onClick={() => navigate(`/inventory/labels?ids=${selected.join(',')}`)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
            >
              <QrCodeIcon className="w-4 h-4" />
              Etiquetas ({selected.length})
            </button>
          )}
          {canWrite && (
            <Link
              to="/inventory/import"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
            >
              <ArrowUpTrayIcon className="w-4 h-4" />
              Importar Excel
            </Link>
          )}
          {canWrite && (
            <Link
              to="/inventory/new"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-colors"
              style={{ background: '#538f65' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#47795a')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#538f65')}
            >
              <PlusIcon className="w-4 h-4" />
              Nuevo bien
            </Link>
          )}
        </div>
      </div>

      {/* ── KPIs ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#eef6f0' }}>
              <ArchiveBoxIcon className="w-5 h-5" style={{ color: '#538f65' }} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Bienes registrados</p>
              <p className="text-xl font-bold tabular-nums" style={{ color: '#1a202c' }}>
                {stats?.totalBienes?.toLocaleString('es-PE') ?? '—'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <BanknotesIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Valor patrimonial</p>
              <p className="text-xl font-bold tabular-nums" style={{ color: '#1a202c' }}>
                {stats ? currency.format(stats.valorTotal) : '—'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
              <CheckBadgeIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">En buen estado</p>
              <p className="text-xl font-bold tabular-nums" style={{ color: '#1a202c' }}>
                {stats ? `${goodPercent}%` : '—'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <BuildingOffice2Icon className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Ambientes</p>
              <p className="text-xl font-bold tabular-nums" style={{ color: '#1a202c' }}>
                {ambientes.length || '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filtros ────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1 lg:max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, código, marca o serie"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 shadow-sm"
          />
        </div>

        <select
          value={ambiente}
          onChange={(e) => {
            setAmbiente(e.target.value);
            resetPage();
          }}
          className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
        >
          <option value="">Todos los ambientes</option>
          {ambientes.map((amb) => (
            <option key={amb.id} value={amb.id}>
              {amb.nombre}
            </option>
          ))}
        </select>

        <select
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value);
            resetPage();
          }}
          className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
        >
          <option value="">Todos los estados</option>
          <option value="B">Bueno</option>
          <option value="R">Regular</option>
          <option value="N">Nuevo</option>
        </select>

        <select
          value={tipoBien}
          onChange={(e) => {
            setTipoBien(e.target.value);
            resetPage();
          }}
          className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
        >
          <option value="">Todos los tipos</option>
          <option value="activo_fijo">Activo fijo</option>
          <option value="bien_menor">Bien menor</option>
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 shadow-sm"
          >
            <XMarkIcon className="w-3.5 h-3.5" />
            Limpiar
          </button>
        )}
      </div>

      {/* ── Tabla ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100" style={{ background: '#f8faf9' }}>
                <th className="pl-5 pr-2 py-3 w-9">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 accent-[#538f65] cursor-pointer"
                    aria-label="Seleccionar página"
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Código interno
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Bien
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Código SBN
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Ambiente
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Estado
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Cant.
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Valor S/
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {isLoading &&
                Array.from({ length: 8 }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="animate-pulse">
                    <td className="pl-5 pr-2 py-4">
                      <div className="w-4 h-4 bg-gray-100 rounded" />
                    </td>
                    {Array.from({ length: 8 }).map((__, cell) => (
                      <td key={cell} className="px-3 py-4">
                        <div className="h-3 bg-gray-100 rounded w-full max-w-[120px]" />
                      </td>
                    ))}
                  </tr>
                ))}

              {!isLoading &&
                items.map((item) => {
                  const estadoMeta = ESTADO_META[item.estado ?? ''] ?? ESTADO_META[''];
                  const isSelected = selected.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setDrawer(item)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-green-50/40' : 'hover:bg-gray-50/60'
                      }`}
                    >
                      <td className="pl-5 pr-2 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(item.id)}
                          className="w-4 h-4 accent-[#538f65] cursor-pointer"
                          aria-label={`Seleccionar ${item.nombre}`}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-mono text-xs text-gray-600">
                          {item.codigoInterno}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-gray-900 leading-tight">
                          {item.nombre}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[280px]">
                          {[item.marca, item.modelo, item.serieDimensiones]
                            .filter(Boolean)
                            .join(' · ') || 'Sin marca / modelo'}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-mono text-xs text-gray-500">
                          {item.codigoSBNGeneral || '—'}
                          {item.codigoSBNCorrelativo ? ` · ${item.codigoSBNCorrelativo}` : ''}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-600 max-w-[160px] truncate">
                        {ambienteNombre(item)}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${estadoMeta.bg} ${estadoMeta.text}`}
                        >
                          {estadoMeta.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-gray-600">
                        {item.cantidad}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-gray-600">
                        {currency.format(item.valorTotal || 0)}
                      </td>
                      <td
                        className="px-5 py-3 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => setDrawer(item)}
                          className="text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          Ver
                        </button>
                        {canWrite && (
                          <Link
                            to={`/inventory/${item.id}/edit`}
                            className="ml-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            Editar
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}

              {!isLoading && !isError && items.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <ArchiveBoxIcon className="w-10 h-10 mx-auto text-gray-300" />
                    <p className="mt-3 text-sm font-semibold text-gray-600">
                      {hasFilters ? 'No hay bienes con esos filtros' : 'Aún no hay bienes registrados'}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {hasFilters
                        ? 'Prueba limpiando los filtros de búsqueda.'
                        : 'Importa el Excel del inventario o registra el primer bien manualmente.'}
                    </p>
                    {!hasFilters && canWrite && (
                      <div className="mt-5 flex items-center justify-center gap-2">
                        <Link
                          to="/inventory/import"
                          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                        >
                          Importar Excel
                        </Link>
                        <Link
                          to="/inventory/new"
                          className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white"
                          style={{ background: '#538f65' }}
                        >
                          Nuevo bien
                        </Link>
                      </div>
                    )}
                  </td>
                </tr>
              )}

              {isError && (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
                    <p className="text-sm font-semibold text-red-600">
                      No se pudo cargar el inventario
                    </p>
                    <button
                      onClick={() => refetch()}
                      className="mt-3 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                      Reintentar
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={limit}
          onPageChange={setPage}
          onPageSizeChange={setLimit}
          pageSizeOptions={[10, 25, 50, 100]}
          itemLabel="bienes"
        />
      </div>

      {isFetching && !isLoading && (
        <p className="text-xs text-gray-400 text-right">Actualizando…</p>
      )}

      {/* ── Drawer de detalle ─────────────────────────────────────────── */}
      {drawer && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
            onClick={() => setDrawer(null)}
          />

          <aside className="relative w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Ficha del bien
                </p>
                <p className="font-mono text-sm text-gray-600 mt-0.5">
                  {drawer.codigoInterno}
                </p>
              </div>
              <button
                onClick={() => setDrawer(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                aria-label="Cerrar"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {drawerLabel ? (
                <InventoryLabelPreview label={drawerLabel} settings={settings} />
              ) : (
                <div className="aspect-[70/42] rounded-2xl border border-dashed border-gray-200 bg-gray-50 animate-pulse" />
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handlePrintDrawer}
                  disabled={!drawerLabel}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                  style={{ background: '#538f65' }}
                >
                  <QrCodeIcon className="w-4 h-4" />
                  Etiqueta PDF
                </button>
                {canWrite && (
                  <>
                    <Link
                      to={`/inventory/${drawer.id}/edit`}
                      className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                      Editar
                    </Link>
                    <button
                      onClick={() => {
                        if (window.confirm(`¿Eliminar "${drawer.nombre}" del inventario?`)) {
                          deleteMutation.mutate(drawer.id);
                        }
                      }}
                      className="col-span-2 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Eliminar del inventario
                    </button>
                  </>
                )}
              </div>

              <div>
                <h3 className="text-sm font-bold" style={{ color: '#1a202c' }}>
                  {drawer.nombre}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {[drawer.marca, drawer.modelo].filter(Boolean).join(' · ') || 'Sin marca registrada'}
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {[
                  ['Código SBN', drawer.codigoSBNGeneral || '—'],
                  ['Correlativo', drawer.codigoSBNCorrelativo || '—'],
                  ['Ambiente', ambienteNombre(drawer)],
                  ['Ubicación', drawer.ubicacion || '—'],
                  ['Estado', ESTADO_META[drawer.estado ?? '']?.label ?? '—'],
                  ['Condición', drawer.condicion || '—'],
                  ['Cantidad', `${drawer.cantidad} ${drawer.unidadMedida}`],
                  ['Tipo', drawer.tipoBien === 'bien_menor' ? 'Bien menor' : 'Activo fijo'],
                  ['Valor unitario', currency.format(drawer.valorUnitario || 0)],
                  ['Valor total', currency.format(drawer.valorTotal || 0)],
                  ['Fecha de ingreso', formatDate(drawer.fechaIngreso)],
                  ['Año inventario', String(drawer.anioInventario || '—')],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[11px] uppercase tracking-wide font-semibold text-gray-400">
                      {label}
                    </dt>
                    <dd className="text-gray-800 mt-0.5 break-words">{value}</dd>
                  </div>
                ))}
              </dl>

              {(drawer.entidadDependencia ||
                drawer.documentoSustentatorio ||
                drawer.serieDimensiones ||
                drawer.color) && (
                <div className="pt-4 border-t border-gray-100 space-y-2 text-xs text-gray-600">
                  {drawer.serieDimensiones && (
                    <p>
                      <span className="font-semibold text-gray-500">Serie / dimensiones: </span>
                      {drawer.serieDimensiones}
                    </p>
                  )}
                  {drawer.color && (
                    <p>
                      <span className="font-semibold text-gray-500">Color: </span>
                      {drawer.color}
                    </p>
                  )}
                  {drawer.entidadDependencia && (
                    <p>
                      <span className="font-semibold text-gray-500">Procedencia: </span>
                      {drawer.entidadDependencia}
                    </p>
                  )}
                  {drawer.documentoSustentatorio && (
                    <p>
                      <span className="font-semibold text-gray-500">Documento: </span>
                      {drawer.documentoSustentatorio}
                    </p>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
