import { useEffect, useState } from 'react';
import { guardianApi } from '@/services/guardianApi';
import DOMPurify from 'dompurify';
import { BellIcon } from '@heroicons/react/24/outline';

export default function PortalMessagesPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await guardianApi.get('/guardian-messages');
      const msgs = res.data.data || [];
      setMessages(msgs);
      // Auto-marcar como leído al visualizar la lista
      const unread = msgs.filter((m: any) => !m.readBy?.length);
      for (const m of unread) {
        guardianApi.patch(`/guardian-messages/${m.id}/read`).catch(() => {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const markRead = async (id: string) => {
    try {
      await guardianApi.patch(`/guardian-messages/${id}/read`);
      cargar();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-sky-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-gray-50">
      <div className="bg-gradient-to-br from-sky-500 to-blue-600 text-white px-5 pt-6 pb-8 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
            <BellIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs text-white/80">Comunicados</p>
            <h1 className="text-lg font-semibold">Mensajes del colegio</h1>
          </div>
        </div>
        <p className="text-sm text-white/80 mt-3">{messages.length} comunicado(s)</p>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {messages.map((m) => (
          <div key={m.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {m.imageUrl && <img src={m.imageUrl} alt={m.title} className="w-full max-h-48 object-cover" />}
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold text-gray-800">{m.title}</h2>
                <span className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</span>
              </div>
              <div
                className="text-sm text-gray-700 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(m.body) }}
              />
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className={`text-xs font-medium ${m.readBy?.length ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {m.readBy?.length ? 'Leído' : 'No leído'}
                </span>
                {!m.readBy?.length && (
                  <button
                    onClick={() => markRead(m.id)}
                    className="text-xs text-[#538f65] font-medium"
                  >
                    Marcar como leído
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {messages.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-50 flex items-center justify-center mb-3">
              <BellIcon className="w-7 h-7 text-sky-400" />
            </div>
            <p className="text-gray-500 text-sm">Sin comunicados.</p>
          </div>
        )}
      </div>
    </div>
  );
}
