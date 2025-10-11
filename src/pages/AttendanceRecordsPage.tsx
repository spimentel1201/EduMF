import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { sectionService } from '../services/sectionService';
import { studentService } from '../services/studentService';
import { attendanceService } from '../services/attendanceService';
import { Section } from '../types/academic';
import { Student } from '../types/users';
import { AttendanceRecordDisplay, AttendanceFilterParams } from '../types/attendance';

interface AttendanceRecordsResponse {
  attendanceRecords: AttendanceRecordDisplay[];
  totalRecords: number;
}

export default function AttendanceRecordsPage() {
  const { t } = useTranslation();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [filters, setFilters] = useState<AttendanceFilterParams>({
    startDate: '',
    endDate: '',
    sectionId: '',
    studentId: '',
    page: currentPage,
    limit: itemsPerPage,
  });

  const { data: sections, isLoading: isLoadingSections, error: sectionsError } = useQuery<Section[]>({ queryKey: ['sections'], queryFn: sectionService.getAll });
  const { data: students, isLoading: isLoadingStudents, error: studentsError } = useQuery<Student[]>({ queryKey: ['students'], queryFn: studentService.getStudents });

  const { data: attendanceData, isLoading: isLoadingAttendanceRecords, error: attendanceRecordsError, refetch: refetchAttendanceRecords } = useQuery<AttendanceRecordsResponse> ({
    queryKey: ['attendanceRecords', filters],
    queryFn: () => attendanceService.getAttendanceRecords(filters),
  });

  const attendanceRecords = attendanceData?.attendanceRecords || [];
  const totalRecords = attendanceData?.totalRecords || 0;
  const totalPages = Math.ceil(totalRecords / itemsPerPage);

  useEffect(() => {
    setFilters(prevFilters => ({
      ...prevFilters,
      page: currentPage,
      limit: itemsPerPage,
    }));
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    refetchAttendanceRecords();
  }, [filters, refetchAttendanceRecords]);

  if (isLoadingSections || isLoadingStudents || isLoadingAttendanceRecords) return <div>{t('common.loading')}</div>;
  if (sectionsError) return <div>{t('common.error')}: {sectionsError.message}</div>;
  if (studentsError) return <div>{t('common.error')}: {studentsError.message}</div>;
  if (attendanceRecordsError) return <div>{t('common.error')}: {attendanceRecordsError.message}</div>;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-lg font-semibold text-gray-900">{t('attendanceRecords.title')}</h1>
          <p className="mt-2 text-sm text-gray-700">
            {t('attendanceRecords.subtitle')}
          </p>
        </div>
      </div>

      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
        <div className="px-4 py-6 sm:p-8">
          <h2 className="text-base font-semibold leading-7 text-gray-900">{t('attendanceRecords.filters')}</h2>
          <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label htmlFor="startDate" className="block text-sm font-medium leading-6 text-gray-900">
                {t('attendanceRecords.startDate')}
              </label>
              <div className="mt-2">
                <input
                  type="date"
                  name="startDate"
                  id="startDate"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="endDate" className="block text-sm font-medium leading-6 text-gray-900">
                {t('attendanceRecords.endDate')}
              </label>
              <div className="mt-2">
                <input
                  type="date"
                  name="endDate"
                  id="endDate"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="section" className="block text-sm font-medium leading-6 text-gray-900">
                {t('attendanceRecords.section')}
              </label>
              <div className="mt-2">
                <select
                  id="section"
                  name="section"
                  value={filters.sectionId}
                  onChange={(e) => setFilters({ ...filters, sectionId: e.target.value })}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:max-w-xs sm:text-sm sm:leading-6"
                >
                  <option value="">{t('attendanceRecords.allSections')}</option>
                  {sections?.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="student" className="block text-sm font-medium leading-6 text-gray-900">
                {t('attendanceRecords.student')}
              </label>
              <div className="mt-2">
                <select
                  id="student"
                  name="student"
                  value={filters.studentId}
                  onChange={(e) => setFilters({ ...filters, studentId: e.target.value })}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:max-w-xs sm:text-sm sm:leading-6"
                >
                  <option value="">{t('attendanceRecords.allStudents')}</option>
                  {students?.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.firstName} {student.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="itemsPerPage" className="block text-sm font-medium leading-6 text-gray-900">
                {t('common.itemsPerPage')}
              </label>
              <div className="mt-2">
                <select
                  id="itemsPerPage"
                  name="itemsPerPage"
                  value={itemsPerPage}
                  onChange={handleItemsPerPageChange}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:max-w-xs sm:text-sm sm:leading-6"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      {t('attendanceRecords.table.student')}
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      {t('attendanceRecords.table.section')}
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      {t('attendanceRecords.table.date')}
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      {t('attendanceRecords.table.status')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {attendanceRecords?.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center">
                        {t('attendanceRecords.noRecords')}
                      </td>
                    </tr>
                  ) : (
                    attendanceRecords?.map((record) => (
                      <tr key={record.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {record.studentName}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {record.sectionName}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {new Date(record.date).toLocaleDateString()}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {t(`attendance.statusOptions.${record.status}`)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('common.previous')}
          </button>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('common.next')}
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              {t('common.showing')}{' '}
              <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
              {' '}{t('common.to')}{' '}
              <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalRecords)}</span>
              {' '}{t('common.of')}{' '}
              <span className="font-medium">{totalRecords}</span>
              {' '}{t('common.results')}
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
              >
                <span className="sr-only">{t('common.previous')}</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                </svg>
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => handlePageChange(i + 1)}
                  aria-current={currentPage === i + 1 ? 'page' : undefined}
                  className={(
                    currentPage === i + 1
                      ? 'relative z-10 inline-flex items-center bg-primary-600 px-4 py-2 text-sm font-semibold text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600'
                      : 'relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                  )}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
              >
                <span className="sr-only">{t('common.next')}</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}