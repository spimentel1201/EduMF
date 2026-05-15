import { useState } from 'react';
import { userService } from '../services/userService';
import { CloudArrowUpIcon, DocumentArrowDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function BulkUploadUsers() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] ?? null);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Selecciona un archivo primero.');
      return;
    }
    setIsUploading(true);
    try {
      const response = await userService.bulkRegisterUsers(selectedFile);
      toast.success(response.msg || 'Usuarios cargados correctamente.');
      setSelectedFile(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al cargar usuarios.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = 'firstName,lastName,dni,gender,birthdate,email,password';
    const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = 'plantilla_usuarios.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">
        Sube un archivo <strong>CSV o Excel</strong> con los datos de los usuarios. Descarga la plantilla para ver el formato requerido.
      </p>

      {/* File drop zone */}
      <label className="flex flex-col items-center justify-center gap-3 w-full h-36 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition-colors">
        <CloudArrowUpIcon className="w-8 h-8 text-gray-300" />
        <span className="text-sm text-gray-500">
          {selectedFile ? (
            <span className="font-semibold text-green-700">{selectedFile.name}</span>
          ) : (
            <>Haz clic o arrastra un archivo <span className="font-semibold">.csv / .xlsx</span></>
          )}
        </span>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>

      {/* Selected file pill */}
      {selectedFile && (
        <div className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
          <span className="truncate">{selectedFile.name}</span>
          <button onClick={() => setSelectedFile(null)} className="ml-2 flex-shrink-0">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-40"
          style={{ background: '#538f65' }}
        >
          <CloudArrowUpIcon className="w-4 h-4" />
          {isUploading ? 'Subiendo...' : 'Subir Archivo'}
        </button>
        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm transition-colors"
        >
          <DocumentArrowDownIcon className="w-4 h-4" />
          Descargar Plantilla
        </button>
      </div>
    </div>
  );
}
