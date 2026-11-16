import type { InstitutionSettings } from '@/types/institution';
import type { DniEscolar } from '@/types/dniEscolar';
import { formatDniFecha, formatDniFechaNacimiento, mrzFor } from '@/utils/dniEscolarPdf';

const DEFAULT_INSTITUTION = 'I.E. FRANCISCO LÓPEZ DE ROMAÑA';

const GREEN = '#15773c';
const INK = '#0a0a0a';

function FotoDni({ dni }: { dni: DniEscolar }) {
  if (dni.fotoBase64) {
    return (
      <img
        src={dni.fotoBase64}
        alt={`Foto ${dni.preNombres}`}
        className="w-full h-full object-cover"
      />
    );
  }
  return (
    <div className="w-full h-full bg-gray-300 flex flex-col items-center justify-end overflow-hidden">
      <div className="w-1/2 aspect-square rounded-full bg-gray-400 mb-[6%]" />
      <div className="w-[80%] h-[45%] rounded-t-full bg-gray-400" />
    </div>
  );
}

/** Anverso del DNI Escolar (réplica del diseño físico). */
export function DniCardFrente({
  dni,
  settings,
}: {
  dni: DniEscolar;
  settings?: InstitutionSettings;
}) {
  const cui = dni.cui || '';

  return (
    <div
      className="relative w-full rounded-md overflow-hidden shadow-sm border"
      style={{ aspectRatio: '85.6 / 54', background: '#ffdf3e', borderColor: INK }}
    >
      {/* Encabezado */}
      <div className="absolute inset-x-[3%] top-[3.5%] flex items-start justify-between">
        <div className="min-w-0">
          <p
            className="font-bold leading-[1.25]"
            style={{ color: INK, fontSize: 'clamp(4px, 6.2cqw, 7px)' }}
          >
            REPUBLICA DEL PERÚ
          </p>
          <p
            className="font-bold leading-[1.2]"
            style={{ color: INK, fontSize: 'clamp(3px, 4.6cqw, 5.5px)' }}
          >
            REGISTRO NACIONAL DE IDENTIFICACIÓN Y ESTADO CIVIL
          </p>
        </div>
        <div className="text-right flex-shrink-0 pl-1">
          <p className="font-bold leading-[1.25]" style={{ color: INK, fontSize: 'clamp(4px, 5.4cqw, 6px)' }}>
            CUI
          </p>
          <p
            className="font-bold leading-[1.2] break-all"
            style={{ color: INK, fontSize: 'clamp(3.4px, 6cqw, 7.6px)' }}
          >
            {cui}
          </p>
        </div>
      </div>

      {/* Banda DIE */}
      <div
        className="absolute inset-x-[2%] top-[17%] h-[8%] flex items-center justify-center px-[1.5%]"
        style={{ background: '#facd2d' }}
      >
        <p
          className="font-bold text-center"
          style={{ color: INK, fontSize: 'clamp(4px, 6.4cqw, 7.5px)' }}
        >
          DOCUMENTO DE IDENTIDAD ESCOLAR — DIE
        </p>
      </div>

      {/* Columna izquierda: CUI vertical + foto + apellido */}
      <div
        className="absolute left-[4.4%] top-[29%] w-[24%] h-[54%] flex"
        style={{ containerType: 'inline-size' }}
      >
        <div className="flex items-center justify-center w-[18%] h-full">
          <span
            className="font-bold whitespace-nowrap"
            style={{
              color: INK,
              fontSize: 'clamp(3px, 17cqw, 7px)',
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              letterSpacing: '0.02em',
            }}
          >
            {cui}
          </span>
        </div>
        <div className="flex-1 h-full flex flex-col">
          <div className="flex-1 overflow-hidden bg-gray-200 border border-black/10">
            <FotoDni dni={dni} />
          </div>
          <p
            className="font-bold text-center leading-[1.5] truncate"
            style={{ color: INK, fontSize: 'clamp(3px, 15cqw, 7px)' }}
          >
            {dni.primerApellido}
          </p>
        </div>
      </div>

      {/* Campos */}
      <div
        className="absolute left-[31%] top-[29%] right-[25%] bottom-[5%]"
        style={{ containerType: 'inline-size' }}
      >
        <div className="h-full flex flex-col justify-between">
          <div>
            <p className="font-bold" style={{ fontSize: 'clamp(2.6px, 13cqw, 5.6px)' }}>
              Primer Apellido
            </p>
            <p
              className="font-bold truncate"
              style={{ fontSize: 'clamp(3px, 16cqw, 7px)', marginTop: '2%' }}
            >
              {dni.primerApellido || '—'}
            </p>
          </div>
          <div>
            <p className="font-bold" style={{ fontSize: 'clamp(2.6px, 13cqw, 5.6px)' }}>
              Segundo Apellido
            </p>
            <p
              className="font-bold truncate"
              style={{ fontSize: 'clamp(3px, 16cqw, 7px)', marginTop: '2%' }}
            >
              {dni.segundoApellido || '—'}
            </p>
          </div>
          <div>
            <p className="font-bold" style={{ fontSize: 'clamp(2.6px, 13cqw, 5.6px)' }}>
              Pre Nombres
            </p>
            <p
              className="font-bold truncate"
              style={{ fontSize: 'clamp(3px, 16cqw, 7px)', marginTop: '2%' }}
            >
              {dni.preNombres || '—'}
            </p>
          </div>
          <div>
            <p className="font-bold" style={{ fontSize: 'clamp(2.6px, 13cqw, 5.6px)' }}>
              Nacimiento <span className="font-semibold">Fecha y Ubigeo</span>
            </p>
            <p
              className="font-bold"
              style={{ fontSize: 'clamp(3px, 16cqw, 7px)', marginTop: '2%' }}
            >
              {formatDniFechaNacimiento(dni.fechaNacimiento) || '—'}
            </p>
          </div>
          <div>
            <p className="font-bold" style={{ fontSize: 'clamp(2.6px, 13cqw, 5.6px)' }}>
              Sexo
            </p>
            <p className="font-bold" style={{ fontSize: 'clamp(3px, 16cqw, 7px)', marginTop: '2%' }}>
              {dni.sexo || '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Caja de fechas */}
      <div
        className="absolute right-[2.5%] top-[29%] w-[23.5%] h-[33%] flex flex-col"
        style={{ border: `1px solid ${INK}` }}
      >
        {(
          [
            ['Fecha de inscripción', dni.fechaInscripcion],
            ['Fecha de emisión', dni.fechaEmision],
            ['Fecha de caducidad', dni.fechaCaducidad],
          ] as const
        ).map(([label, value], index) => (
          <div
            key={label}
            className="flex-1 flex flex-col items-center justify-center px-[4%]"
            style={{ borderTop: index === 0 ? 'none' : `1px solid ${INK}` }}
          >
            <p
              className="font-bold text-center leading-[1.15]"
              style={{ fontSize: 'clamp(2.4px, 11cqw, 4.8px)' }}
            >
              {label}
            </p>
            <p
              className="font-bold leading-[1.3]"
              style={{ color: INK, fontSize: 'clamp(3px, 14cqw, 6.4px)' }}
            >
              {formatDniFecha(value) || '—'}
            </p>
          </div>
        ))}
      </div>

      {/* Escudo */}
      {settings?.logoBase64 ? (
        <img
          src={settings.logoBase64}
          alt="Escudo institucional"
          className="absolute object-contain"
          style={{ right: '3%', bottom: '8%', width: '15%', maxHeight: '27%' }}
        />
      ) : null}

      {/* MRZ */}
      <p
        className="absolute left-[3.5%] bottom-[3%] right-[3.5%] font-bold truncate"
        style={{ fontFamily: 'var(--font-mono, "Courier New", monospace)', fontSize: 'clamp(3px, 9.6cqw, 11px)' }}
      >
        {mrzFor(cui)}
        {'<'.repeat(28)}
      </p>
    </div>
  );
}

/** Reverso del DNI Escolar. */
export function DniCardReverso({ dni }: { dni: DniEscolar }) {
  return (
    <div
      className="relative w-full rounded-md overflow-hidden shadow-sm border"
      style={{ aspectRatio: '85.6 / 54', background: '#ffdf3e', borderColor: INK }}
    >
      {/* Constancias de sufragio */}
      <div className="absolute inset-x-[3%] top-[6%] h-[31%] grid grid-cols-3 gap-[2%]">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="flex flex-col items-center justify-center"
            style={{ border: `1px solid ${INK}` }}
          >
            <p className="font-bold leading-[1.3]" style={{ color: GREEN, fontSize: 'clamp(2.6px, 5.6cqw, 6px)' }}>
              CONSTANCIA
            </p>
            <p className="font-bold leading-[1.3]" style={{ color: GREEN, fontSize: 'clamp(2.6px, 5.6cqw, 6px)' }}>
              DE
            </p>
            <p className="font-bold leading-[1.3]" style={{ color: GREEN, fontSize: 'clamp(2.6px, 5.6cqw, 6px)' }}>
              SUFRAGIO
            </p>
          </div>
        ))}
      </div>

      {/* Ubicación */}
      <div className="absolute left-[3.5%] right-[3.5%] top-[47%]" style={{ containerType: 'inline-size' }}>
        <div className="flex gap-[10%]">
          {(
            [
              ['Departamento', dni.departamento],
              ['Provincia', dni.provincia],
              ['Distrito', dni.distrito],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="min-w-0">
              <p className="font-bold" style={{ fontSize: 'clamp(2.6px, 12cqw, 5.6px)' }}>
                {label}
              </p>
              <p
                className="font-bold truncate"
                style={{ fontSize: 'clamp(3px, 15cqw, 7px)', marginTop: '3%' }}
              >
                {value || '—'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Dirección */}
      <div className="absolute left-[3.5%] right-[3.5%] top-[62%]" style={{ containerType: 'inline-size' }}>
        <p className="font-bold" style={{ fontSize: 'clamp(2.6px, 12cqw, 5.6px)' }}>
          Dirección:
        </p>
        <p
          className="font-bold leading-[1.25]"
          style={{ fontSize: 'clamp(3px, 14cqw, 6.6px)', marginTop: '3%' }}
        >
          {dni.direccion || '—'}
        </p>
      </div>

      {/* Observaciones */}
      <div className="absolute left-[3.5%] right-[3.5%] top-[79%]" style={{ containerType: 'inline-size' }}>
        <p style={{ fontSize: 'clamp(2.6px, 12cqw, 5.6px)' }}>Observaciones</p>
        <p style={{ fontSize: 'clamp(3px, 13cqw, 6px)', marginTop: '3%' }}>
          Donación de órganos:{' '}
          <span className="font-bold">{dni.donacionOrganos === 'Si' ? 'Sí' : 'No'}</span>
        </p>
      </div>
    </div>
  );
}

export default function DniCardPreview({
  dni,
  settings,
  className = '',
}: {
  dni: DniEscolar;
  settings?: InstitutionSettings;
  className?: string;
}) {
  const institutionName = settings?.name?.trim() || DEFAULT_INSTITUTION;

  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
          Anverso · {institutionName}
        </p>
        <DniCardFrente dni={dni} settings={settings} />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
          Reverso
        </p>
        <DniCardReverso dni={dni} />
      </div>
    </div>
  );
}
