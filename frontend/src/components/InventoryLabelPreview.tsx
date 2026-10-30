import type { InstitutionSettings } from '@/types/institution';
import type { InventoryLabelData } from '@/types/inventory';

const DEFAULT_INSTITUTION = 'I.E. FRANCISCO LÓPEZ DE ROMAÑA';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1 min-w-0">
      <span className="text-[8px] font-bold text-gray-600 whitespace-nowrap">{label}</span>
      <span className="flex-1 min-w-0 border-b border-dotted border-gray-300 pb-[1px]">
        <span className="block text-[9px] leading-tight text-gray-900 truncate">{value || '—'}</span>
      </span>
    </div>
  );
}

/**
 * "Etiqueta viva": vista previa en pantalla del diseño exacto que se imprime
 * en el PDF (proporción real 70 × 42 mm).
 */
export default function InventoryLabelPreview({
  label,
  settings,
  className = '',
}: {
  label: InventoryLabelData;
  settings?: InstitutionSettings;
  className?: string;
}) {
  const institutionName = settings?.name?.trim() || DEFAULT_INSTITUTION;

  return (
    <div
      className={`relative w-full rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden ${className}`}
      style={{ aspectRatio: '70 / 42' }}
    >
      <div className="p-3.5 pr-16 h-full flex flex-col">
        <div className="flex items-start gap-2">
          {settings?.logoBase64 ? (
            <img
              src={settings.logoBase64}
              alt="Logo institucional"
              className="w-11 h-11 object-contain flex-shrink-0"
            />
          ) : (
            <div
              className="w-11 h-11 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: '#538f65' }}
            >
              IE
            </div>
          )}

          <div className="min-w-0">
            <p
              className="text-[12px] font-bold leading-[1.1] line-clamp-2"
              style={{ color: '#1a202c' }}
            >
              {institutionName}
            </p>
            <span className="inline-flex mt-1 px-2 py-[2px] rounded-md bg-[#2b303b] text-white text-[8px] font-bold tracking-wide">
              AÑO: {label.anioInventario}
            </span>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-gray-200 flex-1 flex flex-col justify-end gap-[7px]">
          <Field label="Nombre del Bien:" value={label.nombre} />
          <Field label="Código SBN:" value={label.codigoSBN} />
          <Field label="Código Interno:" value={label.codigoInterno} />
          <Field label="Ambiente:" value={label.ambiente} />
        </div>
      </div>

      {label.qrDataUrl && (
        <img
          src={label.qrDataUrl}
          alt={`QR ${label.codigoInterno}`}
          className="absolute bottom-3 right-3 w-14 h-14 rounded-md"
        />
      )}
    </div>
  );
}
