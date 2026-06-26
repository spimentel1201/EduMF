import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { sectionService } from '@/services/sectionService';
import { enrollmentService } from '@/services/enrollmentService';
import { userService } from '@/services/userService';
import { useInstitutionSettings } from '@/hooks/useInstitutionSettings';
import {
  PrinterIcon,
  UserGroupIcon,
  UserIcon,
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface Student {
  id?: string;
  _id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  dni?: string;
  documentNumber?: string;
}

// ── Tarjeta individual reutilizable ──────────────────────────────────────────
interface CardProps {
  student: Student;
  institutionName?: string;
  logoBase64?: string;
  locationText: string;
  currentYear: number;
}

function StudentCard({ student, institutionName, logoBase64, locationText, currentYear }: CardProps) {
  const fullName =
    student.lastName && student.firstName
      ? `${student.lastName}, ${student.firstName}`
      : student.name || `${student.lastName || ''} ${student.firstName || ''}`;

  return (
    <div
      className="bg-white flex flex-col relative overflow-hidden"
      style={{ width: '9.5cm', height: '6.2cm', boxSizing: 'border-box', border: '1px solid #e2e8f0' }}
    >
      {/* Patrón de fondo */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '12px 12px' }}
      />

      {/* Header Institucional */}
      <div className="bg-[#538f65] text-white text-center py-1 px-4 z-10 relative shadow-sm">
        <h3 className="text-[11px] font-extrabold uppercase tracking-wide leading-tight truncate">
          {institutionName || 'INSTITUCIÓN EDUCATIVA'}
        </h3>
      </div>

      {/* Body Central */}
      <div className="flex-1 flex items-center justify-between px-3 z-10 relative">
        {/* Logo */}
        <div className="w-[65px] flex items-center justify-start shrink-0">
          {logoBase64 ? (
            <img src={logoBase64} alt="Logo" className="max-w-[65px] max-h-[65px] object-contain drop-shadow-sm" />
          ) : (
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-[9px] text-gray-400 text-center leading-tight">Sin logo</div>
          )}
        </div>

        {/* Código QR */}
        <div className="bg-white p-0.5 rounded-xl border-2 border-gray-100 shadow-sm flex items-center justify-center shrink-0">
          <QRCodeSVG value={student.dni || student.documentNumber || ''} size={125} level="H" />
        </div>

        {/* Info Extra */}
        <div className="w-[65px] flex flex-col items-center justify-center text-center shrink-0">
          <div className="w-8 h-8 bg-[#538f65]/10 rounded-full flex items-center justify-center text-[#538f65] mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-[10px] font-bold text-gray-800 leading-tight w-full break-words">{locationText}</p>
          <p className="text-[11px] font-black text-[#538f65] mt-0.5">{currentYear}</p>
        </div>
      </div>

      {/* Footer Alumno */}
      <div className="bg-[#FAF9F6] border-t border-[#EBE8DD] px-4 py-1.5 z-10 relative flex justify-between items-center">
        <div className="flex-col flex-1 pr-2">
          <p className="text-[8px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Alumno</p>
          <p className="text-[11px] font-black text-gray-900 leading-tight uppercase line-clamp-2">{fullName}</p>
        </div>
        <div className="flex flex-col items-end shrink-0">
          <p className="text-[8px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">DNI</p>
          <p className="text-[13px] font-extrabold text-gray-800 tracking-wide">{student.dni || student.documentNumber}</p>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function QRGeneratorPage() {
  const [mode, setMode] = useState<'individual' | 'section'>('section');
  const [selectedSection, setSelectedSection] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);

  const { data: settings } = useInstitutionSettings();
  const currentYear = new Date().getFullYear();
  const locationText = settings?.address || 'Ciudad - País';

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => sectionService.getAll(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.getAll(),
    enabled: mode === 'individual',
  });

  const studentsOnly = useMemo(() => {
    return allUsers.filter((u: any) => String(u.role).toUpperCase() === 'STUDENT');
  }, [allUsers]);

  const filteredIndividualStudents = useMemo(() => {
    if (!searchTerm) return [];
    const term = searchTerm.trim().toLowerCase();
    return studentsOnly.filter((s: any) => {
      const fullName = (s.name || `${s.firstName || ''} ${s.lastName || ''}`).toLowerCase();
      const documentId = String(s.dni || s.documentNumber || s.id || '').toLowerCase();
      return fullName.includes(term) || documentId.includes(term);
    }).slice(0, 5);
  }, [searchTerm, studentsOnly]);

  const { data: sectionStudents = [], isFetching: isFetchingSectionStudents } = useQuery({
    queryKey: ['studentsBySection', selectedSection],
    queryFn: () => enrollmentService.getStudentsBySection(selectedSection),
    enabled: !!selectedSection,
  });

  const handleGenerateSection = () => {
    if (sectionStudents.length > 0) {
      setSelectedStudents(sectionStudents);
    }
  };

  const handleAddIndividual = (student: any) => {
    const studentId = student.id || student._id;
    if (!selectedStudents.find(s => (s.id || s._id) === studentId)) {
      setSelectedStudents([...selectedStudents, student]);
    }
    setSearchTerm('');
  };

  const handleRemoveStudent = (id: string) => {
    setSelectedStudents(selectedStudents.filter(s => (s.id || s._id) !== id));
  };

  const clearSelection = () => {
    setSelectedStudents([]);
    setSelectedSection('');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="space-y-6 pb-8">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1a202c' }}>Generar Credenciales QR</h1>
            <p className="text-sm mt-0.5" style={{ color: '#718096' }}>Crea fotochecks con códigos QR para la toma de asistencia.</p>
          </div>
          {selectedStudents.length > 0 && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
              style={{ background: '#538f65' }}
            >
              <PrinterIcon className="w-5 h-5" />
              Imprimir Credenciales ({selectedStudents.length})
            </button>
          )}
        </div>

        {/* ── Controls (Hidden on Print) ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 print:hidden">
          <div className="flex gap-4 mb-6 border-b border-gray-100 pb-4">
            <button
              onClick={() => setMode('section')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${mode === 'section' ? 'bg-[#538f65] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <UserGroupIcon className="w-4 h-4" />
              Por Sección
            </button>
            <button
              onClick={() => setMode('individual')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${mode === 'individual' ? 'bg-[#538f65] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <UserIcon className="w-4 h-4" />
              Individual
            </button>
          </div>

          {mode === 'section' ? (
            <div className="flex flex-col sm:flex-row items-end gap-4 max-w-2xl">
              <div className="flex-1 w-full">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Seleccionar Sección
                </label>
                <div className="relative">
                  <UserGroupIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#538f65]/40 focus:border-[#538f65] appearance-none"
                  >
                    <option value="">-- Elige una sección --</option>
                    {sections.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.level})</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={handleGenerateSection}
                disabled={!selectedSection || isFetchingSectionStudents}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-opacity disabled:opacity-50 h-[42px]"
                style={{ background: '#538f65' }}
              >
                {isFetchingSectionStudents ? 'Cargando...' : 'Generar'}
              </button>
            </div>
          ) : (
            <div className="max-w-xl">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Buscar Alumno
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombres, apellidos o DNI..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#538f65]/40 focus:border-[#538f65]"
                />
                {searchTerm && filteredIndividualStudents.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {filteredIndividualStudents.map((student: any) => (
                      <button
                        key={student.id || student._id}
                        onClick={() => handleAddIndividual(student)}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0"
                      >
                        <div className="font-semibold text-gray-900">{student.name || `${student.firstName} ${student.lastName}`}</div>
                        <div className="text-xs text-gray-500">DNI: {student.dni || student.documentNumber}</div>
                      </button>
                    ))}
                  </div>
                )}
                {searchTerm && filteredIndividualStudents.length === 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-4 text-sm text-gray-500 text-center">
                    No se encontraron alumnos.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Vista Previa en Pantalla (con botones de eliminar) ── */}
        {selectedStudents.length > 0 && (
          <div className="mt-8 print:hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Vista Previa ({selectedStudents.length} credenciales)</h2>
              <button onClick={clearSelection} className="text-sm text-red-500 font-semibold hover:text-red-700">Limpiar lista</button>
            </div>
            <div className="flex flex-wrap gap-6 justify-center sm:justify-start">
              {selectedStudents.map((student) => (
                <div key={student.id || student._id} className="relative group">
                  <button
                    onClick={() => handleRemoveStudent(student.id || student._id || '')}
                    className="absolute -top-2 -right-2 z-10 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    title="Remover"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                  <div className="rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
                    <StudentCard
                      student={student}
                      institutionName={settings?.name}
                      logoBase64={settings?.logoBase64}
                      locationText={locationText}
                      currentYear={currentYear}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Portal de Impresión (montado directamente en <body>) ──────────────
          Al estar fuera del árbol del layout, el motor de impresión del
          navegador puede distribuir las tarjetas en múltiples páginas sin
          restricciones de ancho impuestas por contenedores padres.
      ────────────────────────────────────────────────────────────────────── */}
      {selectedStudents.length > 0 && createPortal(
        <div id="qr-print-portal">
          {selectedStudents.map((student) => (
            <div key={student.id || student._id} className="qr-card-wrapper">
              <StudentCard
                student={student}
                institutionName={settings?.name}
                logoBase64={settings?.logoBase64}
                locationText={locationText}
                currentYear={currentYear}
              />
            </div>
          ))}
        </div>,
        document.body
      )}

      {/* ── Estilos de impresión ── */}
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Ocultar el portal en pantalla */
          #qr-print-portal {
            display: none;
          }

          @media print {
            /* Ocultar TODO el contenido de la app */
            body > *:not(#qr-print-portal) {
              display: none !important;
            }

            /* Mostrar solo el portal, en flujo normal (no absolute)
               para que el navegador pagine automáticamente */
            #qr-print-portal {
              display: flex !important;
              flex-wrap: wrap;
              gap: 0.3cm 0.5cm;
              justify-content: center;
              align-content: flex-start;
              width: 100%;
              padding: 0;
              margin: 0;
              box-sizing: border-box;
            }

            /* Cada tarjeta no se parte entre páginas */
            .qr-card-wrapper {
              page-break-inside: avoid;
              break-inside: avoid;
            }

            @page {
              size: A4 portrait;
              margin: 0.5cm;
            }
          }
        `
      }} />
    </>
  );
}
