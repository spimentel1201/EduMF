import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { courseScheduleService } from '../services/courseScheduleService';
import { sectionService } from '../services/sectionService';
import { CourseSchedule, Section } from '../types/academic';
import { useTranslation } from 'react-i18next';

export default function SchedulesPage() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDay, setSelectedDay] = useState('All Days');
  const [selectedSectionId, setSelectedSectionId] = useState<string | 'All Sections'>('All Sections'); // Nuevo estado para la sección
  const days = ['All Days', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Helper function to get the correct translation key for days
  const getDayTranslationKey = (day: string) => {
    switch (day) {
      case 'Lunes': return 'Monday';
      case 'Martes': return 'Tuesday';
      case 'Miércoles': return 'Wednesday';
      case 'Jueves': return 'Thursday';
      case 'Viernes': return 'Friday';
      case 'Sábado': return 'Saturday';
      case 'Domingo': return 'Sunday';
      case 'All Days': return 'AllDays';
      default: return day;
    }
  };

  const { data: schedules = [], isLoading, error } = useQuery({
    queryKey: ['course-schedules'],
    queryFn: courseScheduleService.getAll,
  });

  const { data: sections = [], isLoading: isLoadingSections, error: sectionsError } = useQuery<Section[]>({
    queryKey: ['sections'],
    queryFn: sectionService.getAll,
  });

  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = schedule.courseId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         `${schedule.teacherId.firstName} ${schedule.teacherId.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         schedule.timeSlotId.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDay = selectedDay === 'All Days' || schedule.dayOfWeek === selectedDay;
    const matchesSection = selectedSectionId === 'All Sections' || schedule.sectionId.id === selectedSectionId; // Filtrar por sección
    return matchesSearch && matchesDay && matchesSection;
  });

  if (isLoading || isLoadingSections) { // Incluir isLoadingSections
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || sectionsError) { // Incluir sectionsError
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{t('schedules.errorLoading')}: {error?.message || sectionsError?.message}</p>
      </div>
    );
  }

  // Función auxiliar para agrupar horarios por día y hora
  const groupSchedulesByTimeAndDay = (schedulesToGroup: CourseSchedule[]) => {
    const grouped: { [time: string]: { [day: string]: CourseSchedule[] } } = {};

    // Obtener todas las franjas horarias únicas y ordenarlas
    const allTimeSlots = Array.from(new Set(schedulesToGroup.map(s => s.timeSlotId.startTime)))
      .sort((a, b) => {
        const [ha, ma] = a.split(':').map(Number);
        const [hb, mb] = b.split(':').map(Number);
        if (ha !== hb) return ha - hb;
        return ma - mb;
      });

    const daysOfWeek = [t('schedules.days.Monday'), t('schedules.days.Tuesday'), t('schedules.days.Wednesday'), t('schedules.days.Thursday'), t('schedules.days.Friday')]; // Definir los días de la semana en orden

    allTimeSlots.forEach(time => {
      grouped[time] = {};
      daysOfWeek.forEach(day => {
        grouped[time][day] = [];
      });
    });

    schedulesToGroup.forEach(schedule => {
      const startTime = schedule.timeSlotId.startTime;
      const day = schedule.dayOfWeek;
      if (grouped[startTime] && grouped[startTime][day]) {
        grouped[startTime][day].push(schedule);
      }
    });

    return { grouped, allTimeSlots, daysOfWeek };
  };

  const { grouped, allTimeSlots, daysOfWeek } = groupSchedulesByTimeAndDay(filteredSchedules);

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-lg font-semibold text-gray-900">{t('schedules.title')}</h1>
          <p className="mt-2 text-sm text-gray-700">
            {t('schedules.subtitle')}
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <Link
            to="/schedules/new"
            className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-500"
          >
            <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
            {t('schedules.addSchedule')}
          </Link>
        </div>
      </div>

      {/* Search and filter */}
      <div className="space-y-4">
        <div className="relative">
          <div className="relative rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm"
              placeholder={t('schedules.searchSchedules')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex space-x-4"> {/* Contenedor para los selectores */}
          <div>
            <select
              className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary-600 sm:text-sm"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
            >
              {days.map((day) => (
                <option key={day} value={day}>
                  {t(`schedules.days.${getDayTranslationKey(day.replace(/ /g, ''))}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary-600 sm:text-sm"
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
            >
              <option value="All Sections">{t('schedules.allSections')}</option>
              {sections.map((section) => (
                <option key={section._id} value={section._id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Schedules Grid */}
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      {t('schedules.time')}
                    </th>
                    {daysOfWeek.map(day => (
                      <th key={day} scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {allTimeSlots.map(time => (
                    <tr key={time}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {time}
                      </td>
                      {daysOfWeek.map(day => (
                        <td key={day} className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {grouped[time][day].map(schedule => (
                            <div key={schedule.id} className="mb-2 p-2 border rounded-md bg-blue-50">
                              <p className="font-semibold">{schedule.courseId.name}</p>
                              <p>{schedule.teacherId.firstName} {schedule.teacherId.lastName}</p>
                              <p>{schedule.classroom}</p>
                            </div>
                          ))}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Schedules table (old) */}
      {/* Puedes mantener esta tabla si aún la necesitas, o eliminarla si la grilla la reemplaza */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                {t('schedules.course')}
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                {t('schedules.teacher')}
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                {t('schedules.day')}
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                {t('schedules.time')}
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                {t('schedules.section')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredSchedules.map((schedule) => (
              <tr key={schedule.id}>
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                  {schedule.courseId.name}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {schedule.teacherId.firstName}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {t(`schedules.days.${getDayTranslationKey(schedule.dayOfWeek.replace(/ /g, ''))}`)}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {schedule.timeSlotId.startTime} - {schedule.timeSlotId.endTime}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {schedule.sectionId.name}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
