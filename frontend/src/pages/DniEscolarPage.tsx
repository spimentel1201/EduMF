import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpTrayIcon,
  CalendarDateRangeIcon,
  CheckBadgeIcon,
  IdentificationIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PhotoIcon,
  PrinterIcon,
  TrashIcon,
  UserPlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import DniCardPreview from '@/components/DniCardPreview';
import { dniEscolarService } from '@/services/dniEscolarService';
import { useInstitutionSettings } from '@/hooks/useInstitutionSettings';
import { useAuth } from '@/contexts/AuthContext';
import { generateDniCardsPDF, generateDniTestPagePDF } from '@/utils/dniEscolarPdf';
import type { DniEscolar } from '@/types/dniEscolar';

const WRITE_ROLES = ['admin', 'Dirección', 'CIST', 'Auxiliar'];

function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function apellidosNombre(dni: DniEscolar): string {
  return [dni.primerApellido, dni.segundoApellido, dni.preNombres]
    .filter(Boolean)
    .join(' ');
}

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-PE');
}

export default function DniEscolarPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: settings } = useInstitutionSettings();
  const canWrite = WRITE_ROLES.includes(user?.role ?? '');

  const [search, setSearch] = useState('');
  const [sexo, setSexo] = useState('');
  const [conFoto, setConFoto] = useState<'' | 'si' | 'no'>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [selected, setSelected] = useState<string[]>([]);
  const [drawer, setDrawer] = useState<DniEscolar | null>(null);

  const debouncedSearch = useDebouncedValue(search, 350);

  const { data: stats } = useQuery({
    queryKey: ['dni-escolar-stats'],
    queryFn: dniEscolarService.getStats,
  });

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['dni-escolar', page, limit, debouncedSearch, sexo, conFoto],
    queryFn: () =>
      dniEscolarService.getAll({
        page,
        limit,
        search: debouncedSearch || undefined,
        sexo: sexo || undefined,
        conFoto: conFoto || undefined,
      }),
  });

  const dnis = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.pagination.totalPages ?? 1;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dniEscolarService.remove(id),
    onSuccess: () => {
      toast.success('DNI escolar eliminado');
      setDrawer(null);
      queryClient.invalidateQueries({ queryKey: ['dni-escolar'] });
      queryClient.invalidateQueries({ queryKey: ['dni-escolar-stats'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'No se pudo eliminar el DNI');
    },
  });

  const resetPage = () => setPage(1);

  const clearFilters = () => {
    setSearch('');
    setSexo('');
    setConFoto('');
    setPage(1);
  };

  const hasFilters = Boolean(search || sexo || conFoto);
  const allSelected = dnis.length > 0 && dnis.every((dni) => selected.includes(dni.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => prev.filter((id) => !dnis.some((dni) => dni.id === id)));
    } else {
      const merged = Array.from(new Set([...selected, ...dnis.map((dni) => dni.id)]));
      if (merged.length > 200) {
        toast.error('Máximo 200 DNIs por impresión');
        return;
      }
      setSelected(merged);
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((value) => value !== id);
      if (prev.length >= 200) {
        toast.error('Máximo 200 DNIs por impresión');
        return prev;
      }
      return [...prev, id];
    });
  };

  const kpis = useMemo(
    () => [
      {
        label: 'DNIs generados',
        value: stats?.total?.toLocaleString('es-PE') ?? '—',
        icon: IdentificationIcon,
        bg: '#eef6f0',
        color: '#538f65',
      },
      {
        label: 'Con foto',
        value: stats?.conFoto?.toLocaleString('es-PE') ?? '—',
        icon: CheckBadgeIcon,
        bg: '#eff6ff',
        color: '#2563eb',
      },
      {
        label: 'Sin foto',
        value: stats?.sinFoto?.toLocaleString('es-PE') ?? '—',
        icon: PhotoIcon,
        bg: '#fffbeb',
        color: '#d97706',
      },
      {
        label: 'Años registrados',
        value: stats?.porAnio?.length ? String(stats.porAnio.length) : '—',
        icon: CalendarDateRangeIcon,
        bg: '#f5f3ff',
        color: '#7c3aed',
      },
    ],
    [stats]
  );

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1a202c' }}>
            DNI Escolar
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#718096' }}>
            Documento de Identidad Escolar (DIE) · 9 tarjetas por hoja A4
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selected.length > 0 && (
            <button
              onClick={() => navigate(`/dni-escolar/print?ids=${selected.join(',')}`)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
            >
              <PrinterIcon className="w-4 h-4" />
              Imprimir ({selected.length})
            </button>
          )}
          {canWrite && (
            <>
              <Link
                to="/dni-escolar/fotos"
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
              >
                <PhotoIcon className="w-4 h-4" />
                Cargar fotos ZIP
              </Link>
              <Link
                to="/dni-escolar/generar"
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
              >
                <UserPlusIcon className="w-4 h-4" />
                Generar desde matrícula
              </Link>
              <Link
                to="/dni-escolar/new"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-colors"
                style={{ background: '#538f65' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#47795a')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#538f65')}
              >
                Nuevo DNI
              </Link>
            </>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: kpi.bg }}
              >
                <kpi.icon className="w-5 h-5" style={{ color: kpi.color }} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{kpi.label}</p>
                <p className="text-xl font-bold tabular-nums" style={{ color: '#1a202c' }}>
                  {kpi.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1 lg:max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por CUI, apellido o nombre"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 shadow-sm"
          />
        </div>

        <select
          value={sexo}
          onChange={(e) => {
            setSexo(e.target.value);
            resetPage();
          }}
          className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
        >
          <option value="">Todos los sexos</option>
          <option value="M">Masculino</option>
          <option value="F">Femenino</option>
        </select>

        <select
          value={conFoto}
          onChange={(e) => {
            setConFoto(e.target.value as '' | 'si' | 'no');
            resetPage();
          }}
          className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
        >
          <option value="">Con y sin foto</option>
          <option value="si">Solo con foto</option>
          <option value="no">Solo sin foto</option>
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

      {/* Tabla */}
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
                  CUI
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Estudiante
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Sexo
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Foto
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Emisión
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Caducidad
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
                    {Array.from({ length: 7 }).map((__, cell) => (
                      <td key={cell} className="px-3 py-4">
                        <div className="h-3 bg-gray-100 rounded w-full max-w-[120px]" />
                      </td>
                    ))}
                  </tr>
                ))}

              {!isLoading &&
                dnis.map((dni) => {
                  const isSelected = selected.includes(dni.id);
                  return (
                    <tr
                      key={dni.id}
                      onClick={() => setDrawer(dni)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-green-50/40' : 'hover:bg-gray-50/60'
                      }`}
                    >
                      <td className="pl-5 pr-2 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(dni.id)}
                          className="w-4 h-4 accent-[#538f65] cursor-pointer"
                          aria-label={`Seleccionar ${apellidosNombre(dni)}`}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-mono text-xs text-gray-600">{dni.cui}</span>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-gray-900 leading-tight">
                          {apellidosNombre(dni)}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {[dni.departamento, dni.provincia, dni.distrito]
                            .filter(Boolean)
                            .join(' · ') || 'Ubicación sin registrar'}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            dni.sexo === 'F'
                              ? 'bg-pink-100 text-pink-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {dni.sexo}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {dni.fotoBase64 ? (
                          <CheckBadgeIcon className="w-5 h-5 text-green-600 inline" />
                        ) : (
                          <PhotoIcon className="w-5 h-5 text-gray-300 inline" />
                        )}
                      </td>
                      <td className="px-3 py-3 text-gray-600">{formatDate(dni.fechaEmision)}</td>
                      <td className="px-3 py-3 text-gray-600">{formatDate(dni.fechaCaducidad)}</td>
                      <td
                        className="px-5 py-3 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => setDrawer(dni)}
                          className="text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          Ver
                        </button>
                        {canWrite && (
                          <Link
                            to={`/dni-escolar/${dni.id}/edit`}
                            className="ml-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            Editar
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}

              {!isLoading && !isError && dnis.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <IdentificationIcon className="w-10 h-10 mx-auto text-gray-300" />
                    <p className="mt-3 text-sm font-semibold text-gray-600">
                      {hasFilters
                        ? 'No hay DNIs con esos filtros'
                        : 'Aún no hay DNIs escolares generados'}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {hasFilters
                        ? 'Prueba limpiando los filtros de búsqueda.'
                        : canWrite
                        ? 'Genera los DNIs desde la matrícula o registra uno manualmente.'
                        : 'Contacta con el CIST para generar los DNIs.'}
                    </p>
                    {!hasFilters && canWrite && (
                      <div className="mt-5 flex items-center justify-center gap-2">
                        <Link
                          to="/dni-escolar/generar"
                          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                        >
                          Generar desde matrícula
                        </Link>
                        <Link
                          to="/dni-escolar/new"
                          className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white"
                          style={{ background: '#538f65' }}
                        >
                          Nuevo DNI
                        </Link>
                      </div>
                    )}
                  </td>
                </tr>
              )}

              {isError && (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <p className="text-sm font-semibold text-red-600">
                      No se pudo cargar el listado de DNIs
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
          itemLabel="DNIs"
        />
      </div>

      {isFetching && !isLoading && (
        <p className="text-xs text-gray-400 text-right">Actualizando…</p>
      )}

      {/* Drawer de detalle */}
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
                  Ficha del DNI escolar
                </p>
                <p className="font-mono text-sm text-gray-600 mt-0.5">{drawer.cui}</p>
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
              <DniCardPreview dni={drawer} settings={settings} />

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    generateDniCardsPDF([drawer], settings, 'duplex');
                    toast.success('PDF del DNI descargado');
                  }}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: '#538f65' }}
                >
                  <PrinterIcon className="w-4 h-4" />
                  PDF (frente y reverso)
                </button>
                <button
                  onClick={() => generateDniTestPagePDF()}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                  title="Hoja de prueba para calibrar la impresión dúplex"
                >
                  Hoja de prueba
                </button>

                {canWrite && (
                  <>
                    <Link
                      to={`/dni-escolar/${drawer.id}/edit`}
                      className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                      Editar
                    </Link>
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            `¿Eliminar el DNI de "${apellidosNombre(drawer)}"?`
                          )
                        ) {
                          deleteMutation.mutate(drawer.id);
                        }
                      }}
                      className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Eliminar
                    </button>
                  </>
                )}
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {[
                  ['CUI', drawer.cui],
                  ['Pre Nombres', drawer.preNombres || '—'],
                  ['Primer Apellido', drawer.primerApellido || '—'],
                  ['Segundo Apellido', drawer.segundoApellido || '—'],
                  ['Sexo', drawer.sexo],
                  ['Nacimiento', formatDate(drawer.fechaNacimiento)],
                  ['Ubigeo', drawer.ubigeoNacimiento || '—'],
                  ['Departamento', drawer.departamento || '—'],
                  ['Provincia', drawer.provincia || '—'],
                  ['Distrito', drawer.distrito || '—'],
                  ['Inscripción', formatDate(drawer.fechaInscripcion)],
                  ['Donación de órganos', drawer.donacionOrganos === 'Si' ? 'Sí' : 'No'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[11px] uppercase tracking-wide font-semibold text-gray-400">
                      {label}
                    </dt>
                    <dd className="text-gray-800 mt-0.5 break-words">{value}</dd>
                  </div>
                ))}
              </dl>

              {drawer.direccion && (
                <div className="pt-4 border-t border-gray-100 space-y-2 text-xs text-gray-600">
                  <p>
                    <span className="font-semibold text-gray-500">Dirección: </span>
                    {drawer.direccion}
                  </p>
                  {drawer.observaciones && (
                    <p>
                      <span className="font-semibold text-gray-500">Observaciones: </span>
                      {drawer.observaciones}
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
