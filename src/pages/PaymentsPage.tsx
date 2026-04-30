import { useState } from 'react';
import {
  MagnifyingGlassIcon,
  BellIcon,
  Cog8ToothIcon,
  PlusIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  ArrowRightIcon,
  Bars3BottomLeftIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';


const TABLE_DATA = [
  {
    id: 1,
    concepto: 'Mensualidad Marzo 2024',
    subconcepto: 'Servicio Educativo Regular',
    grado: '4to Primaria "A"',
    frecuencia: 'Mensual',
    emision: '01 Mar 2024',
    estado: 'VIGENTE',
  },
  {
    id: 2,
    concepto: 'Taller de Robótica',
    subconcepto: 'Actividad Extracurricular',
    grado: 'General',
    frecuencia: 'Único',
    emision: '15 Feb 2024',
    estado: 'FINALIZADO',
  },
  {
    id: 3,
    concepto: 'Cuota Mantenimiento',
    subconcepto: 'Anual Administrativo',
    grado: 'Toda la Institución',
    frecuencia: 'Anual',
    emision: '10 Ene 2024',
    estado: 'VIGENTE',
  },
];

export default function PaymentsPage() {
  const [search, setSearch] = useState('');
  const { t } = useTranslation();

  const KPI_CARDS = [
    {
      title: t('payments.kpi.totalCollection'),
      value: '$42,500.00',
      subStat: t('payments.kpi.totalCollectionSub'),
      subStatIcon: ArrowTrendingUpIcon,
      bgClass: 'bg-[#6CA07C]',
      textClass: 'text-white',
      subTextClass: 'text-green-50',
      hasWatermark: true,
    },
    {
      title: t('payments.kpi.pendingCharges'),
      value: '$12,840.00',
      subStat: `145 ${t('payments.kpi.pendingChargesSub')}`,
      subStatIcon: ClockIcon,
      bgClass: 'bg-[#F2EFE8]',
      textClass: 'text-gray-800',
      subTextClass: 'text-gray-600',
      hasWatermark: false,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-10 space-y-8 h-full flex flex-col font-sans">
      {/* ── Top Custom Header (mimicking the design inside the content area) ── */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-[1.35rem] font-bold text-[#143d24]">{t('payments.title')}</h1>
        
        <div className="flex-1 max-w-xl mx-8">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('payments.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#F6F4EB] text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-[#538f65]/30 placeholder-gray-400 text-gray-700"
            />
          </div>
        </div>
      </div>

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">{t('payments.summaryTitle')}</h2>
          <p className="text-[15px] font-medium text-gray-500 mt-1">{t('payments.summaryDesc')}</p>
        </div>
        <Link 
          to="/payments/new" 
          className="flex items-center gap-2 px-5 py-2.5 bg-[#4F8B61] text-white text-sm font-semibold rounded-full shadow-sm hover:bg-[#3f7350] transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          {t('payments.newChargeBtn')}
        </Link>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 & 2 */}
        {KPI_CARDS.map((card, idx) => (
          <div key={idx} className={`relative p-6 rounded-[2rem] overflow-hidden ${card.bgClass} flex flex-col justify-between h-[160px]`}>
            {card.hasWatermark && (
              <BanknotesIcon className="absolute -bottom-6 -right-4 w-32 h-32 text-white/10 transform rotate-12" />
            )}
            <div className="relative z-10">
              <h3 className={`text-xs font-black tracking-widest uppercase mb-1 ${card.subTextClass}`}>
                {card.title}
              </h3>
              <p className={`text-[2.5rem] font-bold leading-tight ${card.textClass}`}>
                {card.value}
              </p>
            </div>
            <div className={`relative z-10 flex items-center gap-1.5 text-[0.85rem] font-bold ${card.subTextClass}`}>
              <card.subStatIcon className="w-4 h-4" />
              <span>{card.subStat}</span>
            </div>
          </div>
        ))}

        {/* Card 3 (Alumnos Morosos) */}
        <div className="p-6 rounded-[2rem] bg-white border border-[#EBE8DD] flex flex-col justify-between h-[160px]">
          <div>
            <h3 className="text-xs font-black tracking-widest uppercase text-[#D24545] mb-1">
              {t('payments.kpi.defaulters')}
            </h3>
            <p className="text-[2.5rem] font-bold leading-tight text-gray-900">
              12
            </p>
          </div>
          <Link to="/payments/defaulters" className="flex items-center justify-between text-[0.85rem] font-bold text-[#4F8B61] hover:text-[#3f7350] transition-colors w-full">
            {t('payments.kpi.defaultersReport')}
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="bg-white rounded-[2rem] border border-[#EBE8DD] overflow-hidden shadow-sm">
        <div className="p-6 flex items-center justify-between border-b border-gray-50">
          <h3 className="text-lg font-bold text-gray-800">{t('payments.table.title')}</h3>
          <div className="flex gap-2">
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              <Bars3BottomLeftIcon className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowDownTrayIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-black text-gray-600 uppercase tracking-wider">{t('payments.table.concept')}</th>
                <th className="px-6 py-4 text-xs font-black text-gray-600 uppercase tracking-wider">{t('payments.table.gradeSection')}</th>
                <th className="px-6 py-4 text-xs font-black text-gray-600 uppercase tracking-wider">{t('payments.table.frequency')}</th>
                <th className="px-6 py-4 text-xs font-black text-gray-600 uppercase tracking-wider">{t('payments.table.issueDate')}</th>
                <th className="px-6 py-4 text-xs font-black text-gray-600 uppercase tracking-wider">{t('payments.table.status')}</th>
                <th className="px-6 py-4 text-xs font-black text-gray-600 uppercase tracking-wider text-right">{t('payments.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {TABLE_DATA.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm font-bold text-gray-800">{row.concepto}</p>
                    <p className="text-[13px] font-medium text-gray-400">{row.subconcepto}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-600">
                    {row.grado}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 italic">
                    {row.frecuencia}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-600">
                    {row.emision}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span 
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase ${
                        row.estado === 'VIGENTE' 
                          ? 'bg-[#EAF3EC] text-[#538f65]' 
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {row.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button className="inline-flex items-center gap-1.5 text-sm font-bold text-[#538f65] hover:text-[#3f7350] transition-colors">
                      {t('payments.table.viewDetail')}
                      <EyeIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 flex items-center justify-between border-t border-gray-50 bg-white">
          <p className="text-[13px] font-medium text-gray-500">
            {t('payments.table.showing')} 3 {t('payments.table.of')} 24 {t('payments.table.conceptsRegistered')}
          </p>
          <div className="flex items-center gap-1">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
              {'<'}
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#538f65] text-white font-bold text-sm">
              1
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold text-sm">
              2
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
              {'>'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
        <div className="p-6 rounded-[2rem] bg-[#C1A866] flex gap-5 cursor-pointer hover:bg-[#b09756] transition-colors group">
          <div className="w-14 h-14 shrink-0 rounded-full bg-white/20 flex items-center justify-center">
            <ChartBarIcon className="w-6 h-6 text-[#4a3f1f]" />
          </div>
          <div>
            <h3 className="text-[1.1rem] font-bold text-[#4a3f1f] mb-1 group-hover:text-[#342b10] transition-colors">{t('payments.reports.title')}</h3>
            <p className="text-[13px] font-medium text-[#655731] leading-snug pr-4">
              {t('payments.reports.desc')}
            </p>
          </div>
        </div>

        <div className="p-6 rounded-[2rem] bg-[#EBE9DA] flex gap-5 cursor-pointer hover:bg-[#E2DECB] transition-colors group">
          <div className="w-14 h-14 shrink-0 rounded-full bg-[#D4D2C3] flex items-center justify-center">
            <ChatBubbleLeftRightIcon className="w-6 h-6 text-[#5A594D]" />
          </div>
          <div>
            <h3 className="text-[1.1rem] font-bold text-[#3B3A36] mb-1 group-hover:text-[#21201D] transition-colors">{t('payments.management.title')}</h3>
            <p className="text-[13px] font-medium text-[#79776A] leading-snug pr-4">
              {t('payments.management.desc')}
            </p>
          </div>
        </div>
      </div>
      
    </div>
  );
}
