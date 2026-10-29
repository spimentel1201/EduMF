import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArchiveBoxIcon,
  BuildingOffice2Icon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { inventoryService } from '@/services/inventoryService';
import { usePublicInstitutionSettings } from '@/hooks/useInstitutionSettings';

const ESTADO_META: Record<string, { label: string; bg: string; text: string }> = {
  B: { label: 'Buen estado', bg: 'bg-green-100', text: 'text-green-700' },
  R: { label: 'Estado regular', bg: 'bg-amber-100', text: 'text-amber-700' },
  N: { label: 'Nuevo', bg: 'bg-blue-100', text: 'text-blue-700' },
  '': { label: 'Sin estado registrado', bg: 'bg-gray-100', text: 'text-gray-500' },
};

export default function PublicInventoryItemPage() {
  const { codigoInterno = '' } = useParams<{ codigoInterno: string }>();
  const { data: settings } = usePublicInstitutionSettings();

  const { data: item, isLoading, isError } = useQuery({
    queryKey: ['public-inventory-item', codigoInterno],
    queryFn: () => inventoryService.getPublicItem(codigoInterno),
    enabled: Boolean(codigoInterno),
    retry: false,
  });

  useEffect(() => {
    document.title = item ? `${item.nombre} · Inventario` : 'Inventario institucional';
  }, [item]);

  return (
    <div className="min-h-screen bg-[#f4f7f6] px-4 py-10 flex flex-col items-center">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
            {settings?.logoBase64 ? (
              <img
                src={settings.logoBase64}
                alt="Logo institucional"
                className="w-12 h-12 object-contain"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                style={{ background: '#538f65' }}
              >
                IE
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight" style={{ color: '#1a202c' }}>
                {settings?.name || 'I.E. Francisco López de Romaña'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Inventario de bienes patrimoniales</p>
            </div>
          </div>

          <div className="p-6">
            {isLoading && (
              <div className="space-y-3 animate-pulse">
                <div className="h-4 w-2/3 bg-gray-100 rounded" />
                <div className="h-3 w-1/2 bg-gray-100 rounded" />
                <div className="h-24 bg-gray-50 rounded-xl mt-6" />
              </div>
            )}

            {isError && (
              <div className="text-center py-8">
                <ExclamationTriangleIcon className="w-10 h-10 mx-auto text-amber-400" />
                <p className="mt-3 text-sm font-semibold text-gray-700">
                  No encontramos este bien
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Verifica el código escaneado o consulta con el área de patrimonio.
                </p>
              </div>
            )}

            {item && (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      Ficha pública del bien
                    </p>
                    <h1 className="text-xl font-bold mt-1" style={{ color: '#1a202c' }}>
                      {item.nombre}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                      {[item.marca, item.modelo].filter(Boolean).join(' · ') ||
                        'Sin marca registrada'}
                    </p>
                  </div>
                  <span
                    className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                      ESTADO_META[item.estado ?? '']?.bg ?? ESTADO_META[''].bg
                    } ${ESTADO_META[item.estado ?? '']?.text ?? ESTADO_META[''].text}`}
                  >
                    {ESTADO_META[item.estado ?? '']?.label ?? 'Sin estado'}
                  </span>
                </div>

                <div className="mt-5 rounded-xl bg-[#f8faf9] border border-gray-100 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Código interno
                  </p>
                  <p className="font-mono text-lg font-bold mt-1" style={{ color: '#538f65' }}>
                    {item.codigoInterno}
                  </p>
                  {item.codigoSBNGeneral && (
                    <p className="text-xs text-gray-500 mt-1">
                      Código SBN: {item.codigoSBNGeneral}
                      {item.codigoSBNCorrelativo ? ` · ${item.codigoSBNCorrelativo}` : ''}
                    </p>
                  )}
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                  {[
                    [
                      'Ambiente',
                      item.ambiente && typeof item.ambiente === 'object'
                        ? item.ambiente.nombre
                        : item.ubicacion || 'Sin ambiente',
                    ],
                    ['Cantidad', `${item.cantidad} ${item.unidadMedida}`],
                    ['Serie / dimensiones', item.serieDimensiones || '—'],
                    ['Color', item.color || '—'],
                    ['Tipo', item.tipoBien === 'bien_menor' ? 'Bien menor' : 'Activo fijo'],
                    ['Año de inventario', String(item.anioInventario)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-1">
                        {label === 'Ambiente' && (
                          <BuildingOffice2Icon className="w-3.5 h-3.5" />
                        )}
                        {label}
                      </dt>
                      <dd className="text-gray-800 mt-1 break-words">{value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-5 flex items-center gap-2 rounded-xl bg-green-50 border border-green-100 px-3 py-2.5">
                  <CheckBadgeIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <p className="text-[11px] text-green-800">
                    Bien registrado en el inventario institucional. Para consultas o bajas,
                    comunícate con la dirección.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-5 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600"
          >
            <ArchiveBoxIcon className="w-3.5 h-3.5" />
            Sistema de Gestión Escolar
          </Link>
        </div>
      </div>
    </div>
  );
}
