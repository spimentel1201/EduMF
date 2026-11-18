import { useEffect, useState } from 'react';
import { guardianApi } from '@/services/guardianApi';

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

  if (loading) return <div className="p-4 text-gray-500">Cargando...</div>;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Pagos</h1>
      {data.map((d) => (
        <div key={d?.student?.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{d?.student?.firstName} {d?.student?.lastName}</h2>
            <span className="text-sm font-medium text-[#538f65]">Pendiente: S/ {d?.totalDebt}</span>
          </div>
          <div className="space-y-2">
            {(d?.debts || []).map((debt: any) => (
              <div key={debt.id} className="flex items-center justify-between text-sm border-t border-gray-100 pt-2">
                <div>
                  <p className="font-medium">{debt.description || debt.concept || 'Deuda'}</p>
                  <p className="text-xs text-gray-500">{debt.status}</p>
                </div>
                <span className="font-medium">S/ {debt.amount}</span>
              </div>
            ))}
            {(d?.debts || []).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-2">Sin deudas registradas.</p>
            )}
          </div>
        </div>
      ))}
      {data.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center text-gray-400">
          Sin información de pagos.
        </div>
      )}
    </div>
  );
}
