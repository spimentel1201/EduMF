import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { attendanceService } from '../services/attendanceService';
import { sectionService } from '../services/sectionService';
import { enrollmentService } from '../services/enrollmentService'; // Importar enrollmentService
import { useTranslation } from 'react-i18next';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  dni: string;
}

export type AttendanceStatus = 'Presente' | 'Tardanza' | 'Ausente' | 'Justificado';

interface StudentAttendance {
  studentId: string;
  status: AttendanceStatus;
}

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSection, setSelectedSection] = useState('');
  const [studentsAttendance, setStudentsAttendance] = useState<StudentAttendance[]>([]);
  const { t } = useTranslation();

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => sectionService.getAll(),
  });

  const { data: students = [], isLoading: isLoadingStudents, error: studentsError } = useQuery<Student[]>({
    queryKey: ['studentsBySection', selectedSection],
    queryFn: () => {
      if (!selectedSection) return Promise.resolve([]);
      return enrollmentService.getStudentsBySection(selectedSection);
    },
    enabled: !!selectedSection, // Solo ejecutar si hay una sección seleccionada
  });

  useEffect(() => {
    if (students.length > 0) {
      setStudentsAttendance(prevAttendance => {
        const newAttendance: StudentAttendance[] = [];
        students.forEach(student => {
          const existingAttendance = prevAttendance.find(sa => sa.studentId === student._id);
          newAttendance.push({
            studentId: student._id,
            status: existingAttendance ? existingAttendance.status : 'Presente',
          });
        });
        return newAttendance;
      });
    } else {
      setStudentsAttendance(prevAttendance => {
        if (prevAttendance.length > 0) {
          return [];
        }
        return prevAttendance; // No change, return previous state
      });
    }
  }, [students]);

  const handleAttendanceChange = (studentId: string, status: 'Presente' | 'Tardanza' | 'Ausente' | 'Justificado') => {
    setStudentsAttendance(prevAttendance =>
      prevAttendance.map(sa => (sa.studentId === studentId ? { ...sa, status } : sa))
    );
  };

  const handleRegisterAttendance = async () => {
    try {
      await attendanceService.bulkCreateAttendances({
        date: selectedDate,
        sectionId: selectedSection,
        studentAttendances: studentsAttendance,
      });
      toast.success(t('attendance.attendanceRegisteredSuccess'));
    } catch (error: any) {
      toast.error(t('attendance.attendanceRegisteredError') + (error.response?.data?.message || error.message));
    }
  };

  if (isLoadingStudents) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (studentsError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{t('attendance.errorLoadingStudents')}: {studentsError.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-lg font-semibold text-gray-900">{t('attendance.title')}</h1>
          <p className="mt-2 text-sm text-gray-700">
            {t('attendance.subtitle')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('attendance.date')}</label>
          <div className="relative mt-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <CalendarIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="date"
              className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('attendance.section')}</label>
          <div className="relative mt-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <UserGroupIcon className="h-5 w-5 text-gray-400" />
            </div>

            <select
              className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm"
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value);
              }}
            >
              <option key="empty-section-option" value="">Seleccionar Sección</option>
              {sections && sections.length > 0 && sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Students List for Attendance */}
      {selectedSection && students.length > 0 ? (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                  Estudiante
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  DNI
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {students.map((student) => (
                <tr key={student._id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    {student.firstName} {student.lastName}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {student.dni}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => handleAttendanceChange(student._id, 'Presente')}
                        className={`inline-flex items-center rounded-md px-2.5 py-1.5 text-sm font-semibold shadow-sm 
                          ${studentsAttendance.find(sa => sa.studentId === student._id)?.status === 'Presente'
                            ? 'bg-green-600 text-white hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                      >
                        Presente
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAttendanceChange(student._id, 'Tardanza')}
                        className={`inline-flex items-center rounded-md px-2.5 py-1.5 text-sm font-semibold shadow-sm 
                          ${studentsAttendance.find(sa => sa.studentId === student._id)?.status === 'Tardanza'
                            ? 'bg-orange-600 text-white hover:bg-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600'
                            : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                          }`}
                      >
                        Tarde
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAttendanceChange(student._id, 'Ausente')}
                        className={`inline-flex items-center rounded-md px-2.5 py-1.5 text-sm font-semibold shadow-sm 
                          ${studentsAttendance.find(sa => sa.studentId === student._id)?.status === 'Ausente'
                            ? 'bg-red-600 text-white hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                      >
                        Ausente
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAttendanceChange(student._id, 'Justificado')}
                        className={`inline-flex items-center rounded-md px-2.5 py-1.5 text-sm font-semibold shadow-sm 
                          ${studentsAttendance.find(sa => sa.studentId === student._id)?.status === 'Justificado'
                            ? 'bg-yellow-600 text-white hover:bg-yellow-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600'
                            : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          }`}
                      >
                        Justificado
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleRegisterAttendance}
              className="rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
            >
              Registrar Asistencia
            </button>
          </div>
        </div>
      ) : selectedSection ? (
        <p className="text-center text-gray-500 mt-8">{t('attendance.noStudentsInSection')}</p>
      ) : (
        <p className="text-center text-gray-500 mt-8">{t('attendance.selectSectionPrompt')}</p>
      )}
      <ToastContainer />
    </div>
  );
}
