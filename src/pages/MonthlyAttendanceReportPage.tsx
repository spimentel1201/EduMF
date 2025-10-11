import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, DatePicker, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { attendanceService } from '../services/attendanceService';
import { getSections } from '../services/sectionService';
import { Section } from '../types/academic';
import dayjs from 'dayjs';
import { format } from 'date-fns';

type StudentAttendanceDetail = {
  studentId: string;
  studentName: string;
  status: string;
  count: number;
};

type AttendanceReportData = {
  _id: string; // La fecha del reporte
  students: StudentAttendanceDetail[];
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalJustified: number;
};

export default function MonthlyAttendanceReportPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>();
  const [selectedMonth, setSelectedMonth] = useState<dayjs.Dayjs>(dayjs());
  const [reportData, setReportData] = useState<AttendanceReportData[]>([]);

  // Obtener lista de secciones
  useEffect(() => {
    const fetchSections = async () => {
      try {
        const data = await getSections();
        setSections(data);
      } catch (error) {
        console.error('Error fetching sections:', error);
      }
    };
    fetchSections();
  }, []);

  // Obtener reporte cuando cambian los filtros
  useEffect(() => {
    if (selectedSection) {
      fetchReport();
    }
  }, [selectedSection, selectedMonth]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const month = selectedMonth.month() + 1;
      const year = selectedMonth.year();
      
      const data = await attendanceService.getMonthlyAttendanceReport({
        sectionId: selectedSection,
        month,
        year
      });
      
      setReportData(data);
    } catch (error) {
      console.error('Error fetching attendance report:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<AttendanceReportData> = [
    {
      title: t('attendance.date'),
      dataIndex: '_id',
      key: '_id',
      render: (text: string) => format(new Date(text), 'dd/MM/yyyy'),
    },
    {
      title: t('attendance.totalPresent'),
      dataIndex: 'totalPresent',
      key: 'totalPresent',
    },
    {
      title: t('attendance.totalAbsent'),
      dataIndex: 'totalAbsent',
      key: 'totalAbsent',
    },
    {
      title: t('attendance.totalLate'),
      dataIndex: 'totalLate',
      key: 'totalLate',
    },
    {
      title: t('attendance.totalJustified'),
      dataIndex: 'totalJustified',
      key: 'totalJustified',
    },
  ];

  const expandedRowRender = (record: AttendanceReportData) => {
    const studentColumns: ColumnsType<StudentAttendanceDetail> = [
      {
        title: t('student.name'),
        dataIndex: 'studentName',
        key: 'studentName',
      },
      {
        title: t('attendance.status'),
        dataIndex: 'status',
        key: 'status',
      },
    ];

    return <Table columns={studentColumns} dataSource={record.students} pagination={false} rowKey="studentId" />;
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">{t('attendance.monthlyReport')}</h1>
      
      <div className="flex gap-4 mb-6">
        <Select
          placeholder={t('attendance.selectSection')}
          style={{ width: 200 }}
          value={selectedSection}
          onChange={setSelectedSection}
          options={sections.map(s => ({ 
            value: s.id, 
            label: s.name 
          }))}
        />
        
        <DatePicker
          picker="month"
          format="MM/YYYY"
          value={selectedMonth}
          onChange={(date) => date && setSelectedMonth(dayjs(date))}
        />
      </div>
      
      <Table
        columns={columns}
        dataSource={reportData}
        loading={loading}
        rowKey="_id"
        expandable={{ expandedRowRender }}
      />
    </div>
  );
}