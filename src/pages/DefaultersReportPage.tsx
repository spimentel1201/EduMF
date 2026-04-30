import { Link } from 'react-router-dom';
import {
  DocumentArrowDownIcon,
  TableCellsIcon,
  WalletIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  UserIcon,
  CheckCircleIcon,
  FunnelIcon,
  BarsArrowDownIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';

export default function DefaultersReportPage() {
  const DEBTORS = [
    {
      id: 1,
      name: 'Alejandro Mendoza',
      studentId: '#24010',
      initials: 'AM',
      bgClass: 'bg-[#EAE4D9]',
      grade: '4to de Primaria - B',
      amount: '$1,250.00',
      dueDate: '15 May, 2024',
      delayDays: '9 días de retraso',
    },
    {
      id: 2,
      name: 'Sofía Rodríguez',
      studentId: '#24088',
      initials: 'SR',
      bgClass: 'bg-[#C8A97E]',
      grade: '2do de Secundaria - A',
      amount: '$850.00',
      dueDate: '20 May, 2024',
      delayDays: '4 días de retraso',
    },
    {
      id: 3,
      name: 'Javier Villalobos',
      studentId: '#23955',
      initials: 'JV',
      bgClass: 'bg-[#EAE4D9]',
      grade: '6to de Primaria - C',
      amount: '$2,400.00',
      dueDate: '01 May, 2024',
      delayDays: '23 días de retraso',
    },
    {
      id: 4,
      name: 'Elena Morales',
      studentId: '#24112',
      initials: 'EM',
      bgClass: 'bg-[#8BB89A]',
      grade: '1ro de Primaria - A',
      amount: '$500.00',
      dueDate: '10 May, 2024',
      delayDays: '14 días de retraso',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-12 font-sans w-full">
      {/* ── Breadcrumb & Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="text-[13px] font-bold text-gray-400 mb-2">
            <Link to="/payments" className="hover:text-gray-600 transition-colors">Caja y Pagos</Link>
            <span className="mx-2">/</span>
            <span className="text-[#538f65]">Reportes</span>
          </div>
          <h1 className="text-[2rem] font-bold text-[#1F2937] leading-tight">Análisis de Cartera Pendiente</h1>
          <p className="text-[14px] font-medium text-gray-500 mt-1">Estado actualizado al 24 de Mayo, 2024</p>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
            <DocumentArrowDownIcon className="w-4 h-4" />
            Exportar PDF
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-[#538f65] text-white text-sm font-bold rounded-xl hover:bg-[#3f7350] transition-colors shadow-sm">
            <TableCellsIcon className="w-4 h-4" />
            Exportar Excel
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Card 1 */}
        <div className="bg-[#FAF9F6] border border-[#EBE8DD] rounded-[2rem] p-6 flex flex-col justify-between h-[160px]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[13px] font-bold text-gray-400 mb-1">Total Pendiente</p>
              <h3 className="text-[2rem] font-bold text-gray-900 leading-none">$45,280.00</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#FFEBEB] flex items-center justify-center shrink-0">
              <WalletIcon className="w-6 h-6 text-[#D24545]" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[#D24545] text-xs font-bold mt-4">
            <ArrowTrendingUpIcon className="w-4 h-4" />
            <span>12% más que el mes anterior</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-[#FAF9F6] border border-[#EBE8DD] rounded-[2rem] p-6 flex flex-col justify-between h-[160px]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[13px] font-bold text-gray-400 mb-1">Alumnos con Deuda</p>
              <h3 className="text-[2rem] font-bold text-gray-900 leading-none">42</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#CEB58A] flex items-center justify-center shrink-0">
              <UsersIcon className="w-6 h-6 text-[#684C27]" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[#8A6A3A] text-xs font-bold mt-4">
            <UserIcon className="w-4 h-4" />
            <span>8% del total estudiantil</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-[#FAF9F6] border border-[#EBE8DD] rounded-[2rem] p-6 flex flex-col justify-between h-[160px]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[13px] font-bold text-gray-400 mb-1">Recaudación del Mes</p>
              <h3 className="text-[2rem] font-bold text-gray-900 leading-none">$128,450.00</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#8BB89A] flex items-center justify-center shrink-0">
              <CurrencyDollarIcon className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[#538f65] text-xs font-bold mt-4">
            <CheckCircleIcon className="w-4 h-4" />
            <span>Meta del 85% alcanzada</span>
          </div>
        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="bg-white rounded-[2rem] border border-[#EBE8DD] shadow-sm overflow-hidden">
        <div className="px-8 py-6 flex items-center justify-between border-b border-[#EBE8DD]">
          <h2 className="text-[1.1rem] font-bold text-gray-800">Lista de Alumnos Deudores</h2>
          <div className="flex items-center gap-3">
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              <FunnelIcon className="w-5 h-5" />
            </button>
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              <BarsArrowDownIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-white border-b border-[#EBE8DD]">
                <th className="px-8 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider">Nombre del Alumno</th>
                <th className="px-8 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider">Grado/Sección</th>
                <th className="px-8 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider">Monto Adeudado</th>
                <th className="px-8 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider">Último Vencimiento</th>
                <th className="px-8 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F2EC]">
              {DEBTORS.map((debtor) => (
                <tr key={debtor.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-gray-700 shrink-0 ${debtor.bgClass}`}>
                        {debtor.initials}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800 group-hover:text-black transition-colors">{debtor.name}</p>
                        <p className="text-[12px] font-medium text-gray-400">ID: {debtor.studentId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-sm font-medium text-gray-600">
                    {debtor.grade}
                  </td>
                  <td className="px-8 py-5 text-sm font-bold text-[#D24545]">
                    {debtor.amount}
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-sm font-medium text-gray-800">{debtor.dueDate}</p>
                    <p className="text-[10px] font-bold text-[#D24545] tracking-wide mt-0.5">{debtor.delayDays}</p>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button className="inline-flex items-center gap-2 text-sm font-bold text-[#538f65] hover:text-[#3f7350] transition-colors">
                      <EnvelopeIcon className="w-5 h-5" />
                      Notificar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-8 py-5 flex items-center justify-between border-t border-[#EBE8DD] text-sm text-gray-400 font-medium bg-white">
          <p>Mostrando 1-4 de 42 alumnos con deuda</p>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
              {'<'}
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-[#538f65] text-white font-bold text-sm">
              1
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 font-bold text-sm transition-colors">
              2
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 font-bold text-sm transition-colors">
              3
            </button>
            <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
              {'>'}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
