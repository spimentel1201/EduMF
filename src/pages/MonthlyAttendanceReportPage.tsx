import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, DatePicker, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getMonthlyAttendanceReport } from '../services/attendanceService';
import { getSections } from '../services/sectionService';
import { Section } from '../types/academic';
import dayjs from 'dayjs';
import { format } from 'date-fns';

type AttendanceReportData = {
  date: string;
  present: number;
  absent: number;
  late: number;
  justified: number;
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
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();
      
      const data = await getMonthlyAttendanceReport({
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
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: t('attendance.statusOptions.Present'),
      dataIndex: 'present',
      key: 'present',
    },
    {
      title: t('attendance.statusOptions.Absent'),
      dataIndex: 'absent',
      key: 'absent',
    },
    {
      title: t('attendance.statusOptions.Late'),
      dataIndex: 'late',
      key: 'late',
    },
    {
      title: t('attendance.statusOptions.Justified'),
      dataIndex: 'justified',
      key: 'justified',
    },
  ];

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
            value: s._id, 
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
        rowKey="date"
      />
    </div>
  );
}