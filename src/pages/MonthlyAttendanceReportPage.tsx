import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { attendanceService } from '../services/attendanceService';
import { getSections } from '../services/sectionService';
import { Section } from '../types/academic';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useInstitutionSettings } from '@/hooks/useInstitutionSettings';
import { addInstitutionHeaderToPDF, addInstitutionHeaderToSheet } from '@/utils/institutionHeader';
import { useAuth } from '@/contexts/AuthContext';
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
  DocumentArrowDownIcon,
  ChevronDownIcon,
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
  workingDaysInMonth: number;
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

// Day-of-week label (0=Sun … 6=Sat)
const DAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function getDayLetter(year: number, month: number, day: number): string {
  return DAY_LETTERS[new Date(year, month - 1, day).getDay()];
}

function isWeekend(year: number, month: number, day: number): boolean {
  const dow = new Date(year, month - 1, day).getDay();
  return dow === 0 || dow === 6;
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

  const { data: institutionData } = useInstitutionSettings();
  const { user } = useAuth();

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

    const wb = XLSX.utils.book_new();

    // ── Main sheet: attendance data ──
    const ws = XLSX.utils.aoa_to_sheet([]);

    // Institution header (returns row offset)
    const headerRows = addInstitutionHeaderToSheet(ws, institutionData);

    // Section + period info
    XLSX.utils.sheet_add_aoa(ws, [
      [`Sección: ${selectedSectionName}  |  Período: ${selectedMonth.format('MMMM YYYY')}`],
      [],
    ], { origin: { r: headerRows, c: 0 } });

    // Attendance data rows
    const excelData = heatmapData.students.map(student => {
      const row: Record<string, any> = {
        'Estudiante': student.studentName,
        'DNI': student.dni,
      };
      student.days.forEach(({ day, status }) => {
        row[`Día ${day}`] = status === 'weekend' ? '-' : (status || '');
      });
      row['Presentes']    = student.summary.present;
      row['Tardanzas']    = student.summary.late;
      row['Ausencias']    = student.summary.absent;
      row['Justificados'] = student.summary.justified;
      row['% Asistencia'] = `${student.summary.attendanceRate}%`;
      return row;
    });

    XLSX.utils.sheet_add_json(ws, excelData, { origin: { r: headerRows + 2, c: 0 } });

    const colWidths = Object.keys(excelData[0] || {}).map(key => ({ wch: Math.max(key.length, 10) }));
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Asistencia');

    // ── Summary sheet ──
    const summaryData = [{
      'Institución':        institutionData?.name || '',
      'Sección':            selectedSectionName,
      'Mes':                selectedMonth.format('MMMM YYYY'),
      'Total Estudiantes':  heatmapData.summary.studentCount,
      'Total Registros':    heatmapData.summary.total,
      'Presentes':          heatmapData.summary.present,
      'Tardanzas':          heatmapData.summary.late,
      'Ausencias':          heatmapData.summary.absent,
      'Justificados':       heatmapData.summary.justified,
      '% Asistencia General': `${heatmapData.summary.attendanceRate}%`,
    }];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Asistencia_${selectedSectionName}_${selectedMonth.format('YYYY-MM')}.xlsx`);
  };

  // Export to PDF
  const exportToPDF = () => {
    if (!heatmapData) return;

    const doc = new jsPDF('landscape');

    // Institution header — returns Y where content should start
    const startY = addInstitutionHeaderToPDF(
      doc,
      institutionData,
      `Reporte de Asistencia — ${selectedSectionName}`
    );

    // Period + summary info
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(113, 128, 150);
    doc.text(`Período: ${selectedMonth.format('MMMM YYYY')}`, 14, startY);
    doc.text(`Estudiantes: ${heatmapData.summary.studentCount}`, 80, startY);
    doc.text(`Asistencia: ${heatmapData.summary.attendanceRate}%`, 140, startY);
    doc.text(`Presentes: ${heatmapData.summary.present}`, 190, startY);
    doc.text(`Tardanzas: ${heatmapData.summary.late}`, 230, startY);
    doc.text(`Ausencias: ${heatmapData.summary.absent}`, 265, startY);

    // Table
    const tableData = heatmapData.students.map(student => [
      student.studentName,
      student.dni,
      student.summary.present,
      student.summary.late,
      student.summary.absent,
      student.summary.justified,
      `${student.summary.attendanceRate}%`,
    ]);

    autoTable(doc, {
      startY: startY + 7,
      head: [['Estudiante', 'DNI', 'Presentes', 'Tardanzas', 'Ausencias', 'Justificados', '% Asist.']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [83, 143, 101] }, // #538f65
    });

    doc.save(`Asistencia_${selectedSectionName}_${selectedMonth.format('YYYY-MM')}.pdf`);
  };

  // Export to PDF — Formal (with institution header, tutor, signature space)
  const exportToPDFFormal = () => {
    if (!heatmapData) return;

    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;
    const contentW = pageW - margin * 2;

    // ── Logo + institution block ──────────────────────────────────────────
    let y = 12;
    if (institutionData?.logoBase64) {
      try {
        const fmt = institutionData.logoBase64.startsWith('data:image/png') ? 'PNG'
          : institutionData.logoBase64.startsWith('data:image/webp') ? 'WEBP' : 'JPEG';
        doc.addImage(institutionData.logoBase64, fmt, margin, y, 18, 18);
      } catch { /* skip logo on error */ }
    }
    const textX = institutionData?.logoBase64 ? margin + 22 : margin;

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 32, 44);
    doc.text(institutionData?.name || 'Institución Educativa', textX, y + 6);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(113, 128, 150);
    const contactParts: string[] = [];
    if (institutionData?.address) contactParts.push(institutionData.address);
    if (institutionData?.phone)   contactParts.push(institutionData.phone);
    if (institutionData?.email)   contactParts.push(institutionData.email);
    if (contactParts.length > 0) doc.text(contactParts.join('  |  '), textX, y + 12);

    y = Math.max(y + 24, 38);

    // ── Separator line ────────────────────────────────────────────────────
    doc.setDrawColor(83, 143, 101);
    doc.setLineWidth(0.6);
    doc.line(margin, y, pageW - margin, y);
    y += 5;

    // ── Report title ──────────────────────────────────────────────────────
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 32, 44);
    doc.text('REGISTRO DE ASISTENCIA MENSUAL', pageW / 2, y, { align: 'center' });
    y += 7;

    // ── Info grid (2 columns) ─────────────────────────────────────────────
    const selectedSectionObj = sections.find(s => s.id === selectedSection);
    const tutorName = selectedSectionObj?.teacher || '—';
    const infoRows = [
      ['Grado y Sección:', selectedSectionName,   'Período:', selectedMonth.locale('es').format('MMMM YYYY').toUpperCase()],
      ['Nivel:',          selectedSectionObj?.level || '—', 'Tutor(a):', tutorName],
      ['Exportado por:',  user?.name || '—',       'Fecha de emisión:', dayjs().format('DD/MM/YYYY HH:mm')],
    ];

    doc.setFontSize(8.5);
    const colW = contentW / 2;
    infoRows.forEach(([lbl1, val1, lbl2, val2]) => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(83, 143, 101);
      doc.text(lbl1, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(26, 32, 44);
      doc.text(val1, margin + 30, y);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(83, 143, 101);
      doc.text(lbl2, margin + colW, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(26, 32, 44);
      doc.text(val2, margin + colW + 30, y);
      y += 6;
    });
    y += 3;

    // ── Summary stats bar ─────────────────────────────────────────────────
    doc.setFillColor(248, 250, 249);
    doc.roundedRect(margin, y, contentW, 14, 2, 2, 'F');
    const stats = [
      { label: 'Estudiantes', value: String(heatmapData.summary.studentCount) },
      { label: 'Días hábiles', value: String(heatmapData.workingDaysInMonth) },
      { label: 'Presentes', value: String(heatmapData.summary.present) },
      { label: 'Tardanzas', value: String(heatmapData.summary.late) },
      { label: 'Ausencias', value: String(heatmapData.summary.absent) },
      { label: 'Asistencia', value: `${heatmapData.summary.attendanceRate}%` },
    ];
    const statW = contentW / stats.length;
    stats.forEach((s, i) => {
      const sx = margin + i * statW + statW / 2;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(83, 143, 101);
      doc.text(s.value, sx, y + 6, { align: 'center' });
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(113, 128, 150);
      doc.text(s.label, sx, y + 11, { align: 'center' });
    });
    y += 18;

    // ── Attendance table ──────────────────────────────────────────────────
    const tableData = heatmapData.students.map((student, idx) => [
      String(idx + 1),
      student.studentName,
      student.dni,
      String(student.summary.present),
      String(student.summary.late),
      String(student.summary.absent),
      String(student.summary.justified),
      `${student.summary.attendanceRate}%`,
    ]);

    autoTable(doc, {
      startY: y,
      head: [['N°', 'Apellidos y Nombres', 'DNI', 'P', 'T', 'A', 'J', '%']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [83, 143, 101], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 8,  halign: 'center' },
        1: { cellWidth: 70 },
        2: { cellWidth: 22, halign: 'center' },
        3: { cellWidth: 10, halign: 'center' },
        4: { cellWidth: 10, halign: 'center' },
        5: { cellWidth: 10, halign: 'center' },
        6: { cellWidth: 10, halign: 'center' },
        7: { cellWidth: 16, halign: 'center' },
      },
      alternateRowStyles: { fillColor: [248, 250, 249] },
      margin: { left: margin, right: margin },
    });

    // ── Signature block ───────────────────────────────────────────────────
    const finalY = (doc as any).lastAutoTable.finalY + 16;
    const sigW = 60;
    const sigSpacing = (contentW - sigW * 2) / 3;

    // Tutor signature
    const sig1X = margin + sigSpacing;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(sig1X, finalY, sig1X + sigW, finalY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 32, 44);
    doc.text('Tutor(a) de Aula', sig1X + sigW / 2, finalY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(113, 128, 150);
    doc.text(tutorName, sig1X + sigW / 2, finalY + 10, { align: 'center' });

    // Director signature
    const sig2X = margin + sigSpacing * 2 + sigW;
    doc.line(sig2X, finalY, sig2X + sigW, finalY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 32, 44);
    doc.text('Director(a)', sig2X + sigW / 2, finalY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(113, 128, 150);
    doc.text(institutionData?.name || '', sig2X + sigW / 2, finalY + 10, { align: 'center' });

    // ── Footer ────────────────────────────────────────────────────────────
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text(
      `Documento generado el ${dayjs().format('DD/MM/YYYY HH:mm')} por ${user?.name || '—'} — ${institutionData?.name || ''}`,
      pageW / 2,
      pageH - 8,
      { align: 'center' }
    );

    doc.save(`Reporte_Formal_${selectedSectionName}_${selectedMonth.format('YYYY-MM')}.pdf`);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1a202c' }}>
            Reporte de Asistencia Mensual
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#718096' }}>
            {selectedSectionName} — {selectedMonth.format('MMMM YYYY')}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          {/* Section selector */}
          <select
            value={selectedSection ?? ''}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
          >
            <option value="">Seleccionar sección</option>
            {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          {/* Month/year picker — native month input */}
          <input
            type="month"
            value={selectedMonth.format('YYYY-MM')}
            onChange={(e) => e.target.value && setSelectedMonth(dayjs(e.target.value))}
            className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
          />

          {/* Export dropdown */}
          <div className="relative group">
            <button
              disabled={!heatmapData}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 shadow-sm transition-colors disabled:opacity-40"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              Exportar
              <ChevronDownIcon className="w-3.5 h-3.5" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-100 rounded-xl shadow-lg z-10 hidden group-hover:block">
              <button
                onClick={exportToExcel}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-t-xl transition-colors"
              >
                📊 Exportar a Excel
              </button>
              <button
                onClick={exportToPDF}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                📄 Exportar a PDF
              </button>
              <button
                onClick={exportToPDFFormal}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-b-xl transition-colors"
              >
                📋 PDF Formal (con firma)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      {heatmapData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Tasa de Asistencia"
            value={`${heatmapData.summary.attendanceRate}%`}
            subtitle={`${heatmapData.summary.present} presentes de ${heatmapData.workingDaysInMonth} días hábiles`}
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

      {/* ── Trend Chart ── */}
      {trendChartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-base font-bold text-gray-900 mb-4">Tendencia Diaria de Asistencia</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
              <RechartsTooltip formatter={(value: number) => `${value}%`} />
              <Legend />
              <Line type="monotone" dataKey="asistencia" stroke="#22c55e" strokeWidth={2} name="Asistencia" dot={false} />
              <Line type="monotone" dataKey="tardanza"   stroke="#eab308" strokeWidth={2} name="Tardanza"   dot={false} />
              <Line type="monotone" dataKey="ausencia"   stroke="#ef4444" strokeWidth={2} name="Ausencia"   dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-100 px-5 pt-4 gap-1">
          {[
            { key: 'heatmap',    label: '🗓️ Heatmap por Estudiante'    },
            { key: 'comparison', label: '📊 Comparativo de Secciones' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-semibold rounded-t-xl transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'border-green-600 text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* ── Heatmap tab ── */}
          {activeTab === 'heatmap' && (
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-gray-200 border-t-green-500 rounded-full animate-spin" />
                </div>
              ) : heatmapData ? (
                <>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-4 mb-4 text-xs">
                    {[
                      { color: 'bg-green-500',  label: 'Presente'       },
                      { color: 'bg-yellow-500', label: 'Tardanza'       },
                      { color: 'bg-red-500',    label: 'Ausente'        },
                      { color: 'bg-blue-500',   label: 'Justificado'    },
                      { color: 'bg-gray-200',   label: 'Fin de semana'  },
                    ].map((item) => (
                      <span key={item.label} className="flex items-center gap-1.5 text-gray-600">
                        <span className={`w-3.5 h-3.5 rounded ${item.color}`} />
                        {item.label}
                      </span>
                    ))}
                  </div>

                  {/* Heatmap table */}
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr style={{ background: '#f8faf9' }}>
                        <th className="sticky left-0 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700 min-w-[180px] border-r border-gray-100">
                          Estudiante
                        </th>
                        {Array.from({ length: heatmapData.daysInMonth }, (_, i) => {
                          const day = i + 1;
                          const letter = getDayLetter(selectedMonth.year(), selectedMonth.month() + 1, day);
                          const weekend = isWeekend(selectedMonth.year(), selectedMonth.month() + 1, day);
                          return (
                            <th
                              key={day}
                              className={`px-0.5 py-1 text-center w-7 ${weekend ? 'opacity-40' : ''}`}
                            >
                              <div className={`text-[9px] font-bold leading-none mb-0.5 ${
                                weekend ? 'text-gray-400' : letter === 'V' ? 'text-blue-500' : 'text-gray-500'
                              }`}>
                                {letter}
                              </div>
                              <div className={`font-medium ${weekend ? 'text-gray-400' : 'text-gray-600'}`}>
                                {day}
                              </div>
                            </th>
                          );
                        })}
                        <th className="px-3 py-2 text-center font-semibold text-gray-700">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {heatmapData.students.map((student) => (
                        <tr key={student.studentId} className="hover:bg-gray-50/50">
                          <td className="sticky left-0 bg-white px-3 py-1.5 font-medium text-gray-900 border-r border-gray-100">
                            <div className="truncate max-w-[170px]" title={student.studentName}>
                              {student.studentName}
                            </div>
                          </td>
                          {student.days.map(({ day, status }) => {
                            const weekend = status === 'weekend';
                            return (
                              <td key={day} className={`px-0.5 py-1 text-center ${weekend ? 'opacity-40' : ''}`}>
                                <div
                                  title={weekend ? 'Fin de semana' : (status ?? 'Sin registro')}
                                  className={`w-6 h-6 mx-auto rounded flex items-center justify-center text-white text-[10px] font-bold ${getStatusColor(status)}`}
                                >
                                  {getStatusLabel(status)}
                                </div>
                              </td>
                            );
                          })}
                          <td className="px-3 py-1.5 text-center font-bold">
                            <span className={
                              student.summary.attendanceRate >= 80 ? 'text-green-600'
                              : student.summary.attendanceRate >= 60 ? 'text-yellow-600'
                              : 'text-red-600'
                            }>
                              {student.summary.attendanceRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <p className="text-center py-12 text-gray-400 text-sm">
                  Selecciona una sección para ver el reporte.
                </p>
              )}
            </div>
          )}

          {/* ── Comparison tab ── */}
          {activeTab === 'comparison' && (
            <div>
              {comparisonData.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Ranking */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-4">Ranking de Secciones</h4>
                    <div className="space-y-3">
                      {comparisonData.map((section, index) => (
                        <div key={section._id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                          <span className="text-xl">{getRankingEmoji(index)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{section.sectionName}</p>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1.5">
                              <div
                                className="h-1.5 rounded-full transition-all"
                                style={{ width: `${section.attendanceRate}%`, background: '#538f65' }}
                              />
                            </div>
                          </div>
                          <span className="text-sm font-bold text-green-700 flex-shrink-0">
                            {section.attendanceRate}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bar chart */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-4">Gráfico Comparativo</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={comparisonData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                        <YAxis type="category" dataKey="sectionName" width={100} tick={{ fontSize: 12 }} />
                        <RechartsTooltip formatter={(value: number) => `${value}%`} />
                        <Bar dataKey="attendanceRate" name="Asistencia">
                          {comparisonData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={getRankingColor(index)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <p className="text-center py-12 text-gray-400 text-sm">
                  No hay datos de comparación disponibles.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}