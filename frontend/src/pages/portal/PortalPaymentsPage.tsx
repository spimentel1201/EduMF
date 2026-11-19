import { useEffect, useState } from 'react';
import { guardianApi } from '@/services/guardianApi';
import { CreditCardIcon } from '@heroicons/react/24/outline';

const statusStyle: Record<string, string> = {
  PENDIENTE: 'bg-amber-100 text-amber-700',
  VENCIDO: 'bg-rose-100 text-rose-700',
  PAGADO: 'bg-emerald-100 text-emerald-700',
};

export default function PortalPaymentsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await guardianApi.get('/guardians/children/debts');
        setData(res.data.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-rose-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const totalDebt = data.reduce((acc, d) => acc + (parseFloat(d?.totalDebt) || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-gray-50">
      <div className="bg-gradient-to-br from-rose-500 to-pink-600 text-white px-5 pt-6 pb-8 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
            <CreditCardIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs text-white/80">Pagos</p>
            <h1 className="text-lg font-semibold">Estado de cuenta</h1>
          </div>
        </div>
        <div className="mt-4 bg-white/15 backdrop-blur rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-white/80">Deuda total pendiente</p>
            <p className="text-2xl font-bold">S/ {totalDebt.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/80">Hijos</p>
            <p className="text-2xl font-bold">{data.length}</p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {data.map((d) => {
          const pending = parseFloat(d?.totalDebt) || 0;
          return (
            <div key={d?.student?.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className={`h-1.5 ${pending > 0 ? 'bg-rose-400' : 'bg-emerald-400'}`} />
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-800">{d?.student?.firstName} {d?.student?.lastName}</h2>
                    <p className="text-xs text-gray-500">DNI: {d?.student?.dni || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Pendiente</p>
                    <p className={`text-lg font-bold ${pending > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      S/ {pending.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {(d?.debts || []).map((debt: any) => (
                    <div key={debt.id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{debt.description || debt.concept || 'Deuda'}</p>
                        <p className="text-xs text-gray-500">{new Date(debt.createdAt || debt.date).toLocaleDateString('es-PE')}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-gray-800">S/ {debt.amount?.$numberDecimal ?? debt.amount}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusStyle[debt.status] || 'bg-gray-100 text-gray-600'}`}>
                          {debt.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {(d?.debts || []).length === 0 && (
                    <div className="text-center text-gray-400 text-sm py-4">Sin deudas registradas.</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {data.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 flex items-center justify-center mb-3">
              <CreditCardIcon className="w-7 h-7 text-rose-400" />
            </div>
            <p className="text-gray-500 text-sm">Sin información de pagos.</p>
          </div>
        )}
      </div>
    </div>
  );
}
