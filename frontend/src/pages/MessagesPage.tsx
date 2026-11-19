import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { toast } from 'react-hot-toast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import StudentSearch from '@/components/StudentSearch';
import EvidenceUploader from '@/components/EvidenceUploader';
import { sectionService } from '@/services/sectionService';

export default function MessagesPage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [audience, setAudience] = useState<'all' | 'section' | 'students'>('all');
  const [sectionId, setSectionId] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<{ id: string; name: string }[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');

  const studentIds = selectedStudents.map((s) => s.id);

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => sectionService.getAll(),
  });

  const { data: sent = [] } = useQuery({
    queryKey: ['messages-sent'],
    queryFn: async () => {
      const res = await api.get('/messages/sent');
      return res.data.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { title, body, imageUrl, audience };
      if (audience === 'section') payload.sectionId = sectionId;
      if (audience === 'students') payload.studentIds = studentIds;
      const res = await api.post('/messages', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Comunicado enviado.');
      setTitle('');
      setBody('');
      setImageUrl(undefined);
      setAudience('all');
      setSectionId('');
      setSelectedStudents([]);
      setSelectedStudent('');
      queryClient.invalidateQueries({ queryKey: ['messages-sent'] });
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Error al enviar comunicado.');
    },
  });

  const addStudent = (id: string, user?: any) => {
    if (!studentIds.includes(id)) {
      setSelectedStudents((prev) => [...prev, { id, name: user ? `${user.firstName} ${user.lastName}` : id }]);
    }
    setSelectedStudent('');
  };

  const removeStudent = (id: string) => {
    setSelectedStudents((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Comunicados</h1>
        <p className="text-sm text-gray-500">Enviar mensajes a padres/tutores</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
        <h2 className="font-medium text-gray-800">Nuevo comunicado</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Título</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4B79A1]"
            placeholder="Título del comunicado"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción</label>
          <ReactQuill theme="snow" value={body} onChange={setBody} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Audiencia</label>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as any)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4B79A1]"
          >
            <option value="all">Todos los padres/tutores</option>
            <option value="section">Por sección</option>
            <option value="students">Estudiantes seleccionados</option>
          </select>
        </div>

        {audience === 'section' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Sección</label>
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4B79A1]"
            >
              <option value="">Seleccionar sección...</option>
              {sections.map((s: any) => (
                <option key={s.id || s._id} value={s.id || s._id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        {audience === 'students' && (
          <div className="space-y-2">
            <StudentSearch
              label="Agregar estudiante"
              value={selectedStudent}
              onChange={(id) => { if (id) addStudent(id); }}
              onSelect={(u) => addStudent(u.id, u)}
            />
            {selectedStudents.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedStudents.map((s) => (
                  <span key={s.id} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    {s.name}
                    <button type="button" onClick={() => removeStudent(s.id)} className="text-rose-600">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <EvidenceUploader value={imageUrl} onChange={setImageUrl} />

        <button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending || !title.trim() || !body.trim()}
          className="w-full bg-[#538f65] hover:bg-[#3f7350] text-white rounded-xl py-3 font-semibold transition disabled:opacity-60"
        >
          {createMutation.isPending ? 'Enviando...' : 'Enviar comunicado'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <h2 className="font-medium text-gray-800">Comunicados enviados</h2>
        {sent.map((m: any) => (
          <div key={m.id} className="border-t border-gray-100 pt-3 first:border-t-0 first:pt-0">
            <p className="font-medium text-gray-800">{m.title}</p>
            <p className="text-xs text-gray-500">{new Date(m.createdAt).toLocaleString('es-PE')} · {m.audience}</p>
          </div>
        ))}
        {sent.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Sin comunicados enviados.</p>}
      </div>
    </div>
  );
}
