import { useRef, useState } from 'react';

interface EvidenceUploaderProps {
  value?: string;
  onChange: (base64: string | undefined) => void;
}

const ALLOWED = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024;

export default function EvidenceUploader({ value, onChange }: EvidenceUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File | null) => {
    if (!file) return;
    setError(null);
    if (!ALLOWED.includes(file.type)) {
      setError('Solo se permiten imágenes PNG, JPEG o WEBP.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('El archivo no debe superar 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      onChange(result);
    };
    reader.onerror = () => setError('No se pudo leer el archivo.');
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Evidencia (foto)</label>
      {value ? (
        <div className="space-y-2">
          <img src={value} alt="Evidencia" className="w-full max-h-48 object-contain rounded-xl border border-gray-200" />
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="text-xs text-rose-600 font-medium"
          >
            Quitar imagen
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-[#4B79A1] transition"
        >
          <p className="text-sm text-gray-500">Haz clic para seleccionar una imagen</p>
          <p className="text-xs text-gray-400 mt-1">PNG, JPEG o WEBP · máx. 2 MB</p>
        </div>
      )}
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] || null)}
      />
    </div>
  );
}
