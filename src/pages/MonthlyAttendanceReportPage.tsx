import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, DatePicker, Tabs, Tooltip, Dropdown, Menu } from 'antd';
import { attendanceService } from '../services/attendanceService';
import { getSections } from '../services/sectionService';
import { Section } from '../types/academic';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import {
  UserGroupIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';

// Types
interface StudentHeatmapData {
  studentId: string;
  studentName: string;
  dni: string;
  days: { day: number; status: string | null }[];
  summary: {
    present: number;
    absent: number;
    late: number;
    justified: number;
    attendanceRate: number;
  };
}

interface HeatmapResponse {
  students: StudentHeatmapData[];
  daysInMonth: number;
  summary: {
    present: number;
    absent: number;
    late: number;
    justified: number;
    total: number;
    attendanceRate: number;
    studentCount: number;
  };
}

interface SectionComparison {
  _id: string;
  sectionName: string;
  present: number;
  absent: number;
  late: number;
  justified: number;
  total: number;
  attendanceRate: number;
}

// Status colors
const getStatusColor = (status: string | null) => {
  switch (status) {
    case 'Presente': return 'bg-green-500';
    case 'Tardanza': return 'bg-yellow-500';
    case 'Ausente': return 'bg-red-500';
    case 'Justificado': return 'bg-blue-500';
    case 'weekend': return 'bg-gray-200';
    default: return 'bg-gray-100';
  }
};

const getStatusLabel = (status: string | null) => {
  switch (status) {
    case 'Presente': return 'P';
    case 'Tardanza': return 'T';
    case 'Ausente': return 'A';
    case 'Justificado': return 'J';
    case 'weekend': return '-';
    default: return '';
  }
};

// KPI Card Component
const KPICard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  color: string;
  trend?: number;
}) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <div className={`p-3 rounded-full ${color.replace('text-', 'bg-').replace('600', '100')}`}>
        <Icon className={`h-6 w-6 ${color}`} />
      </div>
    </div>
    {trend !== undefined && (
      <div className="flex items-center mt-3 pt-3 border-t border-gray-100">
        {trend >= 0 ? (
          <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
        ) : (
          <ArrowTrendingDownIcon className="h-4 w-4 text-red-500 mr-1" />
        )}
        <span className={`text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend >= 0 ? '+' : ''}{trend}% vs mes anterior
        </span>
      </div>
    )}
  </div>
);

export default function MonthlyAttendanceReportPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>();
  const [selectedMonth, setSelectedMonth] = useState<dayjs.Dayjs>(dayjs());
  const [heatmapData, setHeatmapData] = useState<HeatmapResponse | null>(null);
  const [comparisonData, setComparisonData] = useState<SectionComparison[]>([]);
  const [activeTab, setActiveTab] = useState('heatmap');

  // Fetch sections
  useEffect(() => {
    const fetchSections = async () => {
      try {
        const data = await getSections();
        setSections(data);
        if (data.length > 0) {
          setSelectedSection(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching sections:', error);
      }
    };
    fetchSections();
  }, []);

  // Fetch heatmap data
  useEffect(() => {
    if (selectedSection) {
      fetchHeatmapData();
    }
  }, [selectedSection, selectedMonth]);

  // Fetch comparison data
  useEffect(() => {
    fetchComparisonData();
  }, [selectedMonth]);

  const fetchHeatmapData = async () => {
    if (!selectedSection) return;
    setLoading(true);
    try {
      const data = await attendanceService.getHeatmapData({
        sectionId: selectedSection,
        month: selectedMonth.month() + 1,
        year: selectedMonth.year()
      });
      setHeatmapData(data);
    } catch (error) {
      console.error('Error fetching heatmap data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComparisonData = async () => {
    try {
      const data = await attendanceService.getSectionsComparison({
        month: selectedMonth.month() + 1,
        year: selectedMonth.year()
      });
      setComparisonData(data);
    } catch (error) {
      console.error('Error fetching comparison data:', error);
    }
  };

  // Transform data for trend chart
  const trendChartData = useMemo(() => {
    if (!heatmapData) return [];

    const dailyStats: Record<number, { present: number; absent: number; late: number; total: number }> = {};

    heatmapData.students.forEach(student => {
      student.days.forEach(({ day, status }) => {
        if (status && status !== 'weekend') {
          if (!dailyStats[day]) {
            dailyStats[day] = { present: 0, absent: 0, late: 0, total: 0 };
          }
          dailyStats[day].total++;
          if (status === 'Presente') dailyStats[day].present++;
          else if (status === 'Ausente') dailyStats[day].absent++;
          else if (status === 'Tardanza') dailyStats[day].late++;
        }
      });
    });

    return Object.entries(dailyStats).map(([day, stats]) => ({
      day: parseInt(day),
      asistencia: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0,
      tardanza: stats.total > 0 ? Math.round((stats.late / stats.total) * 100) : 0,
      ausencia: stats.total > 0 ? Math.round((stats.absent / stats.total) * 100) : 0,
    })).sort((a, b) => a.day - b.day);
  }, [heatmapData]);

  // Get section name
  const selectedSectionName = sections.find(s => s.id === selectedSection)?.name || '';

  // Ranking colors
  const getRankingColor = (index: number) => {
    if (index === 0) return '#FFD700'; // Gold
    if (index === 1) return '#C0C0C0'; // Silver
    if (index === 2) return '#CD7F32'; // Bronze
    return '#6B7280'; // Gray
  };

  const getRankingEmoji = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}`;
  };

  // Export to Excel
  const exportToExcel = () => {
    if (!heatmapData) return;

    // Prepare data for Excel
    const excelData = heatmapData.students.map(student => {
      const row: Record<string, any> = {
        'Estudiante': student.studentName,
        'DNI': student.dni,
      };

      // Add each day
      student.days.forEach(({ day, status }) => {
        row[`Día ${day}`] = status === 'weekend' ? '-' : (status || '');
      });

      // Add summary
      row['Presentes'] = student.summary.present;
      row['Tardanzas'] = student.summary.late;
      row['Ausencias'] = student.summary.absent;
      row['Justificados'] = student.summary.justified;
      row['% Asistencia'] = `${student.summary.attendanceRate}%`;

      return row;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Auto-width columns
    const colWidths = Object.keys(excelData[0] || {}).map(key => ({ wch: Math.max(key.length, 10) }));
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Asistencia');

    // Add summary sheet
    const summaryData = [{
      'Sección': selectedSectionName,
      'Mes': selectedMonth.format('MMMM YYYY'),
      'Total Estudiantes': heatmapData.summary.studentCount,
      'Total Registros': heatmapData.summary.total,
      'Presentes': heatmapData.summary.present,
      'Tardanzas': heatmapData.summary.late,
      'Ausencias': heatmapData.summary.absent,
      'Justificados': heatmapData.summary.justified,
      '% Asistencia General': `${heatmapData.summary.attendanceRate}%`
    }];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `Asistencia_${selectedSectionName}_${selectedMonth.format('YYYY-MM')}.xlsx`);
  };

  // Export to PDF
  const exportToPDF = () => {
    if (!heatmapData) return;

    const doc = new jsPDF('landscape');

    // Title
    doc.setFontSize(18);
    doc.text(`Reporte de Asistencia - ${selectedSectionName}`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Período: ${selectedMonth.format('MMMM YYYY')}`, 14, 28);

    // Summary
    doc.setFontSize(10);
    doc.text(`Total Estudiantes: ${heatmapData.summary.studentCount}`, 14, 38);
    doc.text(`Tasa de Asistencia: ${heatmapData.summary.attendanceRate}%`, 80, 38);
    doc.text(`Presentes: ${heatmapData.summary.present}`, 150, 38);
    doc.text(`Tardanzas: ${heatmapData.summary.late}`, 200, 38);
    doc.text(`Ausencias: ${heatmapData.summary.absent}`, 250, 38);

    // Table data
    const tableData = heatmapData.students.map(student => [
      student.studentName,
      student.dni,
      student.summary.present,
      student.summary.late,
      student.summary.absent,
      student.summary.justified,
      `${student.summary.attendanceRate}%`
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Estudiante', 'DNI', 'Presentes', 'Tardanzas', 'Ausencias', 'Justificados', '% Asist.']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`Asistencia_${selectedSectionName}_${selectedMonth.format('YYYY-MM')}.pdf`);
  };

  const exportMenuItems = [
    {
      key: 'excel',
      label: '📊 Exportar a Excel',
      onClick: exportToExcel
    },
    {
      key: 'pdf',
      label: '📄 Exportar a PDF',
      onClick: exportToPDF
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            📊 Reporte de Asistencia Mensual
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedSectionName} - {selectedMonth.format('MMMM YYYY')}
          </p>
        </div>
        <div className="flex gap-3">
          <Select
            placeholder="Seleccionar sección"
            style={{ width: 200 }}
            value={selectedSection}
            onChange={setSelectedSection}
            options={sections.map(s => ({ value: s.id, label: s.name }))}
          />
          <DatePicker
            picker="month"
            format="MM/YYYY"
            value={selectedMonth}
            onChange={(date) => date && setSelectedMonth(dayjs(date))}
          />
          <Dropdown
            menu={{ items: exportMenuItems }}
            placement="bottomRight"
            disabled={!heatmapData}
          >
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Exportar
            </button>
          </Dropdown>
        </div>
      </div>

      {/* KPI Cards */}
      {heatmapData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Tasa de Asistencia"
            value={`${heatmapData.summary.attendanceRate}%`}
            subtitle={`${heatmapData.summary.present} de ${heatmapData.summary.total} registros`}
            icon={CheckCircleIcon}
            color="text-green-600"
          />
          <KPICard
            title="Tardanzas"
            value={`${heatmapData.summary.total > 0 ? Math.round((heatmapData.summary.late / heatmapData.summary.total) * 100) : 0}%`}
            subtitle={`${heatmapData.summary.late} registros`}
            icon={ClockIcon}
            color="text-yellow-600"
          />
          <KPICard
            title="Ausencias"
            value={`${heatmapData.summary.total > 0 ? Math.round((heatmapData.summary.absent / heatmapData.summary.total) * 100) : 0}%`}
            subtitle={`${heatmapData.summary.absent} registros`}
            icon={XCircleIcon}
            color="text-red-600"
          />
          <KPICard
            title="Estudiantes"
            value={heatmapData.summary.studentCount}
            subtitle="matriculados en la sección"
            icon={UserGroupIcon}
            color="text-blue-600"
          />
        </div>
      )}

      {/* Trend Chart */}
      {trendChartData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendencia Diaria de Asistencia</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
              <RechartsTooltip formatter={(value: number) => `${value}%`} />
              <Legend />
              <Line type="monotone" dataKey="asistencia" stroke="#22c55e" strokeWidth={2} name="Asistencia" dot={false} />
              <Line type="monotone" dataKey="tardanza" stroke="#eab308" strokeWidth={2} name="Tardanza" dot={false} />
              <Line type="monotone" dataKey="ausencia" stroke="#ef4444" strokeWidth={2} name="Ausencia" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          className="p-4"
          items={[
            {
              key: 'heatmap',
              label: '🗓️ Heatmap por Estudiante',
              children: (
                <div className="overflow-x-auto">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                  ) : heatmapData ? (
                    <>
                      {/* Legend */}
                      <div className="flex gap-4 mb-4 text-sm">
                        <span className="flex items-center gap-1">
                          <span className="w-4 h-4 rounded bg-green-500"></span> Presente
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-4 h-4 rounded bg-yellow-500"></span> Tardanza
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-4 h-4 rounded bg-red-500"></span> Ausente
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-4 h-4 rounded bg-blue-500"></span> Justificado
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-4 h-4 rounded bg-gray-200"></span> Fin de semana
                        </span>
                      </div>

                      {/* Heatmap Table */}
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="sticky left-0 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-900 min-w-[180px]">
                              Estudiante
                            </th>
                            {Array.from({ length: heatmapData.daysInMonth }, (_, i) => (
                              <th key={i + 1} className="px-1 py-2 text-center font-medium text-gray-600 w-7">
                                {i + 1}
                              </th>
                            ))}
                            <th className="px-3 py-2 text-center font-semibold text-gray-900">
                              %
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {heatmapData.students.map((student) => (
                            <tr key={student.studentId} className="hover:bg-gray-50">
                              <td className="sticky left-0 bg-white px-3 py-2 font-medium text-gray-900 border-r">
                                <div className="truncate max-w-[170px]" title={student.studentName}>
                                  {student.studentName}
                                </div>
                              </td>
                              {student.days.map(({ day, status }) => (
                                <td key={day} className="px-0.5 py-1 text-center">
                                  <Tooltip title={status || 'Sin registro'}>
                                    <div className={`w-6 h-6 mx-auto rounded flex items-center justify-center text-white text-[10px] font-bold ${getStatusColor(status)}`}>
                                      {getStatusLabel(status)}
                                    </div>
                                  </Tooltip>
                                </td>
                              ))}
                              <td className="px-3 py-2 text-center font-bold">
                                <span className={student.summary.attendanceRate >= 80 ? 'text-green-600' : student.summary.attendanceRate >= 60 ? 'text-yellow-600' : 'text-red-600'}>
                                  {student.summary.attendanceRate}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  ) : (
                    <p className="text-center py-12 text-gray-500">Selecciona una sección para ver el reporte</p>
                  )}
                </div>
              )
            },
            {
              key: 'comparison',
              label: '📊 Comparativo de Secciones',
              children: (
                <div>
                  {comparisonData.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Ranking Table */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-4">Ranking de Secciones</h4>
                        <div className="space-y-3">
                          {comparisonData.map((section, index) => (
                            <div key={section._id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                              <span className="text-2xl">{getRankingEmoji(index)}</span>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{section.sectionName}</p>
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                  <div
                                    className="bg-green-500 h-2 rounded-full"
                                    style={{ width: `${section.attendanceRate}%` }}
                                  ></div>
                                </div>
                              </div>
                              <span className="text-lg font-bold text-green-600">
                                {section.attendanceRate}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Bar Chart */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-4">Gráfico Comparativo</h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={comparisonData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                            <YAxis type="category" dataKey="sectionName" width={100} tick={{ fontSize: 12 }} />
                            <RechartsTooltip formatter={(value: number) => `${value}%`} />
                            <Bar dataKey="attendanceRate" name="Asistencia">
                              {comparisonData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getRankingColor(index)} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center py-12 text-gray-500">No hay datos de comparación disponibles</p>
                  )}
                </div>
              )
            }
          ]}
        />
      </div>
    </div>
  );
}