import { useEffect, useState } from 'react';
import { userService } from '@/services/userService';

interface StudentSearchProps {
  label: string;
  value: string;
  onChange: (id: string) => void;
  onSelect?: (user: any) => void;
  placeholder?: string;
}

export default function StudentSearch({ label, value, onChange, onSelect, placeholder = 'Buscar por DNI o nombre...' }: StudentSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const users = await userService.getAll(query.trim());
        setResults(users.slice(0, 8));
      } catch (e) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!value) {
      setSelectedLabel('');
      return;
    }
    const found = results.find((u) => u.id === value);
    if (found) setSelectedLabel(`${found.firstName} ${found.lastName} (${found.dni})`);
  }, [value, results]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {value ? (
        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
          <span className="text-sm text-gray-800">{selectedLabel || value}</span>
          <button type="button" onClick={() => onChange('')} className="text-xs text-rose-600 font-medium">
            Quitar
          </button>
        </div>
      ) : (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4B79A1]"
            placeholder={placeholder}
          />
          {loading && <p className="text-xs text-gray-400">Buscando...</p>}
          {results.length > 0 && (
            <div className="border border-gray-100 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              {results.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    onChange(u.id);
                    onSelect?.(u);
                    setQuery('');
                    setResults([]);
                    setSelectedLabel(`${u.firstName} ${u.lastName} (${u.dni})`);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-b-0"
                >
                  <p className="text-sm font-medium text-gray-800">{u.firstName} {u.lastName}</p>
                  <p className="text-xs text-gray-500">DNI: {u.dni} · {u.role === 'student' ? 'Estudiante' : u.role}</p>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
