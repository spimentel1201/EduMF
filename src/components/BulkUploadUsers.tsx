import { useState } from 'react';
import { userService } from '../services/userService';
import { toast } from 'react-toastify';

export default function BulkUploadUsers() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Por favor, selecciona un archivo para subir.');
      return;
    }

    setIsUploading(true);
    try {
      const response = await userService.bulkRegisterUsers(selectedFile);
      toast.success(response.msg || 'Usuarios subidos masivamente con éxito.');
      setSelectedFile(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al subir usuarios masivamente.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = 'firstName,lastName,dni,gender,birthdate,email,password';
    const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'user_template.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="p-6 bg-white shadow-md rounded-lg">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Subida Masiva de Usuarios</h2>
      <p className="text-gray-600 mb-4">
        Sube un archivo CSV o Excel para registrar múltiples usuarios a la vez.
      </p>
      <div className="flex flex-col space-y-4">
        <div className="flex items-center space-x-4">
          <input
            type="file"
            accept=".csv, .xlsx, .xls"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-primary-50 file:text-primary-700
              hover:file:bg-primary-100"
          />
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Subiendo...' : 'Subir Archivo'}
          </button>
        </div>
        {selectedFile && (
          <p className="mt-2 text-sm text-gray-500">Archivo seleccionado: {selectedFile.name}</p>
        )}
        <button
          onClick={handleDownloadTemplate}
          className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Descargar Plantilla CSV
        </button>
      </div>
    </div>
  );
}