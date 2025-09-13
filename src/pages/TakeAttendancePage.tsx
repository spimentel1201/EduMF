import React, { useState, useEffect } from 'react';
import { 
  CalendarIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  ClockIcon,
  UserGroupIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';

// Tipos para la asistencia
type AttendanceStatus = 'presente' | 'ausente' | 'justificado' | 'tarde';

interface Student {
  id: number;
  name: string;
  grade: string;
  section: string;
  dni: string;
}

interface AttendanceRecord {
  studentId: number;
  date: string;
  status: AttendanceStatus;
  timestamp: Date;
}

// Mock data para estudiantes
const students: Student[] = [
  { id: 1, name: 'Ana García López', grade: '1er Grado', section: 'A', dni: '12345678' },
  { id: 2, name: 'Carlos Rodríguez Silva', grade: '1er Grado', section: 'A', dni: '23456789' },
  { id: 3, name: 'María Fernández Torres', grade: '1er Grado', section: 'A', dni: '34567890' },
  { id: 4, name: 'Luis Pérez Mendoza', grade: '1er Grado', section: 'A', dni: '45678901' },
  { id: 5, name: 'Carmen Silva Vargas', grade: '1er Grado', section: 'A', dni: '56789012' },
  { id: 6, name: 'Roberto Torres Ruiz', grade: '1er Grado', section: 'A', dni: '67890123' },
  { id: 7, name: 'Patricia Mendoza Castro', grade: '1er Grado', section: 'A', dni: '78901234' },
  { id: 8, name: 'Fernando Vargas Herrera', grade: '1er Grado', section: 'A', dni: '89012345' },
];

// Mock data para horarios de clase
const classSchedules = [
  { id: 1, name: 'Matemáticas 1A', teacher: 'María González', time: '08:00 - 09:30', grade: '1er Grado', section: 'A' },
  { id: 2, name: 'Lenguaje 1A', teacher: 'Carlos Rodríguez', time: '09:45 - 11:15', grade: '1er Grado', section: 'A' },
  { id: 3, name: 'Ciencias 1A', teacher: 'Ana López', time: '11:30 - 13:00', grade: '1er Grado', section: 'A' },
];

export default function TakeAttendancePage() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'attendance'>('calendar');

  // Generar días del mes actual
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Agregar días del mes anterior para completar la primera semana
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({
        date: prevDate,
        isCurrentMonth: false,
        isToday: false,
        isWeekend: prevDate.getDay() === 0 || prevDate.getDay() === 6
      });
    }

    // Agregar días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = date.toDateString() === new Date().toDateString();
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
      
      days.push({
        date,
        isCurrentMonth: true,
        isToday,
        isWeekend,
        isPast
      });
    }

    // Agregar días del mes siguiente para completar la última semana
    const remainingDays = 42 - days.length; // 6 semanas * 7 días
    for (let day = 1; day <= remainingDays; day++) {
      const nextDate = new Date(year, month + 1, day);
      days.push({
        date: nextDate,
        isCurrentMonth: false,
        isToday: false,
        isWeekend: nextDate.getDay() === 0 || nextDate.getDay() === 6
      });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  const handleDateClick = (date: Date) => {
    if (date.getDay() === 0 || date.getDay() === 6) return; // No permitir fines de semana
    
    const dateString = date.toISOString().split('T')[0];
    setSelectedDate(dateString);
    setViewMode('attendance');
    
    // Cargar registros de asistencia existentes para esa fecha
    loadAttendanceRecords(dateString);
  };

  const loadAttendanceRecords = (date: string) => {
    // TODO: Cargar registros existentes desde el backend
    // Por ahora, inicializar con estado "presente" para todos
    const records: AttendanceRecord[] = students.map(student => ({
      studentId: student.id,
      date,
      status: 'presente',
      timestamp: new Date()
    }));
    setAttendanceRecords(records);
  };

  const updateAttendance = (studentId: number, status: AttendanceStatus) => {
    setAttendanceRecords(prev => 
      prev.map(record => 
        record.studentId === studentId 
          ? { ...record, status, timestamp: new Date() }
          : record
      )
    );
  };

  const saveAttendance = async () => {
    try {
      alert('Asistencia guardada exitosamente');
      setViewMode('calendar');
      setSelectedDate('');
      setSelectedClass(null);
    } catch (error) {
      console.error('Failed to save attendance:', error);
      alert('Error al guardar la asistencia');
    }
  };

  const getStatusColor = (status: AttendanceStatus) => {
    const colors = {
      presente: 'bg-green-100 text-green-800 border-green-200',
      ausente: 'bg-red-100 text-red-800 border-red-200',
      justificado: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      tarde: 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colors[status];
  };

  const getStatusIcon = (status: AttendanceStatus) => {
    const icons = {
      presente: CheckCircleIcon,
      ausente: XCircleIcon,
      justificado: ExclamationTriangleIcon,
      tarde: ClockIcon
    };
    return icons[status];
  };

  const getAttendanceStats = () => {
    const stats = {
      presente: attendanceRecords.filter(r => r.status === 'presente').length,
      ausente: attendanceRecords.filter(r => r.status === 'ausente').length,
      justificado: attendanceRecords.filter(r => r.status === 'justificado').length,
      tarde: attendanceRecords.filter(r => r.status === 'tarde').length
    };
    return stats;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (viewMode === 'attendance') {
    return (
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Tomar Asistencia
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {selectedDate && formatDate(new Date(selectedDate))}
              </p>
            </div>
            <button
              onClick={() => setViewMode('calendar')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Volver al Calendario
            </button>
          </div>
        </div>

        {/* Selección de Clase */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
              <AcademicCapIcon className="h-5 w-5 mr-2 text-primary-600" />
              Seleccionar Clase
            </h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {classSchedules.map((classItem) => (
                <div
                  key={classItem.id}
                  onClick={() => setSelectedClass(classItem.id)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    selectedClass === classItem.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h5 className="font-medium text-gray-900">{classItem.name}</h5>
                  <p className="text-sm text-gray-500">{classItem.teacher}</p>
                  <p className="text-xs text-gray-400">{classItem.time}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lista de Estudiantes y Asistencia */}
        {selectedClass && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Lista de Estudiantes
                </h3>
                <div className="flex space-x-2">
                  {Object.entries(getAttendanceStats()).map(([status, count]) => (
                    <div key={status} className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status as AttendanceStatus)}`}>
                      {count} {status}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
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
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {students.map((student) => {
                    const record = attendanceRecords.find(r => r.studentId === student.id);
                    const currentStatus = record?.status || 'presente';
                    
                    return (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                          <div>
                            <div className="font-medium text-gray-900">{student.name}</div>
                            <div className="text-gray-500">{student.grade} - {student.section}</div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {student.dni}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(currentStatus)}`}>
                            {React.createElement(getStatusIcon(currentStatus), { className: 'h-4 w-4 mr-1' })}
                            {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <div className="flex space-x-1">
                            <button
                              onClick={() => updateAttendance(student.id, 'presente')}
                              className={`p-2 rounded-md transition-colors ${
                                currentStatus === 'presente' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-gray-100 text-gray-600 hover:bg-green-50'
                              }`}
                              title="Presente"
                            >
                              <CheckCircleIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => updateAttendance(student.id, 'ausente')}
                              className={`p-2 rounded-md transition-colors ${
                                currentStatus === 'ausente' 
                                  ? 'bg-red-100 text-red-700' 
                                  : 'bg-gray-100 text-gray-600 hover:bg-red-50'
                              }`}
                              title="Ausente"
                            >
                              <XCircleIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => updateAttendance(student.id, 'justificado')}
                              className={`p-2 rounded-md transition-colors ${
                                currentStatus === 'justificado' 
                                  ? 'bg-yellow-100 text-yellow-700' 
                                  : 'bg-gray-100 text-gray-600 hover:bg-yellow-50'
                              }`}
                              title="Justificado"
                            >
                              <ExclamationTriangleIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => updateAttendance(student.id, 'tarde')}
                              className={`p-2 rounded-md transition-colors ${
                                currentStatus === 'tarde' 
                                  ? 'bg-orange-100 text-orange-700' 
                                  : 'bg-gray-100 text-gray-600 hover:bg-orange-50'
                              }`}
                              title="Tarde"
                            >
                              <ClockIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
              <button
                onClick={saveAttendance}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Guardar Asistencia
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5">
        <h3 className="text-lg font-medium leading-6 text-gray-900">Calendario de Asistencia</h3>
        <p className="mt-2 text-sm text-gray-500">
          Selecciona una fecha para tomar la asistencia de los estudiantes
        </p>
      </div>

      {/* Controles del calendario */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-medium text-gray-900">
              {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </h4>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                ←
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              >
                Hoy
              </button>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                →
              </button>
            </div>
          </div>

          {/* Calendario */}
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
            {/* Días de la semana */}
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
              <div key={day} className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-700">
                {day}
              </div>
            ))}

            {/* Días del mes */}
            {calendarDays.map((day, index) => (
              <div
                key={index}
                onClick={() => day.isCurrentMonth && !day.isWeekend && handleDateClick(day.date)}
                className={`bg-white p-2 min-h-[80px] cursor-pointer transition-colors ${
                  !day.isCurrentMonth 
                    ? 'text-gray-300 cursor-default' 
                    : day.isWeekend 
                      ? 'bg-gray-50 text-gray-400 cursor-default' 
                      : day.isToday 
                        ? 'bg-primary-100 border-2 border-primary-500' 
                        : 'hover:bg-gray-50'
                }`}
              >
                <div className="text-sm font-medium text-gray-900">
                  {day.date.getDate()}
                </div>
                {day.isCurrentMonth && !day.isWeekend && (
                  <div className="mt-1 text-xs text-gray-500">
                    {day.isToday && 'Hoy'}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Leyenda */}
          <div className="mt-6 flex items-center justify-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-primary-100 border-2 border-primary-500 rounded"></div>
              <span>Hoy</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-200 rounded"></div>
              <span>Día laborable</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-50 rounded"></div>
              <span>Fin de semana</span>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-md bg-green-500 flex items-center justify-center">
                <CheckCircleIcon className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Estudiantes</p>
              <p className="text-2xl font-semibold text-gray-900">{students.length}</p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-md bg-blue-500 flex items-center justify-center">
                <AcademicCapIcon className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Clases Activas</p>
              <p className="text-2xl font-semibold text-gray-900">{classSchedules.length}</p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-md bg-purple-500 flex items-center justify-center">
                <CalendarIcon className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Días Laborables</p>
              <p className="text-2xl font-semibold text-gray-900">5</p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-md bg-orange-500 flex items-center justify-center">
                <UserGroupIcon className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Asistencias Hoy</p>
              <p className="text-2xl font-semibold text-gray-900">0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
