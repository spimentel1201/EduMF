import { useEffect, useState } from 'react';
import { guardianApi } from '@/services/guardianApi';
import DOMPurify from 'dompurify';
import { BellIcon } from '@heroicons/react/24/outline';

export default function PortalMessagesPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await guardianApi.get('/guardian-messages');
      setMessages(res.data.data || []);
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
    return <div className="p-4 text-gray-500">Cargando comunicados...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Comunicados</h1>
      {messages.map((m) => (
        <div key={m.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {m.imageUrl && <img src={m.imageUrl} alt={m.title} className="w-full max-h-48 object-cover" />}
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">{m.title}</h2>
              <span className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleDateString('es-PE')}</span>
            </div>
            <div
              className="text-sm text-gray-700 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(m.body) }}
            />
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-gray-400">
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 text-sm">
          <BellIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          Sin comunicados.
        </div>
      )}
    </div>
  );
}
